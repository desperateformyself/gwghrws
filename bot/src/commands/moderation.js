import {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits
} from 'discord.js';
import { db } from '../db.js';
import * as schema from '../schema.js';
import { eq, and, desc } from 'drizzle-orm';

// Helper to log actions to DB audit log
async function logModAction(guildId, action, targetId, moderatorId, reason = null) {
  try {
    await db.insert(schema.auditLog).values({
      guildId,
      action,
      targetId,
      moderatorId,
      reason
    });
  } catch (error) {
    console.error('Failed to log mod action:', error);
  }
}

// ── 1. WARN COMMAND ──────────────────────────────────────────────────────────
export const warnCommand = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warn a user in the server.')
    .addUserOption(option => option.setName('user').setDescription('The user to warn').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('The reason for the warning').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async executeSlash(interaction) {
    const targetUser = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    
    await db.insert(schema.warnings).values({
      userId: targetUser.id,
      guildId: interaction.guild.id,
      reason: reason,
      moderatorId: interaction.user.id,
    });

    await logModAction(interaction.guild.id, 'WARN', targetUser.id, interaction.user.id, reason);

    const embed = new EmbedBuilder()
      .setColor('#ff9ecf')
      .setTitle('⚠️ User Warned')
      .setDescription(
`╭─────────────👑
> ✅ **${targetUser.tag}** has been warned.
> 📝 **Reason:** ${reason}
╰─────────────👑`
      )
      .setTimestamp()
      .setFooter({ text: interaction.client.user.username, iconURL: interaction.client.user.displayAvatarURL() });

    await interaction.reply({ embeds: [embed] });
  },

  async executePrefix(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) return;
    const targetUser = message.mentions.users.first();
    if (!targetUser) return message.reply('❌ Please mention a user to warn.');

    const reason = args.slice(1).join(' ') || 'No reason provided';

    await db.insert(schema.warnings).values({
      userId: targetUser.id,
      guildId: message.guild.id,
      reason: reason,
      moderatorId: message.author.id,
    });

    await logModAction(message.guild.id, 'WARN', targetUser.id, message.author.id, reason);

    const embed = new EmbedBuilder()
      .setColor('#ff9ecf')
      .setTitle('⚠️ User Warned')
      .setDescription(
`╭─────────────👑
> ✅ **${targetUser.tag}** has been warned.
> 📝 **Reason:** ${reason}
╰─────────────👑`
      )
      .setTimestamp()
      .setFooter({ text: message.client.user.username, iconURL: message.client.user.displayAvatarURL() });

    await message.reply({ embeds: [embed] });
  }
};

// ── 2. WARNINGS COMMAND ──────────────────────────────────────────────────────
export const warningsCommand = {
  data: new SlashCommandBuilder()
    .setName('warnings')
    .setDescription("Check a user's warning list.")
    .addUserOption(option => option.setName('user').setDescription('The user to check').setRequired(true)),

  async executeSlash(interaction) {
    const targetUser = interaction.options.getUser('user');
    
    const userWarns = await db.select()
      .from(schema.warnings)
      .where(and(eq(schema.warnings.userId, targetUser.id), eq(schema.warnings.guildId, interaction.guild.id)));

    const embed = new EmbedBuilder()
      .setColor('#ff9ecf')
      .setTitle(`⚠️ Warnings: ${targetUser.username}`)
      .setDescription(
`╭─────────────👑
> **Total Warnings:** ${userWarns.length}
╰─────────────👑`
      )
      .setTimestamp()
      .setFooter({ text: interaction.client.user.username, iconURL: interaction.client.user.displayAvatarURL() });

    if (userWarns.length > 0) {
      embed.addFields(userWarns.map((w, index) => ({
        name: `Warning #${w.id}`,
        value: `**Reason:** ${w.reason}\n**Moderator:** <@${w.moderatorId}>\n**Date:** <t:${Math.floor(new Date(w.createdAt).getTime() / 1000)}:R>`,
        inline: false
      })));
    }

    await interaction.reply({ embeds: [embed] });
  },

  async executePrefix(message, args) {
    const targetUser = message.mentions.users.first() || message.author;
    
    const userWarns = await db.select()
      .from(schema.warnings)
      .where(and(eq(schema.warnings.userId, targetUser.id), eq(schema.warnings.guildId, message.guild.id)));

    const embed = new EmbedBuilder()
      .setColor('#ff9ecf')
      .setTitle(`⚠️ Warnings: ${targetUser.username}`)
      .setDescription(
`╭─────────────👑
> **Total Warnings:** ${userWarns.length}
╰─────────────👑`
      )
      .setTimestamp()
      .setFooter({ text: message.client.user.username, iconURL: message.client.user.displayAvatarURL() });

    if (userWarns.length > 0) {
      embed.addFields(userWarns.map((w, index) => ({
        name: `Warning #${w.id}`,
        value: `**Reason:** ${w.reason}\n**Moderator:** <@${w.moderatorId}>\n**Date:** <t:${Math.floor(new Date(w.createdAt).getTime() / 1000)}:R>`,
        inline: false
      })));
    }

    await message.reply({ embeds: [embed] });
  }
};

