import { db } from '../db.js';
import * as schema from '../schema.js';
import { lte, eq } from 'drizzle-orm';
import { EmbedBuilder } from 'discord.js';

export async function checkReminders(client) {
  const now = new Date();
  
  try {
    // Select reminders where dueAt <= current ISO time string
    const dueReminders = await db.select()
      .from(schema.reminders)
      .where(lte(schema.reminders.dueAt, now.toISOString()));

    for (const reminder of dueReminders) {
      try {
        const user = await client.users.fetch(reminder.userId).catch(() => null);
        const channel = await client.channels.fetch(reminder.channelId).catch(() => null);

        if (user) {
          const embed = new EmbedBuilder()
            .setColor('#ff9ecf')
            .setTitle('🔔 Reminder Alert!')
            .setDescription(
`╭─────────────୨୧
> 🌸 **Hey <@${reminder.userId}>!**
> 📝 **You asked me to remind you:**
> \`\`\`${reminder.message}\`\`\`
╰─────────────୨୧`
            )
            .setTimestamp(new Date(reminder.createdAt))
            .setFooter({ text: `Set at`, iconURL: client.user.displayAvatarURL() });

          // Try sending to the channel, fallback to DM
          if (channel) {
            await channel.send({ content: `<@${reminder.userId}>`, embeds: [embed] });
          } else {
            await user.send({ embeds: [embed] }).catch(() => null);
          }
        }
      } catch (err) {
        console.error(`Error sending reminder #${reminder.id}:`, err);
      }

      // Delete sent reminder
      await db.delete(schema.reminders).where(eq(schema.reminders.id, reminder.id));
    }
  } catch (error) {
    console.error('Error checking reminders:', error);
  }
}
