import {
  SlashCommandBuilder,
  EmbedBuilder,
  ChannelType
} from 'discord.js';
import { db } from '../db.js';
import * as schema from '../schema.js';
import { eq } from 'drizzle-orm';

// Helper to convert time strings (e.g. 10m, 2h, 1d) into milliseconds
function parseTime(timeStr) {
  const match = timeStr.match(/^(\d+)([smhd])$/);
  if (!match) return null;
  const val = parseInt(match[1]);
  const unit = match[2];
  switch (unit) {
    case 's': return val * 1000;
    case 'm': return val * 60 * 1000;
    case 'h': return val * 60 * 60 * 1000;
    case 'd': return val * 24 * 60 * 60 * 1000;
    default: return null;
  }
}

// ── 1. AVATAR COMMAND ────────────────────────────────────────────────────────
export const avatarCommand = {
  data: new SlashCommandBuilder()
    .setName('avatar')
    .setDescription("Displays a user's avatar with download links.")
    .addUserOption(option => option.setName('user').setDescription('Target user').setRequired(false)),

  async executeSlash(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;
    const isAnimated = user.avatar && user.avatar.startsWith('a_');
    const avatarType = isAnimated ? 'Animated (GIF)' : 'Static';

    const png = user.displayAvatarURL({ size: 1024, extension: 'png' });
    const jpg = user.displayAvatarURL({ size: 1024, extension: 'jpg' });
    const webp = user.displayAvatarURL({ size: 1024, extension: 'webp' });
    const gif = isAnimated ? user.displayAvatarURL({ size: 1024, extension: 'gif' }) : null;

    let downloadLinks = `🌸 [PNG](${png}) | [JPG](${jpg}) | [WEBP](${webp})`;
    if (gif) downloadLinks += ` | [GIF](${gif})`;

    const embed = new EmbedBuilder()
      .setColor('#ff9ecf')
      .setTitle(`${user.username}'s Avatar`)
      .setDescription(
`╭─────────────୨୧
> **Format:** ${avatarType}
> **Downloads:** ${downloadLinks}
╰─────────────୨୧`
      )
      .setImage(user.displayAvatarURL({ size: 1024 }))
      .setTimestamp()
      .setFooter({ text: interaction.client.user.username, iconURL: interaction.client.user.displayAvatarURL() });

    await interaction.reply({ embeds: [embed] });
  },

  async executePrefix(message, args) {
    const user = message.mentions.users.first() || message.author;
    const isAnimated = user.avatar && user.avatar.startsWith('a_');
    const avatarType = isAnimated ? 'Animated (GIF)' : 'Static';

    const png = user.displayAvatarURL({ size: 1024, extension: 'png' });
    const jpg = user.displayAvatarURL({ size: 1024, extension: 'jpg' });
    const webp = user.displayAvatarURL({ size: 1024, extension: 'webp' });
    const gif = isAnimated ? user.displayAvatarURL({ size: 1024, extension: 'gif' }) : null;

    let downloadLinks = `🌸 [PNG](${png}) | [JPG](${jpg}) | [WEBP](${webp})`;
    if (gif) downloadLinks += ` | [GIF](${gif})`;

    const embed = new EmbedBuilder()
      .setColor('#ff9ecf')
      .setTitle(`${user.username}'s Avatar`)
      .setDescription(
`╭─────────────୨୧
> **Format:** ${avatarType}
> **Downloads:** ${downloadLinks}
╰─────────────୨୧`
      )
      .setImage(user.displayAvatarURL({ size: 1024 }))
      .setTimestamp()
      .setFooter({ text: message.client.user.username, iconURL: message.client.user.displayAvatarURL() });

    await message.reply({ embeds: [embed] });
  }
};