// ── 3. UNWARN COMMAND ────────────────────────────────────────────────────────
export const unwarnCommand = {
  data: new SlashCommandBuilder()
    .setName('unwarn')
    .setDescription('Remove a warning from a user.')
    .addUserOption(option => option.setName('user').setDescription('The user to unwarn').setRequired(false))
    .addIntegerOption(option => option.setName('id').setDescription('The specific warning ID to remove').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async executeSlash(interaction) {
    const targetUser = interaction.options.getUser('user');
    const warnId = interaction.options.getInteger('id');

    if (!targetUser && !warnId) {
      return interaction.reply({ content: '❌ Please specify either a user or a specific Warning ID.', ephemeral: true });
    }

    let description = '';

    if (warnId) {
      const existing = await db.select().from(schema.warnings).where(eq(schema.warnings.id, warnId)).then(r => r[0]);
      if (!existing || existing.guildId !== interaction.guild.id) {
        return interaction.reply({ content: '❌ Warning not found in this server.', ephemeral: true });
      }

      await db.delete(schema.warnings).where(eq(schema.warnings.id, warnId));
      await logModAction(interaction.guild.id, 'UNWARN', existing.userId, interaction.user.id, `Removed warning #${warnId}`);
      description = `✅ Warning **#${warnId}** has been removed.`;
    } else {
      const userWarns = await db.select()
        .from(schema.warnings)
        .where(and(eq(schema.warnings.userId, targetUser.id), eq(schema.warnings.guildId, interaction.guild.id)))
        .orderBy(desc(schema.warnings.id));

      if (userWarns.length === 0) {
        return interaction.reply({ content: `❌ **${targetUser.tag}** has no active warnings.`, ephemeral: true });
      }

      const latest = userWarns[0];
      await db.delete(schema.warnings).where(eq(schema.warnings.id, latest.id));
      await logModAction(interaction.guild.id, 'UNWARN', targetUser.id, interaction.user.id, `Removed latest warning (#${latest.id})`);
      description = `✅ Removed the latest warning (**#${latest.id}**) from **${targetUser.tag}**.`;
    }

    const embed = new EmbedBuilder()
      .setColor('#ff9ecf')
      .setTitle('🛡️ Warning Removed')
      .setDescription(
`╭─────────────👑
> ${description}
╰─────────────👑`
      )
      .setTimestamp()
      .setFooter({ text: interaction.client.user.username, iconURL: interaction.client.user.displayAvatarURL() });

    await interaction.reply({ embeds: [embed] });
  },

  async executePrefix(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) return;
    const targetUser = message.mentions.users.first();
    const idVal = parseInt(args[0]);

    if (!targetUser && isNaN(idVal)) {
      return message.reply('❌ Syntax: `,unwarn @user` or `,unwarn [Warning_ID]`');
    }

    let description = '';

    if (!isNaN(idVal)) {
      const existing = await db.select().from(schema.warnings).where(eq(schema.warnings.id, idVal)).then(r => r[0]);
      if (!existing || existing.guildId !== message.guild.id) {
        return message.reply('❌ Warning not found.');
      }

      await db.delete(schema.warnings).where(eq(schema.warnings.id, idVal));
      await logModAction(message.guild.id, 'UNWARN', existing.userId, message.author.id, `Removed warning #${idVal}`);
      description = `✅ Warning **#${idVal}** has been removed.`;
    } else {
      const userWarns = await db.select()
        .from(schema.warnings)
        .where(and(eq(schema.warnings.userId, targetUser.id), eq(schema.warnings.guildId, message.guild.id)))
        .orderBy(desc(schema.warnings.id));

      if (userWarns.length === 0) {
        return message.reply(`❌ **${targetUser.tag}** has no active warnings.`);
      }

      const latest = userWarns[0];
      await db.delete(schema.warnings).where(eq(schema.warnings.id, latest.id));
      await logModAction(message.guild.id, 'UNWARN', targetUser.id, message.author.id, `Removed latest warning (#${latest.id})`);
      description = `✅ Removed the latest warning (**#${latest.id}**) from **${targetUser.tag}**.`;
    }

    const embed = new EmbedBuilder()
      .setColor('#ff9ecf')
      .setTitle('🛡️ Warning Removed')
      .setDescription(
`╭─────────────👑
> ${description}
╰─────────────👑`
      )
      .setTimestamp()
      .setFooter({ text: message.client.user.username, iconURL: message.client.user.displayAvatarURL() });

    await message.reply({ embeds: [embed] });
  }
};

