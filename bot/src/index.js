import 'dotenv/config';
import { 
  Client, 
  GatewayIntentBits, 
  Partials, 
  Collection, 
  EmbedBuilder, 
  Colors, 
  REST, 
  Routes, 
  ChannelType,
  AttachmentBuilder
} from 'discord.js';
import { commandsList } from './commands.js';
import { handleMessageXp } from './systems/levelSystem.js';
import { checkReminders } from './systems/reminderSystem.js';
import { unlockAchievement } from './systems/achievements.js';
import { createQuoteImage } from './utils/quoteImage.js';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.MessageContent, 
    GatewayIntentBits.GuildVoiceStates,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.GuildMember],
});

const PREFIX = ',';

// ── Command Loader ────────────────────────────────────────────────────────────
client.commands = new Collection();

for (const command of commandsList) {
  if (command.data && (command.executeSlash || command.executePrefix || command.executeContextMenu)) {
    client.commands.set(command.data.name, command);
  }
}

// ── Ready Event & Global Slash Registration ───────────────────────────────────
client.once('ready', async () => {
  console.log(`\n🟢 Bot is online! Logged in as: ${client.user.tag}`);

  try {
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    const slashCommandsJson = commandsList.map(cmd => cmd.data.toJSON());

    console.log('🔄 Registering slash commands with Discord API...');
    
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: slashCommandsJson }
    );
    
    console.log('✅ Slash commands successfully registered globally!\n');
  } catch (error) {
    console.error('❌ Error registering slash commands:', error);
  }

  // Start periodic reminders check (every 15 seconds)
  setInterval(() => {
    checkReminders(client);
  }, 15000);
});

// ── Voice State Update Event (Achievements & Focus) ───────────────────────────
client.on('voiceStateUpdate', async (oldState, newState) => {
  if (newState.member && newState.member.user.bot) return;

  // User joins voice channel
  if (!oldState.channelId && newState.channelId) {
    const textChannel = newState.guild.channels.cache.find(c => c.type === ChannelType.GuildText);
    await unlockAchievement(client, newState.member.id, newState.guild.id, 'voice_join', textChannel);
  }
});

// ── Interaction Handler (Slash Commands & Context Menus) ─────────────────────
client.on('interactionCreate', async (interaction) => {
  if (interaction.isChatInputCommand()) {
    console.log(`[SLASH] /${interaction.commandName} used by ${interaction.user.tag}`);
    const command = client.commands.get(interaction.commandName);
    if (!command || !command.executeSlash) return;

    try {
      await command.executeSlash(interaction);
    } catch (error) {
      console.error(`❌ Slash Command Error (${interaction.commandName}):`, error);
      const errorMsg = { content: '⚠️ There was an error executing this command.', ephemeral: true };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(errorMsg);
      } else {
        await interaction.reply(errorMsg);
      }
    }
  } else if (interaction.isMessageContextMenuCommand()) {
    console.log(`[CONTEXT MENU] ${interaction.commandName} used by ${interaction.user.tag}`);
    const command = client.commands.get(interaction.commandName);
    if (!command || !command.executeContextMenu) return;

    try {
      await command.executeContextMenu(interaction);
    } catch (error) {
      console.error(`❌ Context Menu Error (${interaction.commandName}):`, error);
      const errorMsg = { content: '⚠️ There was an error executing this context menu command.', ephemeral: true };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(errorMsg);
      } else {
        await interaction.reply(errorMsg);
      }
    }
  }
});

// ── Prefix Commands Handler & XP System ───────────────────────────────────────
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // Award XP for text message activity
  await handleMessageXp(message);

  // Check for Bot Mention + Quote Command Triggers
  const botMention = `<@${client.user.id}>`;
  const botNicknameMention = `<@!${client.user.id}>`;
  const isMentioned = message.content.includes(botMention) || message.content.includes(botNicknameMention);

  if (isMentioned && message.content.toLowerCase().includes('quote')) {
    let targetMsg = null;

    // Case 1: Quoting a replied message reference
    if (message.reference && message.reference.messageId) {
      targetMsg = await message.channel.messages.fetch(message.reference.messageId).catch(() => null);
    } 
    // Case 2: Quoting by parsing a specific message ID in text
    else {
      const msgIdMatch = message.content.match(/\b\d{17,20}\b/);
      if (msgIdMatch) {
        targetMsg = await message.channel.messages.fetch(msgIdMatch[0]).catch(() => null);
      }
    }

    if (targetMsg) {
      try {
        await message.channel.sendTyping();

        const quoteText = targetMsg.content || '[Attached Media or Embed]';
        const avatarUrl = targetMsg.author.displayAvatarURL({ extension: 'png', size: 256 });
        const username = targetMsg.author.username;
        const userId = targetMsg.author.id;
        const timestamp = targetMsg.createdTimestamp;

        const buffer = await createQuoteImage(avatarUrl, username, userId, timestamp, quoteText);
        const attachment = new AttachmentBuilder(buffer, { name: 'quote.png' });

        await message.reply({ files: [attachment] });
      } catch (err) {
        console.error('Error generating quote from mention trigger:', err);
        await message.reply('⚠️ Failed to generate quote image.');
      }
    } else {
      await message.reply('⚠️ Please either **reply** to the message you want to quote while mentioning me, or supply a valid **Message ID** (e.g. `@Lily quote [message_id]`).');
    }
    return; // Don't run prefix commands for this message
  }

  if (message.content.startsWith(PREFIX)) {
    console.log(`[PREFIX] Command detected: "${message.content}" from ${message.author.tag}`);
  }

  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();

  const command = client.commands.get(commandName);
  if (!command || !command.executePrefix) {
    console.log(`⚠️ Prefix command ",${commandName}" not found in commands list.`);
    return;
  }

  // Permission gate check for prefix execution
  if (command.permission && !message.member.permissions.has(command.permission)) {
    const noPermsEmbed = new EmbedBuilder()
      .setTitle('Access Denied')
      .setDescription('❌ You do not have permission to use this command.')
      .setColor(Colors.Red);
    return message.reply({ embeds: [noPermsEmbed] });
  }

  try {
    await command.executePrefix(message, args);
  } catch (error) {
    console.error(`❌ Prefix Command Error (${commandName}):`, error);
    message.reply('⚠️ There was an error executing that command.');
  }
});

// ── Login ─────────────────────────────────────────────────────────────────────
client.login(process.env.DISCORD_TOKEN);