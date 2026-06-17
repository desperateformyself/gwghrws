import {
  SlashCommandBuilder,
  EmbedBuilder
} from 'discord.js';
import { db } from '../db.js';
import * as schema from '../schema.js';
import { eq, and } from 'drizzle-orm';
import { getEconomy, shopItems } from './economy.js';

// Helper to fetch or create profile record
async function getProfile(userId, guildId) {
  let record = await db.select()
    .from(schema.userProfiles)
    .where(and(eq(schema.userProfiles.userId, userId), eq(schema.userProfiles.guildId, guildId)))
    .then(res => res[0]);

  if (!record) {
    await db.insert(schema.userProfiles).values({
      userId,
      guildId,
      bio: 'No bio set yet.',
      favoriteColor: '#ff9ecf',
      theme: 'pink',
      reputation: 0
    });
    record = { userId, guildId, bio: 'No bio set yet.', favoriteColor: '#ff9ecf', theme: 'pink', reputation: 0, lastRep: null };
  }
  return record;
}

// Map achievements to custom badges/emojis
const badgeMap = {
  first_message: '✨',
  level_10: '🎖️',
  level_25: '🏆',
  daily_streak_3: '🔥',
  economy_10k: '💰',
  voice_join: '🎙️',
  commands_50: '🤖'
};

// ── 1. PROFILE CARD COMMAND ──────────────────────────────────────────────────
export const profilecardCommand = {
  data: new SlashCommandBuilder()
    .setName('profilecard')
    .setDescription("View a user's customizable advanced profile card.")
    .addUserOption(option => option.setName('user').setDescription('Target user').setRequired(false)),

  async executeSlash(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;
    const guildId = interaction.guild.id;

    // Fetch Leveling Data
    const xpRecord = await db.select()
      .from(schema.userXp)
      .where(and(eq(schema.userXp.userId, user.id), eq(schema.userXp.guildId, guildId)))
      .then(res => res[0]) || { xp: 0, level: 0 };

    // Fetch Economy Data
    const econ = await getEconomy(user.id, guildId);

    // Fetch Profile details
    const profile = await getProfile(user.id, guildId);

    // Fetch Achievements
    const userAchievements = await db.select()
      .from(schema.achievements)
      .where(and(eq(schema.achievements.userId, user.id), eq(schema.achievements.guildId, guildId)));

    // Generate badge string
    const badges = userAchievements.map(a => badgeMap[a.achievementKey]).filter(Boolean).join(' ') || 'None yet';

    const embed = new EmbedBuilder()
      .setColor(profile.favoriteColor)
      .setTitle(`🌸 ${user.username}'s Profile Card`)
      .setThumbnail(user.displayAvatarURL())
      .addFields(
        { name: '✨ Achievements & Badges', value: badges, inline: false },
        { name: '⭐ Level Stats', value: `Level **${xpRecord.level}** (${xpRecord.xp} XP)`, inline: true },
        { name: '💳 Coins Balance', value: `👛 **${econ.balance}** | 🏦 **${econ.bank}**`, inline: true },
        { name: '💖 Reputation', value: `**+${profile.reputation} rep**`, inline: true },
        { name: '📝 Biography', value: `\`\`\`${profile.bio}\`\`\``, inline: false }
      )
      .setTimestamp()
      .setFooter({ text: `Theme: ${profile.theme.toUpperCase()}`, iconURL: interaction.client.user.displayAvatarURL() });

    await interaction.reply({ embeds: [embed] });
  },

  async executePrefix(message, args) {
    const user = message.mentions.users.first() || message.author;
    const guildId = message.guild.id;

    const xpRecord = await db.select()
      .from(schema.userXp)
      .where(and(eq(schema.userXp.userId, user.id), eq(schema.userXp.guildId, guildId)))
      .then(res => res[0]) || { xp: 0, level: 0 };

    const econ = await getEconomy(user.id, guildId);
    const profile = await getProfile(user.id, guildId);
    const userAchievements = await db.select()
      .from(schema.achievements)
      .where(and(eq(schema.achievements.userId, user.id), eq(schema.achievements.guildId, guildId)));

    const badges = userAchievements.map(a => badgeMap[a.achievementKey]).filter(Boolean).join(' ') || 'None';

    const embed = new EmbedBuilder()
      .setColor(profile.favoriteColor)
      .setTitle(`🌸 ${user.username}'s Profile Card`)
      .setThumbnail(user.displayAvatarURL())
      .addFields(
        { name: '✨ Badges', value: badges, inline: false },
        { name: '⭐ Level', value: `Level **${xpRecord.level}**`, inline: true },
        { name: '💳 Balance', value: `Wallet: **${econ.balance}**`, inline: true },
        { name: '💖 Reputation', value: `**+${profile.reputation} rep**`, inline: true },
        { name: '📝 Bio', value: `*${profile.bio}*`, inline: false }
      )
      .setTimestamp()
      .setFooter({ text: message.client.user.username, iconURL: message.client.user.displayAvatarURL() });

    await message.reply({ embeds: [embed] });
  }
};

