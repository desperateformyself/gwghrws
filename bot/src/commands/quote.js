import { 
  SlashCommandBuilder, 
  ContextMenuCommandBuilder, 
  ApplicationCommandType, 
  AttachmentBuilder, 
  ChannelType
} from 'discord.js';
import { createQuoteImage } from '../utils/quoteImage.js';

export const quoteCommand = {
  data: new SlashCommandBuilder()
    .setName('quote')
    .setDescription('Generate a beautiful image quote of a message.')
    .addStringOption(option => 
      option.setName('message_id')
        .setDescription('The ID of the message to quote')
        .setRequired(true)
    )
    .addChannelOption(option => 
      option.setName('channel')
        .setDescription('The channel the message is in (defaults to current channel)')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    ),

  async executeSlash(interaction) {
    const messageId = interaction.options.getString('message_id');
    const channel = interaction.options.getChannel('channel') || interaction.channel;

    await interaction.deferReply();

    try {
      const targetMsg = await channel.messages.fetch(messageId).catch(() => null);
      if (!targetMsg) {
        return interaction.editReply({ content: '❌ Message not found. Make sure the ID is correct and I have read permissions in that channel.' });
      }

      // Check if message content is empty but has attachments/embeds
      const quoteText = targetMsg.content || '[Attached Media or Embed]';
      const avatarUrl = targetMsg.author.displayAvatarURL({ extension: 'png', size: 256 });
      const username = targetMsg.author.username;
      const userId = targetMsg.author.id;
      const timestamp = targetMsg.createdTimestamp;

      const buffer = await createQuoteImage(avatarUrl, username, userId, timestamp, quoteText);
      const attachment = new AttachmentBuilder(buffer, { name: 'quote.png' });

      await interaction.editReply({ files: [attachment] });
    } catch (err) {
      console.error('Error generating slash quote image:', err);
      await interaction.editReply({ content: '⚠️ An error occurred while generating the quote image.' });
    }
  }
};

export const quoteContextMenuCommand = {
  data: new ContextMenuCommandBuilder()
    .setName('Quote')
    .setType(ApplicationCommandType.Message),

  async executeContextMenu(interaction) {
    await interaction.deferReply();

    try {
      const targetMsg = interaction.targetMessage;
      if (!targetMsg) {
        return interaction.editReply({ content: '❌ Could not retrieve target message details.' });
      }

      const quoteText = targetMsg.content || '[Attached Media or Embed]';
      const avatarUrl = targetMsg.author.displayAvatarURL({ extension: 'png', size: 256 });
      const username = targetMsg.author.username;
      const userId = targetMsg.author.id;
      const timestamp = targetMsg.createdTimestamp;

      const buffer = await createQuoteImage(avatarUrl, username, userId, timestamp, quoteText);
      const attachment = new AttachmentBuilder(buffer, { name: 'quote.png' });

      await interaction.editReply({ files: [attachment] });
    } catch (err) {
      console.error('Error generating context menu quote image:', err);
      await interaction.editReply({ content: '⚠️ An error occurred while generating the context-menu quote.' });
    }
  }
};