// ── 2. BANNER COMMAND ────────────────────────────────────────────────────────
export const bannerCommand = {
  data: new SlashCommandBuilder()
    .setName('banner')
    .setDescription("Displays a user's banner with download links.")
    .addUserOption(option => option.setName('user').setDescription('Target user').setRequired(false)),

  async executeSlash(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;
    const fetchedUser = await interaction.client.users.fetch(user.id, { force: true });

    if (!fetchedUser.banner) {
      const embed = new EmbedBuilder()
        .setColor('#ff9ecf')
        .setDescription(
`╭─────────────୨୧
> ❌ ${user.username} doesn't have a profile banner
╰─────────────୨୧`
        );
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const isAnimated = fetchedUser.banner.startsWith('a_');
    const png = fetchedUser.bannerURL({ size: 1024, extension: 'png' });
    const jpg = fetchedUser.bannerURL({ size: 1024, extension: 'jpg' });
    const webp = fetchedUser.bannerURL({ size: 1024, extension: 'webp' });
    const gif = isAnimated ? fetchedUser.bannerURL({ size: 1024, extension: 'gif' }) : null;

    let downloadLinks = `🌸 [PNG](${png}) | [JPG](${jpg}) | [WEBP](${webp})`;
    if (gif) downloadLinks += ` | [GIF](${gif})`;

    const embed = new EmbedBuilder()
      .setColor('#ff9ecf')
      .setTitle(`${user.username}'s Banner`)
      .setDescription(
`╭─────────────୨୧
> **Format:** ${isAnimated ? 'Animated (GIF)' : 'Static'}
> **Downloads:** ${downloadLinks}
╰─────────────୨୧`
      )
      .setImage(fetchedUser.bannerURL({ size: 1024 }))
      .setTimestamp()
      .setFooter({ text: interaction.client.user.username, iconURL: interaction.client.user.displayAvatarURL() });

    await interaction.reply({ embeds: [embed] });
  },

  async executePrefix(message, args) {
    const user = message.mentions.users.first() || message.author;
    const fetchedUser = await message.client.users.fetch(user.id, { force: true });

    if (!fetchedUser.banner) {
      const embed = new EmbedBuilder()
        .setColor('#ff9ecf')
        .setDescription(
`╭─────────────୨୧
> ❌ ${user.username} doesn't have a profile banner
╰─────────────୨୧`
        );
      return message.reply({ embeds: [embed] });
    }

    const isAnimated = fetchedUser.banner.startsWith('a_');
    const png = fetchedUser.bannerURL({ size: 1024, extension: 'png' });
    const jpg = fetchedUser.bannerURL({ size: 1024, extension: 'jpg' });
    const webp = fetchedUser.bannerURL({ size: 1024, extension: 'webp' });
    const gif = isAnimated ? fetchedUser.bannerURL({ size: 1024, extension: 'gif' }) : null;

    let downloadLinks = `🌸 [PNG](${png}) | [JPG](${jpg}) | [WEBP](${webp})`;
    if (gif) downloadLinks += ` | [GIF](${gif})`;

    const embed = new EmbedBuilder()
      .setColor('#ff9ecf')
      .setTitle(`${user.username}'s Banner`)
      .setDescription(
`╭─────────────୨୧
> **Format:** ${isAnimated ? 'Animated (GIF)' : 'Static'}
> **Downloads:** ${downloadLinks}
╰─────────────୨୧`
      )
      .setImage(fetchedUser.bannerURL({ size: 1024 }))
      .setTimestamp()
      .setFooter({ text: message.client.user.username, iconURL: message.client.user.displayAvatarURL() });

    await message.reply({ embeds: [embed] });
  }
};

// ── 3. USERINFO COMMAND ──────────────────────────────────────────────────────
export const userinfoCommand = {
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Displays comprehensive user information.')
    .addUserOption(option => option.setName('user').setDescription('Target user').setRequired(false)),

  async executeSlash(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    const embed = new EmbedBuilder().setColor('#ff9ecf').setThumbnail(user.displayAvatarURL());
    embed.setTitle(`${user.username}'s Profile Info`);

    const flags = user.flags ? user.flags.toArray().join(', ') || 'None' : 'None';
    const roles = member 
      ? member.roles.cache.filter(r => r.name !== '@everyone').map(r => r.toString()).slice(0, 15).join(' ') || 'None'
      : 'Not in Server';

    const boostStatus = member && member.premiumSince 
      ? `Yes (Since <t:${Math.floor(member.premiumSinceTimestamp / 1000)}:R>)` 
      : 'No';

    embed.addFields(
      { name: '👤 Identity', value: `**Tag:** ${user.tag}\n**ID:** \`${user.id}\``, inline: true },
      { name: '✨ Badges', value: flags, inline: true },
      { name: '🚀 Server Booster', value: boostStatus, inline: true },
      { name: '📅 Account Created', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:F>\n(<t:${Math.floor(user.createdTimestamp / 1000)}:R>)`, inline: false }
    );

    if (member) {
      embed.addFields(
        { name: '📥 Joined Server', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>\n(<t:${Math.floor(member.joinedTimestamp / 1000)}:R>)`, inline: false },
        { name: `🎭 Roles (${member.roles.cache.size - 1})`, value: roles, inline: false }
      );
    }

    embed.setTimestamp().setFooter({ text: interaction.client.user.username, iconURL: interaction.client.user.displayAvatarURL() });
    await interaction.reply({ embeds: [embed] });
  },

  async executePrefix(message, args) {
    const user = message.mentions.users.first() || message.author;
    const member = await message.guild.members.fetch(user.id).catch(() => null);

    const embed = new EmbedBuilder().setColor('#ff9ecf').setThumbnail(user.displayAvatarURL());
    embed.setTitle(`${user.username}'s Profile Info`);

    const flags = user.flags ? user.flags.toArray().join(', ') || 'None' : 'None';
    const roles = member 
      ? member.roles.cache.filter(r => r.name !== '@everyone').map(r => r.toString()).slice(0, 15).join(' ') || 'None'
      : 'Not in Server';

    const boostStatus = member && member.premiumSince 
      ? `Yes (Since <t:${Math.floor(member.premiumSinceTimestamp / 1000)}:R>)` 
      : 'No';

    embed.addFields(
      { name: '👤 Identity', value: `**Tag:** ${user.tag}\n**ID:** \`${user.id}\``, inline: true },
      { name: '✨ Badges', value: flags, inline: true },
      { name: '🚀 Server Booster', value: boostStatus, inline: true },
      { name: '📅 Account Created', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:F>\n(<t:${Math.floor(user.createdTimestamp / 1000)}:R>)`, inline: false }
    );

    if (member) {
      embed.addFields(
        { name: '📥 Joined Server', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>\n(<t:${Math.floor(member.joinedTimestamp / 1000)}:R>)`, inline: false },
        { name: `🎭 Roles (${member.roles.cache.size - 1})`, value: roles, inline: false }
      );
    }

    embed.setTimestamp().setFooter({ text: message.client.user.username, iconURL: message.client.user.displayAvatarURL() });
    await message.reply({ embeds: [embed] });
  }
};

