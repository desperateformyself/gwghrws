import {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  Colors
} from 'discord.js';

// Import all modular commands
import {
  avatarCommand,
  bannerCommand,
  userinfoCommand,
  serverinfoCommand,
  roleinfoCommand,
  emojiinfoCommand,
  timestampCommand,
  pollCommand,
  remindCommand,
  translateCommand
} from './commands/utility.js';

import {
  warnCommand,
  warningsCommand,
  unwarnCommand,
  nicknameCommand,
  modlogsCommand
} from './commands/moderation.js';

import {
  rankCommand,
  leaderboardCommand,
  levelrolesCommand,
  setxpCommand,
  resetxpCommand,
  levelcardCommand
} from './commands/leveling.js';

import {
  dailyCommand,
  workCommand,
  crimeCommand,
  robCommand,
  shopCommand,
  inventoryCommand,
  giveCommand,
  gambleCommand
} from './commands/economy.js';

import {
  shipCommand,
  eightBallCommand,
  memeCommand,
  coinflipCommand,
  diceCommand,
  catCommand,
  dogCommand,
  wouldyouratherCommand,
  factCommand
} from './commands/fun.js';

import {
  profilecardCommand,
  profileCommand
} from './commands/profilecard.js';

import { achievementsCommand } from './commands/achievements.js';
import { petCommand } from './commands/pet.js';
import { gardenCommand } from './commands/garden.js';
import { focusCommand } from './commands/focus.js';
import { fortuneCommand } from './commands/fortune.js';
import { quoteCommand, quoteContextMenuCommand } from './commands/quote.js';

// ── PRESERVED MODERATION COMMANDS ───────────────────────────────────────────

const kickCommand = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a member from the server.')
    .addUserOption(option => option.setName('user').setDescription('The member to kick').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('Reason for the kick').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

  async executeSlash(interaction) {
    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    if (!member) return interaction.reply({ content: '❌ Member not found.', ephemeral: true });
    if (!member.kickable) return interaction.reply({ content: '❌ I cannot kick this user.', ephemeral: true });

    await member.kick(reason);
    await interaction.reply({ content: `✅ **${user.tag}** was kicked. Reason: ${reason}` });
  },

  async executePrefix(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.KickMembers)) return;
    const user = message.mentions.users.first();
    if (!user) return message.reply('❌ Please mention a member to kick.');
    
    const member = await message.guild.members.fetch(user.id).catch(() => null);
    if (!member || !member.kickable) return message.reply('❌ I cannot kick this user.');

    const reason = args.slice(1).join(' ') || 'No reason provided';
    await member.kick(reason);
    await message.reply(`✅ **${user.tag}** was kicked for: ${reason}`);
  }
};

const banCommand = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a member from the server.')
    .addUserOption(option => option.setName('user').setDescription('The member to ban').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('Reason for the ban').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async executeSlash(interaction) {
    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    if (!member) return interaction.reply({ content: '❌ Member not found.', ephemeral: true });
    if (!member.bannable) return interaction.reply({ content: '❌ I cannot ban this user.', ephemeral: true });

    await member.ban({ reason });
    await interaction.reply({ content: `⛔ **${user.tag}** has been banned. Reason: ${reason}` });
  },

  async executePrefix(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) return;
    const user = message.mentions.users.first();
    if (!user) return message.reply('❌ Please mention a member to ban.');

    const member = await message.guild.members.fetch(user.id).catch(() => null);
    if (!member || !member.bannable) return message.reply('❌ I cannot ban this user.');

    const reason = args.slice(1).join(' ') || 'No reason provided';
    await member.ban({ reason });
    await message.reply(`⛔ **${user.tag}** has been banned for: ${reason}`);
  }
};

const timeoutCommand = {
  data: new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Timeout a user for a specified duration (in minutes).')
    .addUserOption(option => option.setName('user').setDescription('The user to timeout').setRequired(true))
    .addIntegerOption(option => option.setName('duration').setDescription('Duration in minutes').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('Reason for timeout').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async executeSlash(interaction) {
    const user = interaction.options.getUser('user');
    const duration = interaction.options.getInteger('duration');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    if (!member) return interaction.reply({ content: '❌ Member not found.', ephemeral: true });
    
    try {
      await member.timeout(duration * 60 * 1000, reason);
      await interaction.reply({ content: `🤫 **${user.tag}** has been timed out for ${duration} minutes. Reason: ${reason}` });
    } catch {
      await interaction.reply({ content: '❌ Insufficient permissions to timeout this user.', ephemeral: true });
    }
  },

  async executePrefix(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) return;
    const user = message.mentions.users.first();
    const duration = parseInt(args[1]);

    if (!user || isNaN(duration)) return message.reply('❌ Syntax: `,timeout @user [duration_in_minutes] [reason]`');
    
    const member = await message.guild.members.fetch(user.id).catch(() => null);
    if (!member) return message.reply('❌ Member not found.');

    const reason = args.slice(2).join(' ') || 'No reason provided';
    
    try {
      await member.timeout(duration * 60 * 1000, reason);
      await message.reply(`🤫 **${user.tag}** timed out for ${duration} minutes. Reason: ${reason}`);
    } catch {
      await message.reply('❌ I cannot timeout this user.');
    }
  }
};

