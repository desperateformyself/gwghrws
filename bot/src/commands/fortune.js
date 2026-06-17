import {
  SlashCommandBuilder,
  EmbedBuilder
} from 'discord.js';
import { db } from '../db.js';
import * as schema from '../schema.js';
import { eq, and } from 'drizzle-orm';
import { getEconomy } from './economy.js';

const fortuneTexts = [
  'A beautiful surprise is waiting for you around the corner! 🌸',
  'Your smile will brighten someone\'s day today. Keep shining! ✨',
  'Today is a great day to start something new and exciting! 🚀',
  'Believe in yourself! You are capable of amazing things. 💖',
  'A kind word will open many doors for you today. 💌',
  'Patience is a virtue, and your rewards are coming soon! 🌟',
  'Adventure is calling. Will you answer it? 🗺️',
  'You will find success in a task you complete today. 🎯'
];

export const fortuneCommand = {
  data: new SlashCommandBuilder()
    .setName('fortune')
    .setDescription('Draw your daily fortune cookie, get your luck %, and claim daily coins.'),

  async executeSlash(interaction) {
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;

    // Get current date as YYYY-MM-DD
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // Check existing fortune
    let record = await db.select()
      .from(schema.userFortunes)
      .where(and(eq(schema.userFortunes.userId, userId), eq(schema.userFortunes.guildId, guildId)))
      .then(res => res[0]);

    let luckPercentage;
    let fortuneText;
    let newFortune = false;
    const rewardCoins = Math.floor(Math.random() * 101) + 50; // 50 to 150 coins

    if (record && record.lastFortune === todayStr) {
      // Already drew today
      luckPercentage = record.luckPercentage;
      fortuneText = record.fortuneText;
    } else {
      // New day, draw fortune
      luckPercentage = Math.floor(Math.random() * 101);
      fortuneText = fortuneTexts[Math.floor(Math.random() * fortuneTexts.length)];
      newFortune = true;

      if (record) {
        await db.update(schema.userFortunes)
          .set({
            lastFortune: todayStr,
            luckPercentage,
            fortuneText
          })
          .where(eq(schema.userFortunes.id, record.id));
      } else {
        await db.insert(schema.userFortunes).values({
          userId,
          guildId,
          lastFortune: todayStr,
          luckPercentage,
          fortuneText
        });
      }

      // Add coins
      const econ = await getEconomy(userId, guildId);
      await db.update(schema.userEconomy)
        .set({ balance: econ.balance + rewardCoins })
        .where(eq(schema.userEconomy.id, econ.id));
    }

    let progressStr = '';
    const filled = Math.floor(luckPercentage / 10);
    progressStr = `🔮 ${'▰'.repeat(filled)}${'▱'.repeat(10 - filled)}`;

    let titleText = newFortune ? '🥠 Fortune Cookie Opened!' : '🥠 Your Fortune Today';
    let rewardLine = newFortune ? `> 💰 Daily Luck Reward: **+${rewardCoins} coins**\n` : '';

    const embed = new EmbedBuilder()
      .setColor('#ff9ecf')
      .setTitle(titleText)
      .setDescription(
`╭───────────── Clarification ─────────────
> **Luck Percentage:** **${luckPercentage}%**
> ${progressStr}
> 
> 🥠 **Your Fortune:**
> *"${fortuneText}"*
> 
${rewardLine}╰─────────────────────────────────────────`
      )
      .setTimestamp()
      .setFooter({ text: interaction.client.user.username, iconURL: interaction.client.user.displayAvatarURL() });

    await interaction.reply({ embeds: [embed] });
  },

  async executePrefix(message) {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    let record = await db.select()
      .from(schema.userFortunes)
      .where(and(eq(schema.userFortunes.userId, message.author.id), eq(schema.userFortunes.guildId, message.guild.id)))
      .then(res => res[0]);

    if (record && record.lastFortune === todayStr) {
      return message.reply(`🥠 **Fortune**: Luck: **${record.luckPercentage}%** • *"${record.fortuneText}"*`);
    } else {
      const luck = Math.floor(Math.random() * 101);
      const text = fortuneTexts[Math.floor(Math.random() * fortuneTexts.length)];
      
      if (record) {
        await db.update(schema.userFortunes).set({ lastFortune: todayStr, luckPercentage: luck, fortuneText: text }).where(eq(schema.userFortunes.id, record.id));
      } else {
        await db.insert(schema.userFortunes).values({ userId: message.author.id, guildId: message.guild.id, lastFortune: todayStr, luckPercentage: luck, fortuneText: text });
      }

      const reward = Math.floor(Math.random() * 101) + 50;
      const econ = await getEconomy(message.author.id, message.guild.id);
      await db.update(schema.userEconomy).set({ balance: econ.balance + reward }).where(eq(schema.userEconomy.id, econ.id));

      return message.reply(`🥠 **Fortune**: Luck: **${luck}%** • *"${text}"* (+${reward} daily coins added!)`);
    }
  }
};