// ── 4. SERVERINFO COMMAND ────────────────────────────────────────────────────
export const serverinfoCommand = {
  data: new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('Displays detailed server statistics.'),

  async executeSlash(interaction) {
    const guild = interaction.guild;
    const owner = await guild.fetchOwner();
    const channels = guild.channels.cache;

    const embed = new EmbedBuilder()
      .setColor('#ff9ecf')
      .setTitle(`${guild.name} Statistics`)
      .setThumbnail(guild.iconURL())
      .addFields(
        { name: '👑 Owner', value: `${owner.user.tag}\n(\`${owner.id}\`)`, inline: true },
        { name: '📅 Created', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>\n(<t:${Math.floor(guild.createdTimestamp / 1000)}:R>)`, inline: true },
        { name: '👥 Members', value: `Total: **${guild.memberCount}**`, inline: true },
        { name: '💬 Channels', value: `Text: **${channels.filter(c => c.type === ChannelType.GuildText).size}**\nVoice: **${channels.filter(c => c.type === ChannelType.GuildVoice).size}**\nCategories: **${channels.filter(c => c.type === ChannelType.GuildCategory).size}**`, inline: true },
        { name: '🛡️ Security', value: `Verification: **${guild.verificationLevel}**\nRoles: **${guild.roles.cache.size}**`, inline: true },
        { name: '✨ Boost Level', value: `Tier **${guild.premiumTier}** (${guild.premiumSubscriptionCount} Boosts)`, inline: true }
      )
      .setTimestamp()
      .setFooter({ text: `Server ID: ${guild.id}`, iconURL: interaction.client.user.displayAvatarURL() });

    await interaction.reply({ embeds: [embed] });
  },

  async executePrefix(message) {
    const guild = message.guild;
    const owner = await guild.fetchOwner();
    const channels = guild.channels.cache;

    const embed = new EmbedBuilder()
      .setColor('#ff9ecf')
      .setTitle(`${guild.name} Statistics`)
      .setThumbnail(guild.iconURL())
      .addFields(
        { name: '👑 Owner', value: `${owner.user.tag}\n(\`${owner.id}\`)`, inline: true },
        { name: '📅 Created', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>\n(<t:${Math.floor(guild.createdTimestamp / 1000)}:R>)`, inline: true },
        { name: '👥 Members', value: `Total: **${guild.memberCount}**`, inline: true },
        { name: '💬 Channels', value: `Text: **${channels.filter(c => c.type === ChannelType.GuildText).size}**\nVoice: **${channels.filter(c => c.type === ChannelType.GuildVoice).size}**\nCategories: **${channels.filter(c => c.type === ChannelType.GuildCategory).size}**`, inline: true },
        { name: '🛡️ Security', value: `Verification: **${guild.verificationLevel}**\nRoles: **${guild.roles.cache.size}**`, inline: true },
        { name: '✨ Boost Level', value: `Tier **${guild.premiumTier}** (${guild.premiumSubscriptionCount} Boosts)`, inline: true }
      )
      .setTimestamp()
      .setFooter({ text: `Server ID: ${guild.id}`, iconURL: message.client.user.displayAvatarURL() });

    await message.reply({ embeds: [embed] });
  }
};

// ── 5. ROLEINFO COMMAND ──────────────────────────────────────────────────────
export const roleinfoCommand = {
  data: new SlashCommandBuilder()
    .setName('roleinfo')
    .setDescription('Displays detailed role information.')
    .addRoleOption(option => option.setName('role').setDescription('Target role').setRequired(true)),

  async executeSlash(interaction) {
    const role = interaction.options.getRole('role');
    const creationTime = Math.floor(role.createdTimestamp / 1000);
    const membersWithRole = role.members.size;

    const keyPerms = role.permissions.toArray().slice(0, 8).join(', ') || 'No special permissions';

    const embed = new EmbedBuilder()
      .setColor(role.hexColor === '#000000' ? '#ff9ecf' : role.hexColor)
      .setTitle(`🎭 Role Info: ${role.name}`)
      .addFields(
        { name: '🆔 ID', value: `\`${role.id}\``, inline: true },
        { name: '🎨 Color', value: `\`${role.hexColor}\``, inline: true },
        { name: '👥 Members', value: `**${membersWithRole}** users`, inline: true },
        { name: '⚙️ Settings', value: `Hoisted: **${role.hoist ? 'Yes' : 'No'}**\nMentionable: **${role.mentionable ? 'Yes' : 'No'}**\nPosition: **${role.position}**`, inline: true },
        { name: '📅 Created At', value: `<t:${creationTime}:F> (<t:${creationTime}:R>)`, inline: false },
        { name: '🛡️ Key Permissions', value: `\`\`\`${keyPerms}\`\`\``, inline: false }
      )
      .setTimestamp()
      .setFooter({ text: interaction.client.user.username, iconURL: interaction.client.user.displayAvatarURL() });

    await interaction.reply({ embeds: [embed] });
  },

  async executePrefix(message, args) {
    const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[0]);
    if (!role) return message.reply('❌ Please mention a valid role or supply a Role ID.');

    const creationTime = Math.floor(role.createdTimestamp / 1000);
    const membersWithRole = role.members.size;
    const keyPerms = role.permissions.toArray().slice(0, 8).join(', ') || 'No special permissions';

    const embed = new EmbedBuilder()
      .setColor(role.hexColor === '#000000' ? '#ff9ecf' : role.hexColor)
      .setTitle(`🎭 Role Info: ${role.name}`)
      .addFields(
        { name: '🆔 ID', value: `\`${role.id}\``, inline: true },
        { name: '🎨 Color', value: `\`${role.hexColor}\``, inline: true },
        { name: '👥 Members', value: `**${membersWithRole}** users`, inline: true },
        { name: '⚙️ Settings', value: `Hoisted: **${role.hoist ? 'Yes' : 'No'}**\nMentionable: **${role.mentionable ? 'Yes' : 'No'}**\nPosition: **${role.position}**`, inline: true },
        { name: '📅 Created At', value: `<t:${creationTime}:F> (<t:${creationTime}:R>)`, inline: false },
        { name: '🛡️ Key Permissions', value: `\`\`\`${keyPerms}\`\`\``, inline: false }
      )
      .setTimestamp()
      .setFooter({ text: message.client.user.username, iconURL: message.client.user.displayAvatarURL() });

    await message.reply({ embeds: [embed] });
  }
};