// ── 2. PROFILE CONFIG / REPUTATION COMMAND ───────────────────────────────────
export const profileCommand = {
  data: new SlashCommandBuilder()
    .setName('profile')
    .setDescription('Advanced customizable profile system subcommands.')
    .addSubcommand(sub =>
      sub.setName('view')
        .setDescription("View a user's wallet, bank balance, and items.")
        .addUserOption(opt => opt.setName('user').setDescription('Target user').setRequired(false))
    )
    .addSubcommandGroup(group =>
      group.setName('edit')
        .setDescription('Edit details on your profile card.')
        .addSubcommand(sub =>
          sub.setName('bio').setDescription('Set your biography text.').addStringOption(opt => opt.setName('text').setDescription('Bio text').setRequired(true))
        )
        .addSubcommand(sub =>
          sub.setName('color').setDescription('Set your favorite theme color.').addStringOption(opt => opt.setName('hex').setDescription('Hex color code (e.g. #ff9ecf)').setRequired(true))
        )
        .addSubcommand(sub =>
          sub.setName('theme').setDescription('Set profile layout theme color.').addStringOption(opt => opt.setName('theme').setDescription('Theme (e.g. pink, dark, pastel)').setRequired(true))
        )
    )
    .addSubcommand(sub =>
      sub.setName('rep')
        .setDescription('Give a reputation point to another user.')
        .addUserOption(opt => opt.setName('user').setDescription('User to receive reputation').setRequired(true))
    ),

  async executeSlash(interaction) {
    const group = interaction.options.getSubcommandGroup();
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    if (sub === 'view') {
      const user = interaction.options.getUser('user') || interaction.user;
      const econ = await getEconomy(user.id, guildId);

      // Fetch items owned
      const inv = await db.select()
        .from(schema.inventory)
        .where(and(eq(schema.inventory.userId, user.id), eq(schema.inventory.guildId, guildId)));
      const activeItems = inv.filter(i => i.quantity > 0);
      const itemSummary = activeItems.map(i => {
        const info = shopItems[i.itemKey] || { name: i.itemKey };
        return `${info.name} (x${i.quantity})`;
      }).join(', ') || 'No items';

      const embed = new EmbedBuilder()
        .setColor('#ff9ecf')
        .setTitle(`👛 Economy Profile: ${user.username}`)
        .addFields(
          { name: '👛 Wallet Balance', value: `\`${econ.balance} coins\``, inline: true },
          { name: '🏦 Bank Deposit', value: `\`${econ.bank} coins\``, inline: true },
          { name: '💰 Net Assets', value: `\`${econ.balance + econ.bank} coins\``, inline: true },
          { name: '🎒 Inventory Items', value: itemSummary, inline: false }
        )
        .setTimestamp()
        .setFooter({ text: interaction.client.user.username, iconURL: interaction.client.user.displayAvatarURL() });

      return interaction.reply({ embeds: [embed] });
    }

    if (group === 'edit') {
      const myProfile = await getProfile(interaction.user.id, guildId);

      if (sub === 'bio') {
        const bioText = interaction.options.getString('text');
        if (bioText.length > 200) return interaction.reply({ content: '❌ Bio must be 200 characters or less.', ephemeral: true });

        await db.update(schema.userProfiles).set({ bio: bioText }).where(eq(schema.userProfiles.id, myProfile.id));
        return interaction.reply({ content: '✅ Bio updated successfully!', ephemeral: true });
      }

      if (sub === 'color') {
        const hex = interaction.options.getString('hex');
        const hexRegex = /^#([0-9a-fA-F]{3}){1,2}$/;
        if (!hexRegex.test(hex)) return interaction.reply({ content: '❌ Invalid Hex color code (example: `#ff9ecf`).', ephemeral: true });

        await db.update(schema.userProfiles).set({ favoriteColor: hex }).where(eq(schema.userProfiles.id, myProfile.id));
        return interaction.reply({ content: `✅ Favorite color updated to **${hex}**!`, ephemeral: true });
      }

      if (sub === 'theme') {
        const theme = interaction.options.getString('theme');
        await db.update(schema.userProfiles).set({ theme }).where(eq(schema.userProfiles.id, myProfile.id));
        return interaction.reply({ content: `✅ Theme updated to **${theme.toUpperCase()}**!`, ephemeral: true });
      }
    }

    if (sub === 'rep') {
      const targetUser = interaction.options.getUser('user');
      if (targetUser.id === interaction.user.id) return interaction.reply({ content: '❌ You cannot give reputation to yourself!', ephemeral: true });

      const now = new Date();
      const senderProfile = await getProfile(interaction.user.id, guildId);
      const lastRepDate = senderProfile.lastRep ? new Date(senderProfile.lastRep) : null;

      if (lastRepDate && (now - lastRepDate < 43200000)) { // 12 hours cooldown
        const remainingMs = 43200000 - (now - lastRepDate);
        const hours = Math.floor(remainingMs / 3600000);
        const minutes = Math.floor((remainingMs % 3600000) / 60000);
        return interaction.reply({ content: `⏳ You can give reputation again in **${hours}h ${minutes}m**.`, ephemeral: true });
      }

      const targetProfile = await getProfile(targetUser.id, guildId);

      await db.update(schema.userProfiles)
        .set({ reputation: targetProfile.reputation + 1 })
        .where(eq(schema.userProfiles.id, targetProfile.id));

      await db.update(schema.userProfiles)
        .set({ lastRep: now.toISOString() })
        .where(eq(schema.userProfiles.id, senderProfile.id));

      const embed = new EmbedBuilder()
        .setColor('#ff9ecf')
        .setDescription(`╭─────────────👑\n> 💖 <@${interaction.user.id}> gave a reputation point to <@${targetUser.id}>!\n╰─────────────👑`);
      return interaction.reply({ embeds: [embed] });
    }
  },

  async executePrefix(message, args) {
    if (args[0] === 'rep') {
      const targetUser = message.mentions.users.first();
      if (!targetUser) return message.reply('❌ Mention a user to give reputation.');
      if (targetUser.id === message.author.id) return message.reply('❌ Cannot rep yourself.');

      const now = new Date();
      const senderProfile = await getProfile(message.author.id, message.guild.id);
      const lastRepDate = senderProfile.lastRep ? new Date(senderProfile.lastRep) : null;

      if (lastRepDate && (now - lastRepDate < 43200000)) {
        return message.reply('⏳ Reputation cooldown active.');
      }

      const targetProfile = await getProfile(targetUser.id, message.guild.id);
      await db.update(schema.userProfiles).set({ reputation: targetProfile.reputation + 1 }).where(eq(schema.userProfiles.id, targetProfile.id));
      await db.update(schema.userProfiles).set({ lastRep: now.toISOString() }).where(eq(schema.userProfiles.id, senderProfile.id));

      return message.reply(`💖 Given +1 reputation to **${targetUser.username}**!`);
    }

    // Default prefix execution list balance details
    const econ = await getEconomy(message.author.id, message.guild.id);
    return message.reply(`👛 Wallet: **${econ.balance} coins** | 🏦 Bank: **${econ.bank} coins**`);
  }
};