// ── 4. NICKNAME COMMAND ──────────────────────────────────────────────────────
export const nicknameCommand = {
  data: new SlashCommandBuilder()
    .setName('nickname')
    .setDescription("Changes a member's nickname in the server.")
    .addUserOption(option => option.setName('user').setDescription('Target member').setRequired(true))
    .addStringOption(option => option.setName('nickname').setDescription('New nickname (leave blank to reset)').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageNicknames),

  async executeSlash(interaction) {
    const user = interaction.options.getUser('user');
    const newNick = interaction.options.getString('nickname') || '';
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    if (!member) return interaction.reply({ content: '❌ Member not found.', ephemeral: true });

    try {
      await member.setNickname(newNick);
      await logModAction(interaction.guild.id, 'NICKNAME', user.id, interaction.user.id, newNick ? `Changed nick to ${newNick}` : 'Reset nickname');

      const actionText = newNick ? `nick to **${newNick}**` : 'nick to default';
      const embed = new EmbedBuilder()
        .setColor('#ff9ecf')
        .setTitle('✍️ Nickname Updated')
        .setDescription(
`╭─────────────👑
> Changed **${user.tag}**'s ${actionText}.
╰─────────────👑`
        )
        .setTimestamp()
        .setFooter({ text: interaction.client.user.username, iconURL: interaction.client.user.displayAvatarURL() });

      await interaction.reply({ embeds: [embed] });
    } catch {
      await interaction.reply({ content: '❌ I do not have permission to modify this user\'s nickname.', ephemeral: true });
    }
  },

  async executePrefix(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageNicknames)) return;
    const user = message.mentions.users.first();
    if (!user) return message.reply('❌ Please mention a member.');

    const newNick = args.slice(1).join(' ') || '';
    const member = await message.guild.members.fetch(user.id).catch(() => null);

    if (!member) return message.reply('❌ Member not found.');

    try {
      await member.setNickname(newNick);
      await logModAction(message.guild.id, 'NICKNAME', user.id, message.author.id, newNick ? `Changed nick to ${newNick}` : 'Reset nickname');

      const actionText = newNick ? `nick to **${newNick}**` : 'nick to default';
      const embed = new EmbedBuilder()
        .setColor('#ff9ecf')
        .setTitle('✍️ Nickname Updated')
        .setDescription(
`╭─────────────👑
> Changed **${user.tag}**'s ${actionText}.
╰─────────────👑`
        )
        .setTimestamp()
        .setFooter({ text: message.client.user.username, iconURL: message.client.user.displayAvatarURL() });

      await message.reply({ embeds: [embed] });
    } catch {
      await message.reply('❌ I cannot change this user\'s nickname.');
    }
  }
};

// ── 5. MODLOGS COMMAND ───────────────────────────────────────────────────────
export const modlogsCommand = {
  data: new SlashCommandBuilder()
    .setName('modlogs')
    .setDescription("View moderation history logs for a user.")
    .addUserOption(option => option.setName('user').setDescription('Target user').setRequired(true)),

  async executeSlash(interaction) {
    const targetUser = interaction.options.getUser('user');

    const logs = await db.select()
      .from(schema.auditLog)
      .where(and(eq(schema.auditLog.targetId, targetUser.id), eq(schema.auditLog.guildId, interaction.guild.id)))
      .orderBy(desc(schema.auditLog.id))
      .limit(10);

    const embed = new EmbedBuilder()
      .setColor('#ff9ecf')
      .setTitle(`🛡️ Mod Logs: ${targetUser.username}`)
      .setDescription(
`╭─────────────👑
> Showing the last ${logs.length} mod events.
╰─────────────👑`
      )
      .setTimestamp()
      .setFooter({ text: interaction.client.user.username, iconURL: interaction.client.user.displayAvatarURL() });

    if (logs.length > 0) {
      embed.addFields(logs.map(log => ({
        name: `Action: ${log.action} (#${log.id})`,
        value: `**Reason:** ${log.reason || 'None'}\n**Mod:** <@${log.moderatorId}>\n**Time:** <t:${Math.floor(new Date(log.createdAt).getTime() / 1000)}:R>`,
        inline: false
      })));
    } else {
      embed.setDescription('╭─────────────👑\n> ✅ Clean record. No mod events found.\n╰─────────────👑');
    }

    await interaction.reply({ embeds: [embed] });
  },

  async executePrefix(message, args) {
    const targetUser = message.mentions.users.first();
    if (!targetUser) return message.reply('❌ Please mention a user to view modlogs.');

    const logs = await db.select()
      .from(schema.auditLog)
      .where(and(eq(schema.auditLog.targetId, targetUser.id), eq(schema.auditLog.guildId, message.guild.id)))
      .orderBy(desc(schema.auditLog.id))
      .limit(10);

    const embed = new EmbedBuilder()
      .setColor('#ff9ecf')
      .setTitle(`🛡️ Mod Logs: ${targetUser.username}`)
      .setDescription(
`╭─────────────👑
> Showing the last ${logs.length} mod events.
╰─────────────👑`
      )
      .setTimestamp()
      .setFooter({ text: message.client.user.username, iconURL: message.client.user.displayAvatarURL() });

    if (logs.length > 0) {
      embed.addFields(logs.map(log => ({
        name: `Action: ${log.action} (#${log.id})`,
        value: `**Reason:** ${log.reason || 'None'}\n**Mod:** <@${log.moderatorId}>\n**Time:** <t:${Math.floor(new Date(log.createdAt).getTime() / 1000)}:R>`,
        inline: false
      })));
    } else {
      embed.setDescription('╭─────────────👑\n> ✅ Clean record. No mod events found.\n╰─────────────👑');
    }

    await message.reply({ embeds: [embed] });
  }
};