// ── 6. EMOJIINFO COMMAND ─────────────────────────────────────────────────────
export const emojiinfoCommand = {
  data: new SlashCommandBuilder()
    .setName('emojiinfo')
    .setDescription('Displays detailed custom emoji details.')
    .addStringOption(option => option.setName('emoji').setDescription('Target custom emoji').setRequired(true)),

  async executeSlash(interaction) {
    const rawEmoji = interaction.options.getString('emoji');
    const match = rawEmoji.match(/<?a?:([^:]+):(\d+)>/);
    if (!match) return interaction.reply({ content: '❌ Invalid custom emoji. Must be a custom server emoji.', ephemeral: true });

    const emojiName = match[1];
    const emojiId = match[2];
    const isAnimated = rawEmoji.startsWith('<a:');
    const creationTime = Math.floor((Number(BigInt(emojiId) >> 22n) + 1420070400000) / 1000);
    const emojiUrl = `https://cdn.discordapp.com/emojis/${emojiId}.${isAnimated ? 'gif' : 'png'}`;

    const embed = new EmbedBuilder()
      .setColor('#ff9ecf')
      .setTitle(`🌸 Emoji Details: :${emojiName}:`)
      .setThumbnail(emojiUrl)
      .addFields(
        { name: '🆔 ID', value: `\`${emojiId}\``, inline: true },
        { name: '🎬 Animated', value: isAnimated ? 'Yes (GIF)' : 'No (PNG)', inline: true },
        { name: '📅 Created At', value: `<t:${creationTime}:F> (<t:${creationTime}:R>)`, inline: false },
        { name: '🔗 Image URL', value: `[Link](${emojiUrl})`, inline: true }
      )
      .setTimestamp()
      .setFooter({ text: interaction.client.user.username, iconURL: interaction.client.user.displayAvatarURL() });

    await interaction.reply({ embeds: [embed] });
  },

  async executePrefix(message, args) {
    if (!args[0]) return message.reply('❌ Please input a custom emoji.');
    const match = args[0].match(/<?a?:([^:]+):(\d+)>/);
    if (!match) return message.reply('❌ Invalid custom emoji.');

    const emojiName = match[1];
    const emojiId = match[2];
    const isAnimated = args[0].startsWith('<a:');
    const creationTime = Math.floor((Number(BigInt(emojiId) >> 22n) + 1420070400000) / 1000);
    const emojiUrl = `https://cdn.discordapp.com/emojis/${emojiId}.${isAnimated ? 'gif' : 'png'}`;

    const embed = new EmbedBuilder()
      .setColor('#ff9ecf')
      .setTitle(`🌸 Emoji Details: :${emojiName}:`)
      .setThumbnail(emojiUrl)
      .addFields(
        { name: '🆔 ID', value: `\`${emojiId}\``, inline: true },
        { name: '🎬 Animated', value: isAnimated ? 'Yes (GIF)' : 'No (PNG)', inline: true },
        { name: '📅 Created At', value: `<t:${creationTime}:F> (<t:${creationTime}:R>)`, inline: false },
        { name: '🔗 Image URL', value: `[Link](${emojiUrl})`, inline: true }
      )
      .setTimestamp()
      .setFooter({ text: message.client.user.username, iconURL: message.client.user.displayAvatarURL() });

    await message.reply({ embeds: [embed] });
  }
};