const untimeoutCommand = {
  data: new SlashCommandBuilder()
    .setName('untimeout')
    .setDescription('Remove timeout from a user.')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('User to untimeout')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async executeSlash(interaction) {
    const user = interaction.options.getUser('user');
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    if (!member)
      return interaction.reply({
        content: '❌ Member not found.',
        ephemeral: true
      });

    await member.timeout(null);
    await interaction.reply(`✅ **${user.tag}** has been un-timed out.`);
  },

  async executePrefix(message) {
    if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers))
      return;

    const user = message.mentions.users.first();
    if (!user) return message.reply('❌ Mention a user.');

    const member = await message.guild.members.fetch(user.id).catch(() => null);
    if (!member) return message.reply('❌ Member not found.');

    await member.timeout(null);
    await message.reply(`✅ **${user.tag}** has been un-timed out.`);
  }
};

const purgeCommand = {
  data: new SlashCommandBuilder()
    .setName('purge')
    .setDescription('Delete a specified amount of messages.')
    .addIntegerOption(option => option.setName('amount').setDescription('Number of messages to delete').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async executeSlash(interaction) {
    const amount = interaction.options.getInteger('amount');
    if (amount < 1 || amount > 100) return interaction.reply({ content: '❌ Please enter an amount between 1 and 100.', ephemeral: true });

    const deleted = await interaction.channel.bulkDelete(amount, true);
    await interaction.reply({ content: `🧹 Deleted **${deleted.size}** messages.`, ephemeral: true });
  },

  async executePrefix(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) return;
    const amount = parseInt(args[0]);
    if (isNaN(amount) || amount < 1 || amount > 100) return message.reply('❌ Please specify an amount between 1 and 100.');

    await message.channel.bulkDelete(amount + 1, true);
  }
};

const lockCommand = {
  data: new SlashCommandBuilder()
    .setName('lock')
    .setDescription('Lock the current channel.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async executeSlash(interaction) {
    await interaction.channel.permissionOverwrites.edit(
      interaction.guild.roles.everyone,
      { SendMessages: false }
    );

    const embed = new EmbedBuilder()
      .setColor('#ff9ecf')
      .setTitle('🔒 Channel Locked')
      .setDescription('This channel has been temporarily locked by a moderator.\n\n🌸 Please wait until it is reopened.')
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },

  async executePrefix(message) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) return;

    await message.channel.permissionOverwrites.edit(
      message.guild.roles.everyone,
      { SendMessages: false }
    );

    const embed = new EmbedBuilder()
      .setColor('#ff9ecf')
      .setTitle('🔒 Channel Locked')
      .setDescription('This channel has been temporarily locked by a moderator.\n\n🌸 Please wait until it is reopened.')
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  }
};

const unlockCommand = {
  data: new SlashCommandBuilder()
    .setName('unlock')
    .setDescription('Unlock the current channel.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async executeSlash(interaction) {
    await interaction.channel.permissionOverwrites.edit(
      interaction.guild.roles.everyone,
      { SendMessages: null }
    );

    const embed = new EmbedBuilder()
      .setColor('#ff9ecf')
      .setAuthor({
        name: 'Lily',
        iconURL: interaction.client.user.displayAvatarURL()
      })
      .setDescription(
`╭─────────────୨୧
> 🔓 Channel Unlocked
> 💬 Members can send messages again
> 🌸 Permissions restored
╰─────────────୨୧`
      );

    await interaction.reply({ embeds: [embed] });
  },

  async executePrefix(message) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) return;

    await message.channel.permissionOverwrites.edit(
      message.guild.roles.everyone,
      { SendMessages: null }
    );

    const embed = new EmbedBuilder()
      .setColor('#ff9ecf')
      .setAuthor({
        name: 'Lily',
        iconURL: message.client.user.displayAvatarURL()
      })
      .setDescription(
`╭─────────────୨୧
> 🔓 Channel Unlocked
> 💬 Members can send messages again
> 🌸 Permissions restored
╰─────────────୨୧`
      );

    await message.reply({ embeds: [embed] });
  }
};

