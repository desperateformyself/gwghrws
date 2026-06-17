import {
  SlashCommandBuilder,
  EmbedBuilder
} from 'discord.js';
import { db } from '../db.js';
import * as schema from '../schema.js';
import { eq, and } from 'drizzle-orm';
import { getEconomy } from './economy.js';

// Helper to fetch or create focus session record
async function getFocusSession(userId, guildId) {
  let record = await db.select()
    .from(schema.focusSessions)
    .where(and(eq(schema.focusSessions.userId, userId), eq(schema.focusSessions.guildId, guildId)))
    .then(res => res[0]);

  if (!record) {
    await db.insert(schema.focusSessions).values({
      userId,
      guildId,
      startTime: null,
      totalFocusTime: 0
    });
    record = { userId, guildId, startTime: null, totalFocusTime: 0 };
  }
  return record;
}

export const focusCommand = {
  data: new SlashCommandBuilder()
    .setName('focus')
    .setDescription('Study timer and productivity tracking.')
    .addSubcommand(sub => sub.setName('start').setDescription('Start a focus session.'))
    .addSubcommand(sub => sub.setName('stop').setDescription('End your active focus session and collect coin rewards.'))
    .addSubcommand(sub => sub.setName('stats').setDescription('View your total focus statistics.')),

  async executeSlash(interaction) {
    const sub = interaction.options.getSubcommand();
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;

    const session = await getFocusSession(userId, guildId);

    if (sub === 'start') {
      if (session.startTime) {
        const startUnix = Math.floor(new Date(session.startTime).getTime() / 1000);
        return interaction.reply({ content: `❌ You already have an active focus session that started <t:${startUnix}:R>!`, ephemeral: true });
      }

      await db.update(schema.focusSessions)
        .set({ startTime: new Date().toISOString() })
        .where(eq(schema.focusSessions.id, session.id));

      const embed = new EmbedBuilder()
        .setColor('#ff9ecf')
        .setTitle('📚 Focus Session Started')
        .setDescription(
`╭─────────────୨୧
> 🌸 Time to study and stay productive!
> ⏱️ Your timer has started.
> 💬 Use \`/focus stop\` when you are finished!
╰─────────────୨୧`
        )
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'stop') {
      if (!session.startTime) {
        return interaction.reply({ content: '❌ You do not have an active focus session! Use `/focus start` to begin.', ephemeral: true });
      }

      const now = new Date();
      const start = new Date(session.startTime);
      const elapsedMs = now - start;
      const elapsedSeconds = Math.floor(elapsedMs / 1000);

      if (elapsedSeconds < 10) {
        // Reset timer but no reward
        await db.update(schema.focusSessions)
          .set({ startTime: null })
          .where(eq(schema.focusSessions.id, session.id));
        return interaction.reply({ content: '❌ Session was too short (under 10 seconds). No rewards given, but your focus timer was reset!', ephemeral: true });
      }

      const elapsedMinutes = elapsedSeconds / 60;
      const rewardCoins = Math.min(500, Math.floor(elapsedSeconds * 0.1)); // 6 coins/minute, max 500
      const addedMinutes = Math.floor(elapsedMinutes);

      // Save focus stats
      await db.update(schema.focusSessions)
        .set({
          startTime: null,
          totalFocusTime: session.totalFocusTime + addedMinutes
        })
        .where(eq(schema.focusSessions.id, session.id));

      // Credit coins
      const econ = await getEconomy(userId, guildId);
      await db.update(schema.userEconomy)
        .set({ balance: econ.balance + rewardCoins })
        .where(eq(schema.userEconomy.id, econ.id));

      const minDisplay = Math.floor(elapsedSeconds / 60);
      const secDisplay = elapsedSeconds % 60;

      const embed = new EmbedBuilder()
        .setColor('#ff9ecf')
        .setTitle('🏁 Focus Session Complete')
        .setDescription(
`╭─────────────୨୧
> 🌸 **Great job staying focused!**
> ⏱️ Duration: **${minDisplay}m ${secDisplay}s**
> 💰 Reward Earned: **+${rewardCoins} coins**
> 💳 Wallet Balance: **${econ.balance + rewardCoins} coins**
╰─────────────୨୧`
        )
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'stats') {
      const hours = Math.floor(session.totalFocusTime / 60);
      const minutes = session.totalFocusTime % 60;

      const embed = new EmbedBuilder()
        .setColor('#ff9ecf')
        .setTitle(`📊 Focus Stats: ${interaction.user.username}`)
        .setDescription(
`╭─────────────୨୧
> 📚 Total Study Time: **${hours}h ${minutes}m**
> 🌸 Keep up the amazing work!
╰─────────────୨୧`
        )
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }
  },

  async executePrefix(message) {
    const session = await getFocusSession(message.author.id, message.guild.id);
    const hours = Math.floor(session.totalFocusTime / 60);
    const minutes = session.totalFocusTime % 60;
    return message.reply(`📚 **Focus Stats**: Total focus time: **${hours}h ${minutes}m**.`);
  }
};