// ── 7. TIMESTAMP COMMAND ─────────────────────────────────────────────────────
export const timestampCommand = {
  data: new SlashCommandBuilder()
    .setName('timestamp')
    .setDescription('Generates Discord markdown timestamps.')
    .addStringOption(option => option.setName('time').setDescription('Time value (e.g. "now", "in 2 hours", "YYYY-MM-DD")').setRequired(false)),

  async executeSlash(interaction) {
    const rawTime = interaction.options.getString('time') || 'now';
    let dateObj = new Date();

    if (rawTime.toLowerCase() !== 'now') {
      const parsedMs = parseTime(rawTime);
      if (parsedMs) {
        dateObj = new Date(Date.now() + parsedMs);
      } else {
        dateObj = new Date(rawTime);
      }
    }

    if (isNaN(dateObj.getTime())) {
      return interaction.reply({ content: '❌ Invalid date/time format. Use e.g. `now`, `30m`, `2h`, or `2026-12-25`.', ephemeral: true });
    }

    const unixSeconds = Math.floor(dateObj.getTime() / 1000);

    const embed = new EmbedBuilder()
      .setColor('#ff9ecf')
      .setTitle('⏱️ Discord Timestamp Codes')
      .setDescription(
`╭─────────────୨୧
> **Target Date:** ${dateObj.toUTCString()}
> **Copy the codes below:**
╰─────────────୨୧`
      )
      .addFields(
        { name: '⏱️ Relative Time', value: `Code: \`<t:${unixSeconds}:R>\`\nPreview: <t:${unixSeconds}:R>`, inline: false },
        { name: '📅 Short Date', value: `Code: \`<t:${unixSeconds}:d>\`\nPreview: <t:${unixSeconds}:d>`, inline: true },
        { name: '📅 Long Date', value: `Code: \`<t:${unixSeconds}:D>\`\nPreview: <t:${unixSeconds}:D>`, inline: true },
        { name: '🕒 Short Time', value: `Code: \`<t:${unixSeconds}:t>\`\nPreview: <t:${unixSeconds}:t>`, inline: true },
        { name: '🕒 Long Time', value: `Code: \`<t:${unixSeconds}:T>\`\nPreview: <t:${unixSeconds}:T>`, inline: true },
        { name: '📅 Full Date/Time', value: `Code: \`<t:${unixSeconds}:F>\`\nPreview: <t:${unixSeconds}:F>`, inline: false }
      )
      .setTimestamp()
      .setFooter({ text: interaction.client.user.username, iconURL: interaction.client.user.displayAvatarURL() });

    await interaction.reply({ embeds: [embed] });
  },

  async executePrefix(message, args) {
    const rawTime = args.join(' ') || 'now';
    let dateObj = new Date();

    if (rawTime.toLowerCase() !== 'now') {
      const parsedMs = parseTime(rawTime);
      if (parsedMs) {
        dateObj = new Date(Date.now() + parsedMs);
      } else {
        dateObj = new Date(rawTime);
      }
    }

    if (isNaN(dateObj.getTime())) {
      return message.reply('❌ Invalid format. Use e.g. `now`, `30m`, `2h`, or `2026-12-25`.');
    }

    const unixSeconds = Math.floor(dateObj.getTime() / 1000);

    const embed = new EmbedBuilder()
      .setColor('#ff9ecf')
      .setTitle('⏱️ Discord Timestamp Codes')
      .setDescription(
`╭─────────────୨୧
> **Target Date:** ${dateObj.toUTCString()}
> **Copy the codes below:**
╰─────────────୨୧`
      )
      .addFields(
        { name: '⏱️ Relative Time', value: `Code: \`<t:${unixSeconds}:R>\`\nPreview: <t:${unixSeconds}:R>`, inline: false },
        { name: '📅 Short Date', value: `Code: \`<t:${unixSeconds}:d>\`\nPreview: <t:${unixSeconds}:d>`, inline: true },
        { name: '📅 Long Date', value: `Code: \`<t:${unixSeconds}:D>\`\nPreview: <t:${unixSeconds}:D>`, inline: true }
      )
      .setTimestamp()
      .setFooter({ text: message.client.user.username, iconURL: message.client.user.displayAvatarURL() });

    await message.reply({ embeds: [embed] });
  }
};

