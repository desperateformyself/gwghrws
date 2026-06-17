import {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits
} from 'discord.js';
import { db } from '../db.js';
import * as schema from '../schema.js';
import { eq, and, desc } from 'drizzle-orm';
import { getXpNeeded } from '../systems/levelSystem.js';

// Helper to construct a beautiful progress bar
function makeProgressBar(current, max) {
  const percent = Math.min(100, Math.floor((current / max) * 100));
  const totalBars = 10;
  const filledBars = Math.floor(percent / 10);
  const emptyBars = totalBars - filledBars;
  return `\`[${'▰'.repeat(filledBars)}${'▱'.repeat(emptyBars)}]\` **${percent}%**`;
}

// ── 1. RANK COMMAND ──────────────────────────────────────────────────────────
export const rankCommand = {
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription("Displays a user's level rank and progress.")
    .addUserOption(option => option.setName('user').setDescription('Target user').setRequired(false)),

  async executeSlash(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;

    const xpRecord = await db.select()
      .from(schema.userXp)
      .where(and(eq(schema.userXp.userId, user.id), eq(schema.userXp.guildId, interaction.guild.id)))
      .then(res => res[0]) || { xp: 0, level: 0 };

    const profileRecord = await db.select()
      .from(schema.userProfiles)
      .where(and(eq(schema.userProfiles.userId, user.id), eq(schema.userProfiles.guildId, interaction.guild.id)))
      .then(res => res[0]) || { favoriteColor: '#ff9ecf' };

    const xpNeeded = getXpNeeded(xpRecord.level);
    const progress = makeProgressBar(xpRecord.xp, xpNeeded);

    const embed = new EmbedBuilder()
      .setColor(profileRecord.favoriteColor)
      .setTitle(`⭐ Level Rank: ${user.username}`)
      .setThumbnail(user.displayAvatarURL())
      .setDescription(
`╭─────────────୨୧
> **Level:** \`${xpRecord.level}\`
> **Progress:** ${xpRecord.xp} / ${xpNeeded} XP
> ${progress}
╰─────────────୨୧`
      )
      .setTimestamp()
      .setFooter({ text: interaction.client.user.username, iconURL: interaction.client.user.displayAvatarURL() });

    await interaction.reply({ embeds: [embed] });
  },

  async executePrefix(message, args) {
    const user = message.mentions.users.first() || message.author;

    const xpRecord = await db.select()
      .from(schema.userXp)
      .where(and(eq(schema.userXp.userId, user.id), eq(schema.userXp.guildId, message.guild.id)))
      .then(res => res[0]) || { xp: 0, level: 0 };

    const profileRecord = await db.select()
      .from(schema.userProfiles)
      .where(and(eq(schema.userProfiles.userId, user.id), eq(schema.userProfiles.guildId, message.guild.id)))
      .then(res => res[0]) || { favoriteColor: '#ff9ecf' };

    const xpNeeded = getXpNeeded(xpRecord.level);
    const progress = makeProgressBar(xpRecord.xp, xpNeeded);

    const embed = new EmbedBuilder()
      .setColor(profileRecord.favoriteColor)
      .setTitle(`⭐ Level Rank: ${user.username}`)
      .setThumbnail(user.displayAvatarURL())
      .setDescription(
`╭─────────────୨୧
> **Level:** \`${xpRecord.level}\`
> **Progress:** ${xpRecord.xp} / ${xpNeeded} XP
> ${progress}
╰─────────────୨୧`
      )
      .setTimestamp()
      .setFooter({ text: message.client.user.username, iconURL: message.client.user.displayAvatarURL() });

    await message.reply({ embeds: [embed] });
  }
};

