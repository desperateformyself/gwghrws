import {
  SlashCommandBuilder,
  EmbedBuilder
} from 'discord.js';
import { db } from '../db.js';
import * as schema from '../schema.js';
import { eq, and } from 'drizzle-orm';

const allAchievementsList = [
  { key: 'first_message', name: '✨ First Steps', desc: 'Sent your first chat message in the server.' },
  { key: 'level_10', name: '🎖️ Decathlete', desc: 'Reaching Level 10.' },
  { key: 'level_25', name: '🏆 Veteran', desc: 'Reaching Level 25.' },
  { key: 'daily_streak_3', name: '🔥 Dedicated', desc: 'Claiming your daily reward.' },
  { key: 'economy_10k', name: '💰 Mini-Mogul', desc: 'Accumulate 10,000 net coins.' },
  { key: 'voice_join', name: '🎙️ Socialite', desc: 'Join a voice channel.' }
];

export const achievementsCommand = {
  data: new SlashCommandBuilder()
    .setName('achievements')
    .setDescription("View your completed server achievements & milestones.")
    .addUserOption(option => option.setName('user').setDescription('Target user').setRequired(false)),

  async executeSlash(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;
    const guildId = interaction.guild.id;

    // Fetch user achievements
    const unlocked = await db.select()
      .from(schema.achievements)
      .where(and(eq(schema.achievements.userId, user.id), eq(schema.achievements.guildId, guildId)));

    const unlockedKeys = new Map(unlocked.map(u => [u.achievementKey, u.unlockedAt]));

    const embed = new EmbedBuilder()
      .setColor('#ff9ecf')
      .setTitle(`🏆 Server Achievements: ${user.username}`)
      .setTimestamp()
      .setFooter({ text: interaction.client.user.username, iconURL: interaction.client.user.displayAvatarURL() });

    let descStr = `╭─────────────୨୧\n> **Unlocked:** ${unlocked.length} / ${allAchievementsList.length}\n╰─────────────୨୧\n\n`;

    for (const ach of allAchievementsList) {
      if (unlockedKeys.has(ach.key)) {
        const unlockedAtStr = unlockedKeys.get(ach.key);
        const unixTime = Math.floor(new Date(unlockedAtStr).getTime() / 1000);
        descStr += `✅ **${ach.name}**\n└ *${ach.desc}* • Unlocked <t:${unixTime}:R>\n\n`;
      } else {
        descStr += `🔒 **${ach.name}**\n└ *${ach.desc}* • *Locked*\n\n`;
      }
    }

    embed.setDescription(descStr);
    await interaction.reply({ embeds: [embed] });
  },

  async executePrefix(message, args) {
    const user = message.mentions.users.first() || message.author;
    const guildId = message.guild.id;

    const unlocked = await db.select()
      .from(schema.achievements)
      .where(and(eq(schema.achievements.userId, user.id), eq(schema.achievements.guildId, guildId)));

    const unlockedKeys = new Set(unlocked.map(u => u.achievementKey));

    let replyMsg = `🏆 **Achievements for ${user.username}** [${unlocked.length}/${allAchievementsList.length}]:\n`;
    for (const ach of allAchievementsList) {
      const icon = unlockedKeys.has(ach.key) ? '✅' : '🔒';
      replyMsg += `${icon} **${ach.name}** - *${ach.desc}*\n`;
    }

    await message.reply(replyMsg);
  }
};