// ── 8. POLL COMMAND ──────────────────────────────────────────────────────────
export const pollCommand = {
  data: new SlashCommandBuilder()
    .setName('poll')
    .setDescription('Creates an interactive poll.')
    .addStringOption(option => option.setName('question').setDescription('The poll question').setRequired(true))
    .addStringOption(option => option.setName('options').setDescription('Comma-separated choices (up to 10)').setRequired(true)),

  async executeSlash(interaction) {
    const question = interaction.options.getString('question');
    const optionsRaw = interaction.options.getString('options');
    const options = optionsRaw.split(',').map(o => o.trim()).filter(Boolean);

    if (options.length < 2 || options.length > 10) {
      return interaction.reply({ content: '❌ You must specify between 2 and 10 options.', ephemeral: true });
    }

    const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
    let pollDesc = `╭─────────────୨୧\n> **Question: ${question}**\n╰─────────────୨୧\n\n`;

    for (let i = 0; i < options.length; i++) {
      pollDesc += `${emojis[i]} **${options[i]}**\n`;
    }

    const embed = new EmbedBuilder()
      .setColor('#ff9ecf')
      .setTitle('📊 Server Poll')
      .setDescription(pollDesc)
      .setTimestamp()
      .setFooter({ text: `Poll by ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() });

    const reply = await interaction.reply({ embeds: [embed], fetchReply: true });
    for (let i = 0; i < options.length; i++) {
      await reply.react(emojis[i]);
    }
  },

  async executePrefix(message, args) {
    const fullText = args.join(' ');
    const parts = fullText.split('|').map(p => p.trim()).filter(Boolean);
    if (parts.length < 3) {
      return message.reply('❌ Format: `,poll Question | Option A | Option B | ...` (At least 2 options)');
    }

    const question = parts[0];
    const options = parts.slice(1);

    if (options.length > 10) return message.reply('❌ Limit of 10 options.');

    const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
    let pollDesc = `╭─────────────୨୧\n> **Question: ${question}**\n╰─────────────୨୧\n\n`;

    for (let i = 0; i < options.length; i++) {
      pollDesc += `${emojis[i]} **${options[i]}**\n`;
    }

    const embed = new EmbedBuilder()
      .setColor('#ff9ecf')
      .setTitle('📊 Server Poll')
      .setDescription(pollDesc)
      .setTimestamp()
      .setFooter({ text: `Poll by ${message.author.username}`, iconURL: message.author.displayAvatarURL() });

    const reply = await message.reply({ embeds: [embed] });
    for (let i = 0; i < options.length; i++) {
      await reply.react(emojis[i]);
    }
  }
};

// ── 9. REMIND COMMAND ────────────────────────────────────────────────────────
export const remindCommand = {
  data: new SlashCommandBuilder()
    .setName('remind')
    .setDescription('Sets a reminder alert.')
    .addStringOption(option => option.setName('duration').setDescription('When to remind (e.g. 10m, 2h, 1d)').setRequired(true))
    .addStringOption(option => option.setName('message').setDescription('What to remind you about').setRequired(true)),

  async executeSlash(interaction) {
    const durationStr = interaction.options.getString('duration');
    const message = interaction.options.getString('message');

    const durationMs = parseTime(durationStr);
    if (!durationMs) {
      return interaction.reply({ content: '❌ Invalid duration. Example: `10m` (minutes), `2h` (hours), `1d` (days).', ephemeral: true });
    }

    const dueAtDate = new Date(Date.now() + durationMs);

    await db.insert(schema.reminders).values({
      userId: interaction.user.id,
      guildId: interaction.guild.id,
      channelId: interaction.channel.id,
      message,
      dueAt: dueAtDate.toISOString()
    });

    const embed = new EmbedBuilder()
      .setColor('#ff9ecf')
      .setTitle('🔔 Reminder Configured')
      .setDescription(
`╭─────────────୨୧
> ⏰ I will remind you <t:${Math.floor(dueAtDate.getTime() / 1000)}:R>!
> 📝 **Note:** ${message}
╰─────────────୨୧`
      )
      .setTimestamp()
      .setFooter({ text: interaction.client.user.username, iconURL: interaction.client.user.displayAvatarURL() });

    await interaction.reply({ embeds: [embed] });
  },

  async executePrefix(message, args) {
    if (args.length < 2) return message.reply('❌ Syntax: `,remind [time_val] [reminder_content]` (e.g., `,remind 10m study`)');
    const durationStr = args[0];
    const remMessage = args.slice(1).join(' ');

    const durationMs = parseTime(durationStr);
    if (!durationMs) return message.reply('❌ Invalid format. Use e.g. `10m`, `2h`, `1d`.');

    const dueAtDate = new Date(Date.now() + durationMs);

    await db.insert(schema.reminders).values({
      userId: message.author.id,
      guildId: message.guild.id,
      channelId: message.channel.id,
      message: remMessage,
      dueAt: dueAtDate.toISOString()
    });

    const embed = new EmbedBuilder()
      .setColor('#ff9ecf')
      .setTitle('🔔 Reminder Configured')
      .setDescription(
`╭─────────────୨୧
> ⏰ I will remind you <t:${Math.floor(dueAtDate.getTime() / 1000)}:R>!
> 📝 **Note:** ${remMessage}
╰─────────────୨୧`
      )
      .setTimestamp()
      .setFooter({ text: message.client.user.username, iconURL: message.client.user.displayAvatarURL() });

    await message.reply({ embeds: [embed] });
  }
};

// ── 10. TRANSLATE COMMAND ────────────────────────────────────────────────────
export const translateCommand = {
  data: new SlashCommandBuilder()
    .setName('translate')
    .setDescription('Translates text between languages.')
    .addStringOption(option => option.setName('text').setDescription('The text to translate').setRequired(true))
    .addStringOption(option => option.setName('to').setDescription('Target language ISO code (default: en)').setRequired(false)),

  async executeSlash(interaction) {
    const text = interaction.options.getString('text');
    const to = interaction.options.getString('to') || 'en';

    await interaction.deferReply();

    try {
      const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${to}&dt=t&q=${encodeURIComponent(text)}`);
      if (!res.ok) throw new Error('API request failed');

      const json = await res.json();
      const translation = json[0].map(item => item[0]).join('');

      const embed = new EmbedBuilder()
        .setColor('#ff9ecf')
        .setTitle('🌐 Translation Complete')
        .addFields(
          { name: '📥 Original Text', value: `\`\`\`${text.slice(0, 1000)}\`\`\`` },
          { name: '📤 Translated Text', value: `\`\`\`${translation.slice(0, 1000)}\`\`\`` }
        )
        .setTimestamp()
        .setFooter({ text: `Translated to: ${to.toUpperCase()}`, iconURL: interaction.client.user.displayAvatarURL() });

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      await interaction.editReply({ content: '❌ Translation failed. Check the language code (e.g. `es`, `fr`, `ja`).' });
    }
  },

  async executePrefix(message, args) {
    if (args.length < 2) return message.reply('❌ Syntax: `,translate [lang_code] [text]` (e.g., `,translate en Bonjour!`)');
    const to = args[0];
    const text = args.slice(1).join(' ');

    try {
      const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${to}&dt=t&q=${encodeURIComponent(text)}`);
      if (!res.ok) throw new Error('API request failed');

      const json = await res.json();
      const translation = json[0].map(item => item[0]).join('');

      const embed = new EmbedBuilder()
        .setColor('#ff9ecf')
        .setTitle('🌐 Translation Complete')
        .addFields(
          { name: '📥 Original Text', value: `\`\`\`${text.slice(0, 1000)}\`\`\`` },
          { name: '📤 Translated Text', value: `\`\`\`${translation.slice(0, 1000)}\`\`\`` }
        )
        .setTimestamp()
        .setFooter({ text: `Translated to: ${to.toUpperCase()}`, iconURL: message.client.user.displayAvatarURL() });

      await message.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      await message.reply('❌ Translation failed.');
    }
  }
};
