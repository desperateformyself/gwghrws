import { db } from '../db.js';
import * as schema from '../schema.js';
import { eq, and } from 'drizzle-orm';
import { EmbedBuilder } from 'discord.js';
import { unlockAchievement } from './achievements.js';

export function getXpNeeded(level) {
  return (level + 1) * 100;
}

export async function handleMessageXp(message) {
  if (message.author.bot || !message.guild) return;

  const userId = message.author.id;
  const guildId = message.guild.id;
  const now = new Date();

  try {
    // 1. Fetch user XP data
    let userRecord = await db.select()
      .from(schema.userXp)
      .where(and(eq(schema.userXp.userId, userId), eq(schema.userXp.guildId, guildId)))
      .then(res => res[0]);

    if (!userRecord) {
      // First time messaging
      await db.insert(schema.userXp).values({
        userId,
        guildId,
        xp: 0,
        level: 0,
        lastMessageAt: now.toISOString()
      });
      userRecord = { userId, guildId, xp: 0, level: 0, lastMessageAt: now.toISOString() };
      
      // Unlock first message achievement
      await unlockAchievement(message.client, userId, guildId, 'first_message', message.channel);
    }

    // 2. Cooldown check (60 seconds)
    const lastMessageDate = userRecord.lastMessageAt ? new Date(userRecord.lastMessageAt) : null;
    if (lastMessageDate && (now - lastMessageDate < 60000)) {
      return; // Under cooldown
    }

    // 3. Award random XP (15 - 25)
    const xpToAdd = Math.floor(Math.random() * 11) + 15;
    let newXp = userRecord.xp + xpToAdd;
    let newLevel = userRecord.level;
    let leveledUp = false;

    // Check level up
    while (newXp >= getXpNeeded(newLevel)) {
      newXp -= getXpNeeded(newLevel);
      newLevel++;
      leveledUp = true;
    }

    // 4. Save to database
    await db.update(schema.userXp)
      .set({
        xp: newXp,
        level: newLevel,
        lastMessageAt: now.toISOString()
      })
      .where(and(eq(schema.userXp.userId, userId), eq(schema.userXp.guildId, guildId)));

    // 5. Unlock achievements if milestone reached
    if (newLevel >= 10) {
      await unlockAchievement(message.client, userId, guildId, 'level_10', message.channel);
    }
    if (newLevel >= 25) {
      await unlockAchievement(message.client, userId, guildId, 'level_25', message.channel);
    }

    // 6. Level up actions
    if (leveledUp) {
      const embed = new EmbedBuilder()
        .setColor('#ff9ecf')
        .setTitle('🎉 Level Up!')
        .setDescription(
`╭─────────────୨୧
> ✨ Congratulations <@${userId}>!
> 🌸 You have advanced to **Level ${newLevel}**!
> ⭐ Keep chatting to earn more XP!
╰─────────────୨୧`
        )
        .setTimestamp()
        .setFooter({ text: message.client.user.username, iconURL: message.client.user.displayAvatarURL() });

      await message.channel.send({ embeds: [embed] });

      // Handle level rewards role assignment
      const rewardRoles = await db.select()
        .from(schema.levelRewards)
        .where(and(eq(schema.levelRewards.guildId, guildId), eq(schema.levelRewards.level, newLevel)));

      for (const reward of rewardRoles) {
        const role = message.guild.roles.cache.get(reward.roleId);
        if (role && message.member) {
          try {
            await message.member.roles.add(role);
            const roleEmbed = new EmbedBuilder()
              .setColor('#ff9ecf')
              .setDescription(`🎁 You've unlocked the role **${role.name}** for reaching Level ${newLevel}!`)
              .setFooter({ text: message.client.user.username, iconURL: message.client.user.displayAvatarURL() });
            await message.channel.send({ embeds: [roleEmbed] });
          } catch (err) {
            console.error(`Failed to assign role ${reward.roleId} to user ${userId}:`, err);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error handling message XP:', error);
  }
}