const slowmodeCommand = {
  data: new SlashCommandBuilder()
    .setName('slowmode')
    .setDescription('Set channel slowmode.')
    .addIntegerOption(option =>
      option
        .setName('seconds')
        .setDescription('Slowmode duration')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async executeSlash(interaction) {
    const seconds = interaction.options.getInteger('seconds');
    await interaction.channel.setRateLimitPerUser(seconds);

    const embed = new EmbedBuilder()
      .setColor('#ff9ecf')
      .setAuthor({
        name: 'Lily',
        iconURL: interaction.client.user.displayAvatarURL()
      })
      .setDescription(
`╭─────────────୨୧
> 🐢 Slowmode Updated
> ⏱️ Delay: \`${seconds}s\`
> 🌸 Channel settings updated
╰─────────────୨୧`
      );

    await interaction.reply({ embeds: [embed] });
  },

  async executePrefix(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) return;
    const seconds = parseInt(args[0]);

    if (isNaN(seconds)) return message.reply('❌ Enter a valid number.');
    await message.channel.setRateLimitPerUser(seconds);

    const embed = new EmbedBuilder()
      .setColor('#ff9ecf')
      .setAuthor({
        name: 'Lily',
        iconURL: message.client.user.displayAvatarURL()
      })
      .setDescription(
`╭─────────────୨୧
> 🐢 Slowmode Updated
> ⏱️ Delay: \`${seconds}s\`
> 🌸 Channel settings updated
╰─────────────୨୧`
      );

    await message.reply({ embeds: [embed] });
  }
};

// ── PRESERVED UTILITY COMMANDS ───────────────────────────────────────────────

const pingCommand = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Displays bot latency.'),

  async executeSlash(interaction) {
    const ping = interaction.client.ws.ping;
    const embed = new EmbedBuilder()
      .setColor('#ff9ecf')
      .setDescription(
`╭─────────────୨୧
> 🏓 Ping: \`${ping}ms\`
> 🌸 Status: Online
> ⚡ API: Responsive
╰─────────────୨୧`
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },

  async executePrefix(message) {
    const ping = message.client.ws.ping;
    const embed = new EmbedBuilder()
      .setColor('#ff9ecf')
      .setDescription(
`╭─────────────୨୧
> 🏓 Ping: \`${ping}ms\`
> 🌸 Status: Online
> ⚡ API: Responsive
╰─────────────୨୧`
      )
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  }
};

const membercountCommand = {
  data: new SlashCommandBuilder()
    .setName('membercount')
    .setDescription('Displays the server member count.'),

  async executeSlash(interaction) {
    await interaction.reply(`👥 Members: **${interaction.guild.memberCount}**`);
  },

  async executePrefix(message) {
    await message.reply(`👥 Members: **${message.guild.memberCount}**`);
  }
};

// ── CENTRAL EXPORT LIST ──────────────────────────────────────────────────────
export const commandsList = [
  // Preserved mod/utility
  kickCommand,
  banCommand,
  timeoutCommand,
  untimeoutCommand,
  purgeCommand,
  lockCommand,
  unlockCommand,
  slowmodeCommand,
  pingCommand,
  membercountCommand,

  // New Utility
  avatarCommand,
  bannerCommand,
  userinfoCommand,
  serverinfoCommand,
  roleinfoCommand,
  emojiinfoCommand,
  timestampCommand,
  pollCommand,
  remindCommand,
  translateCommand,

  // New Moderation
  warnCommand,
  warningsCommand,
  unwarnCommand,
  nicknameCommand,
  modlogsCommand,

  // New Leveling
  rankCommand,
  leaderboardCommand,
  levelrolesCommand,
  setxpCommand,
  resetxpCommand,
  levelcardCommand,

  // New Economy
  dailyCommand,
  workCommand,
  crimeCommand,
  robCommand,
  shopCommand,
  inventoryCommand,
  giveCommand,
  gambleCommand,

  // New Fun
  shipCommand,
  eightBallCommand,
  memeCommand,
  coinflipCommand,
  diceCommand,
  catCommand,
  dogCommand,
  wouldyouratherCommand,
  factCommand,

  // New Profiles / Achievements / Systems
  profilecardCommand,
  profileCommand,
  achievementsCommand,
  petCommand,
  gardenCommand,
  focusCommand,
  fortuneCommand,
  quoteCommand,
  quoteContextMenuCommand
];