// ── 2. LEADERBOARD COMMAND ───────────────────────────────────────────────────
export const leaderboardCommand = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Displays the top users by level/XP in this server.'),

  async executeSlash(interaction) {
    const topUsers = await db.select()
      .from(schema.userXp)
      .where(eq(schema.userXp.guildId, interaction.guild.id))
      .orderBy(desc(schema.userXp.level), desc(schema.userXp.xp))
      .limit(10);

    const embed = new EmbedBuilder()
      .setColor('#ff9ecf')
      .setTitle(`🏆 Server Level Leaderboard`)
      .setTimestamp()
      .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() });

    if (topUsers.length === 0) {
      embed.setDescription('╭─────────────୨୧\n> ❌ No leveling data recorded yet.\n╰─────────────୨୧');
    } else {
      let descStr = `╭─────────────୨୧\n`;
      const medals = ['🥇', '🥈', '🥉'];
      
      for (let i = 0; i < topUsers.length; i++) {
        const entry = topUsers[i];
        const icon = medals[i] || '👤';
        descStr += `> ${icon} **#${i + 1}** <@${entry.userId}> • **Level ${entry.level}** (${entry.xp} XP)\n`;
      }
      descStr += `╰─────────────୨୧`;
      embed.setDescription(descStr);
    }

    await interaction.reply({ embeds: [embed] });
  },

  async executePrefix(message) {
    const topUsers = await db.select()
      .from(schema.userXp)
      .where(eq(schema.userXp.guildId, message.guild.id))
      .orderBy(desc(schema.userXp.level), desc(schema.userXp.xp))
      .limit(10);

    const embed = new EmbedBuilder()
      .setColor('#ff9ecf')
      .setTitle(`🏆 Server Level Leaderboard`)
      .setTimestamp()
      .setFooter({ text: message.guild.name, iconURL: message.guild.iconURL() });

    if (topUsers.length === 0) {
      embed.setDescription('╭─────────────୨୧\n> ❌ No leveling data recorded yet.\n╰─────────────୨୧');
    } else {
      let descStr = `╭─────────────୨୧\n`;
      const medals = ['🥇', '🥈', '🥉'];
      
      for (let i = 0; i < topUsers.length; i++) {
        const entry = topUsers[i];
        const icon = medals[i] || '👤';
        descStr += `> ${icon} **#${i + 1}** <@${entry.userId}> • **Level ${entry.level}** (${entry.xp} XP)\n`;
      }
      descStr += `╰─────────────୨୧`;
      embed.setDescription(descStr);
    }

    await message.reply({ embeds: [embed] });
  }
};

