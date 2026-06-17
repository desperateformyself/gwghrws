import { db } from '../db.js';
import * as schema from '../schema.js';
import { eq, and } from 'drizzle-orm';
import { EmbedBuilder } from 'discord.js';

export async function unlockAchievement(client, userId, guildId, achievementKey, channel) {
  try {
    // Check if already unlocked
    const existing = await db.select()
      .from(schema.achievements)
      .where(and(
        eq(schema.achievements.userId, userId),
        eq(schema.achievements.guildId, guildId),
        eq(schema.achievements.achievementKey, achievementKey)
      ));

    if (existing.length > 0) return;

    // Insert into database
    await db.insert(schema.achievements).values({
      userId,
      guildId,
      achievementKey
    });

    // Describe the achievements
    const achievementDetails = {
      first_message: { name: '✨ First Steps', desc: 'Sent your very first message in the server!' },
      level_10: { name: '🎖️ Decathlete', desc: 'Reached Level 10!' },
      level_25: { name: '🏆 Veteran', desc: 'Reached Level 25!' },
      daily_streak_3: { name: '🔥 Dedicated', desc: 'Claimed your daily reward!' },
      economy_10k: { name: '💰 Mini-Mogul', desc: 'Accumulated 10,000 coins!' },
      voice_join: { name: '🎙️ Socialite', desc: 'Joined a voice channel!' },
      commands_50: { name: '🤖 Bot Whisperer', desc: 'Used 50 commands!' }
    };

    const badge = achievementDetails[achievementKey] || { name: '🏆 Achievement Unlocked', desc: `Unlocked: ${achievementKey}` };

    // Send unlocked message
    if (channel) {
      const embed = new EmbedBuilder()
        .setColor('#ff9ecf')
        .setTitle('🏆 Achievement Unlocked!')
        .setDescription(
`╭─────────────୨୧
> **User:** <@${userId}>
> **Achievement:** **${badge.name}**
> **Description:** ${badge.desc}
╰─────────────୨୧`
        )
        .setTimestamp()
        .setFooter({ text: client.user.username, iconURL: client.user.displayAvatarURL() });
      
      await channel.send({ embeds: [embed] });
    }
  } catch (error) {
    console.error('Error unlocking achievement:', error);
  }
}