// ── 3. LEVELROLES COMMAND ────────────────────────────────────────────────────
export const levelrolesCommand = {
  data: new SlashCommandBuilder()
    .setName('levelroles')
    .setDescription('View or configure roles awarded at specific levels.')
    .addSubcommand(sub =>
      sub.setName('list').setDescription('List all configured level roles.')
    )
    .addSubcommand(sub =>
      sub.setName('add')
        .setDescription('Add a role reward.')
        .addIntegerOption(opt => opt.setName('level').setDescription('Target level').setRequired(true))
        .addRoleOption(opt => opt.setName('role').setDescription('Role to award').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('remove')
        .setDescription('Remove a role reward.')
        .addIntegerOption(opt => opt.setName('level').setDescription('Target level').setRequired(true))
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

  async executeSlash(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'list') {
      const rewards = await db.select()
        .from(schema.levelRewards)
        .where(eq(schema.levelRewards.guildId, interaction.guild.id));

      const embed = new EmbedBuilder()
        .setColor('#ff9ecf')
        .setTitle('🎁 Level Role Rewards')
        .setTimestamp()
        .setFooter({ text: interaction.client.user.username, iconURL: interaction.client.user.displayAvatarURL() });

      if (rewards.length === 0) {
        embed.setDescription('╭─────────────୨୧\n> ❌ No level role rewards configured.\n╰─────────────୨୧');
      } else {
        const listStr = rewards.map(r => `> ⭐ **Level ${r.level}:** <@&${r.roleId}>`).join('\n');
        embed.setDescription(`╭─────────────୨୧\n${listStr}\n╰─────────────୨୧`);
      }
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'add') {
      const level = interaction.options.getInteger('level');
      const role = interaction.options.getRole('role');

      // Check if already exists
      const existing = await db.select()
        .from(schema.levelRewards)
        .where(and(eq(schema.levelRewards.guildId, interaction.guild.id), eq(schema.levelRewards.level, level)))
        .then(res => res[0]);

      if (existing) {
        await db.update(schema.levelRewards)
          .set({ roleId: role.id })
          .where(eq(schema.levelRewards.id, existing.id));
      } else {
        await db.insert(schema.levelRewards).values({
          guildId: interaction.guild.id,
          level,
          roleId: role.id
        });
      }

      const embed = new EmbedBuilder()
        .setColor('#ff9ecf')
        .setDescription(`╭─────────────୨୧\n> ✅ Level **${level}** will now award the role **${role}**!\n╰─────────────୨୧`);
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'remove') {
      const level = interaction.options.getInteger('level');

      await db.delete(schema.levelRewards)
        .where(and(eq(schema.levelRewards.guildId, interaction.guild.id), eq(schema.levelRewards.level, level)));

      const embed = new EmbedBuilder()
        .setColor('#ff9ecf')
        .setDescription(`╭─────────────୨୧\n> ✅ Removed role reward for Level **${level}**.\n╰─────────────୨୧`);
      return interaction.reply({ embeds: [embed] });
    }
  },

  async executePrefix(message, args) {
    // Prefix execution defaults to list
    const rewards = await db.select()
      .from(schema.levelRewards)
      .where(eq(schema.levelRewards.guildId, message.guild.id));

    const embed = new EmbedBuilder()
      .setColor('#ff9ecf')
      .setTitle('🎁 Level Role Rewards')
      .setTimestamp()
      .setFooter({ text: message.client.user.username, iconURL: message.client.user.displayAvatarURL() });

    if (rewards.length === 0) {
      embed.setDescription('╭─────────────୨୧\n> ❌ No level role rewards configured.\n╰─────────────୨୧');
    } else {
      const listStr = rewards.map(r => `> ⭐ **Level ${r.level}:** <@&${r.roleId}>`).join('\n');
      embed.setDescription(`╭─────────────୨୧\n${listStr}\n╰─────────────୨୧`);
    }
    return message.reply({ embeds: [embed] });
  }
};

// ── 4. SETXP COMMAND ─────────────────────────────────────────────────────────
export const setxpCommand = {
  data: new SlashCommandBuilder()
    .setName('setxp')
    .setDescription("Sets a user's XP and Level.")
    .addUserOption(option => option.setName('user').setDescription('Target user').setRequired(true))
    .addIntegerOption(option => option.setName('level').setDescription('New Level').setRequired(true))
    .addIntegerOption(option => option.setName('xp').setDescription('New XP').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async executeSlash(interaction) {
    const user = interaction.options.getUser('user');
    const level = interaction.options.getInteger('level');
    const xp = interaction.options.getInteger('xp');

    const existing = await db.select()
      .from(schema.userXp)
      .where(and(eq(schema.userXp.userId, user.id), eq(schema.userXp.guildId, interaction.guild.id)))
      .then(res => res[0]);

    if (existing) {
      await db.update(schema.userXp)
        .set({ level, xp })
        .where(eq(schema.userXp.id, existing.id));
    } else {
      await db.insert(schema.userXp).values({
        userId: user.id,
        guildId: interaction.guild.id,
        level,
        xp
      });
    }

    const embed = new EmbedBuilder()
      .setColor('#ff9ecf')
      .setDescription(`╭─────────────୨୧\n> ✅ Updated **${user.username}** to **Level ${level}** with **${xp} XP**.\n╰─────────────୨୧`);
    await interaction.reply({ embeds: [embed] });
  },

  async executePrefix(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) return;
    const user = message.mentions.users.first();
    const level = parseInt(args[1]);
    const xp = parseInt(args[2]);

    if (!user || isNaN(level) || isNaN(xp)) {
      return message.reply('❌ Syntax: `,setxp @user [level] [xp]`');
    }

    const existing = await db.select()
      .from(schema.userXp)
      .where(and(eq(schema.userXp.userId, user.id), eq(schema.userXp.guildId, message.guild.id)))
      .then(res => res[0]);

    if (existing) {
      await db.update(schema.userXp)
        .set({ level, xp })
        .where(eq(schema.userXp.id, existing.id));
    } else {
      await db.insert(schema.userXp).values({
        userId: user.id,
        guildId: message.guild.id,
        level,
        xp
      });
    }

    await message.reply(`✅ Updated **${user.username}** to **Level ${level}** with **${xp} XP**.`);
  }
};

// ── 5. RESETXP COMMAND ───────────────────────────────────────────────────────
export const resetxpCommand = {
  data: new SlashCommandBuilder()
    .setName('resetxp')
    .setDescription("Resets a user's leveling stats.")
    .addUserOption(option => option.setName('user').setDescription('Target user').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async executeSlash(interaction) {
    const user = interaction.options.getUser('user');

    await db.delete(schema.userXp)
      .where(and(eq(schema.userXp.userId, user.id), eq(schema.userXp.guildId, interaction.guild.id)));

    const embed = new EmbedBuilder()
      .setColor('#ff9ecf')
      .setDescription(`╭─────────────୨୧\n> ✅ Resetted all leveling stats for **${user.username}**.\n╰─────────────୨୧`);
    await interaction.reply({ embeds: [embed] });
  },

  async executePrefix(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) return;
    const user = message.mentions.users.first();
    if (!user) return message.reply('❌ Please mention a user to reset.');

    await db.delete(schema.userXp)
      .where(and(eq(schema.userXp.userId, user.id), eq(schema.userXp.guildId, message.guild.id)));

    await message.reply(`✅ Resetted leveling stats for **${user.username}**.`);
  }
};

// ── 6. LEVELCARD COMMAND ─────────────────────────────────────────────────────
export const levelcardCommand = {
  data: new SlashCommandBuilder()
    .setName('levelcard')
    .setDescription("Customize your level rank card favorite color.")
    .addStringOption(option => option.setName('color').setDescription('Hex color code (e.g. #ff9ecf)').setRequired(true)),

  async executeSlash(interaction) {
    const color = interaction.options.getString('color');
    const hexRegex = /^#([0-9a-fA-F]{3}){1,2}$/;
    if (!hexRegex.test(color)) {
      return interaction.reply({ content: '❌ Invalid Hex color code. Example: `#ff9ecf`', ephemeral: true });
    }

    const existing = await db.select()
      .from(schema.userProfiles)
      .where(and(eq(schema.userProfiles.userId, interaction.user.id), eq(schema.userProfiles.guildId, interaction.guild.id)))
      .then(res => res[0]);

    if (existing) {
      await db.update(schema.userProfiles)
        .set({ favoriteColor: color })
        .where(eq(schema.userProfiles.id, existing.id));
    } else {
      await db.insert(schema.userProfiles).values({
        userId: interaction.user.id,
        guildId: interaction.guild.id,
        favoriteColor: color
      });
    }

    const embed = new EmbedBuilder()
      .setColor(color)
      .setDescription(`╭─────────────୨୧\n> ✅ Changed your card favorite color to **${color}**!\n╰─────────────୨୧`);
    await interaction.reply({ embeds: [embed] });
  },

  async executePrefix(message, args) {
    const color = args[0];
    if (!color) return message.reply('❌ Please supply a Hex color (e.g. `#ff9ecf`).');
    const hexRegex = /^#([0-9a-fA-F]{3}){1,2}$/;
    if (!hexRegex.test(color)) return message.reply('❌ Invalid Hex color.');

    const existing = await db.select()
      .from(schema.userProfiles)
      .where(and(eq(schema.userProfiles.userId, message.author.id), eq(schema.userProfiles.guildId, message.guild.id)))
      .then(res => res[0]);

    if (existing) {
      await db.update(schema.userProfiles)
        .set({ favoriteColor: color })
        .where(eq(schema.userProfiles.id, existing.id));
    } else {
      await db.insert(schema.userProfiles).values({
        userId: message.author.id,
        guildId: message.guild.id,
        favoriteColor: color
      });
    }

    await message.reply(`✅ Your level card color is now **${color}**.`);
  }
};
