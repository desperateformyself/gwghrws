import {
  SlashCommandBuilder,
  EmbedBuilder
} from 'discord.js';
import { db } from '../db.js';
import * as schema from '../schema.js';
import { eq, and } from 'drizzle-orm';
import { getEconomy } from './economy.js';

// Seed Growth Stage Mapping
const stageNames = ['🌱 Seed', '🌿 Sprout', '🌸 Budding', '🌹 Mature'];
const stageEmojis = {
  seed_rose: ['🌱', '🌿', '🌸', '🌹'],
  seed_tulip: ['🌱', '🌿', '🌷', '🌷'],
  seed_sunflower: ['🌱', '🌿', '🌻', '🌻']
};

const harvestValues = {
  seed_rose: 120,
  seed_tulip: 200,
  seed_sunflower: 400
};

// Helper to fetch all plots (always returns an array of length 6)
async function getGarden(userId, guildId) {
  const plots = await db.select()
    .from(schema.garden)
    .where(and(eq(schema.garden.userId, userId), eq(schema.garden.guildId, guildId)));

  const gardenList = Array(6).fill(null).map((_, i) => ({
    plotIndex: i,
    plantType: null,
    growthStage: 0,
    lastWateredAt: null
  }));

  for (const plot of plots) {
    if (plot.plotIndex >= 0 && plot.plotIndex < 6) {
      gardenList[plot.plotIndex] = plot;
    }
  }

  return gardenList;
}

export const gardenCommand = {
  data: new SlashCommandBuilder()
    .setName('garden')
    .setDescription('Plant seeds, water flowers, and harvest crops for coins.')
    .addSubcommand(sub => sub.setName('view').setDescription('View your garden grid.'))
    .addSubcommand(sub =>
      sub.setName('plant')
        .setDescription('Plant a seed in a plot.')
        .addIntegerOption(opt => opt.setName('plot').setDescription('Plot index (1-6)').setRequired(true).addChoices(
          { name: 'Plot 1', value: 0 },
          { name: 'Plot 2', value: 1 },
          { name: 'Plot 3', value: 2 },
          { name: 'Plot 4', value: 3 },
          { name: 'Plot 5', value: 4 },
          { name: 'Plot 6', value: 5 }
        ))
        .addStringOption(opt => opt.setName('seed').setDescription('Seed type to plant').setRequired(true).addChoices(
          { name: '🌹 Rose Seed', value: 'seed_rose' },
          { name: '🌷 Tulip Seed', value: 'seed_tulip' },
          { name: '🌻 Sunflower Seed', value: 'seed_sunflower' }
        ))
    )
    .addSubcommand(sub =>
      sub.setName('water')
        .setDescription('Water a plant in a plot.')
        .addIntegerOption(opt => opt.setName('plot').setDescription('Plot index (1-6)').setRequired(true).addChoices(
          { name: 'Plot 1', value: 0 },
          { name: 'Plot 2', value: 1 },
          { name: 'Plot 3', value: 2 },
          { name: 'Plot 4', value: 3 },
          { name: 'Plot 5', value: 4 },
          { name: 'Plot 6', value: 5 }
        ))
    )
    .addSubcommand(sub =>
      sub.setName('harvest')
        .setDescription('Harvest a mature flower for coins.')
        .addIntegerOption(opt => opt.setName('plot').setDescription('Plot index (1-6)').setRequired(true).addChoices(
          { name: 'Plot 1', value: 0 },
          { name: 'Plot 2', value: 1 },
          { name: 'Plot 3', value: 2 },
          { name: 'Plot 4', value: 3 },
          { name: 'Plot 5', value: 4 },
          { name: 'Plot 6', value: 5 }
        ))
    )
    .addSubcommand(sub => sub.setName('inventory').setDescription('Check your seeds inventory.')),

  async executeSlash(interaction) {
    const sub = interaction.options.getSubcommand();
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;

    if (sub === 'view') {
      const plots = await getGarden(userId, guildId);

      const embed = new EmbedBuilder()
        .setColor('#ff9ecf')
        .setTitle(`🏡 ${interaction.user.username}'s Garden`)
        .setDescription('Use `/garden plant`, `/garden water`, and `/garden harvest` to manage your plots.')
        .setTimestamp();

      for (const plot of plots) {
        let plotDesc = '🟫 **Empty Plot**\n*Ready for planting!*';
        if (plot.plantType) {
          const emojis = stageEmojis[plot.plantType] || ['🌱', '🌿', ' Bud', '🌹'];
          const stageEmoji = emojis[plot.growthStage];
          const name = plot.plantType.replace('seed_', '').toUpperCase();
          plotDesc = `${stageEmoji} **${name}**\nStage: **${stageNames[plot.growthStage]}**`;
          if (plot.growthStage < 3) {
            plotDesc += `\n💧 *Water to help it grow!*`;
          } else {
            plotDesc += `\n✨ **Ready to harvest!**`;
          }
        }
        embed.addFields({ name: `🌸 Plot #${plot.plotIndex + 1}`, value: plotDesc, inline: true });
      }

      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'plant') {
      const plotIndex = interaction.options.getInteger('plot');
      const seedType = interaction.options.getString('seed');

      const plots = await getGarden(userId, guildId);
      const targetPlot = plots[plotIndex];

      if (targetPlot && targetPlot.plantType) {
        return interaction.reply({ content: `❌ Plot #${plotIndex + 1} is already occupied by a **${targetPlot.plantType.replace('seed_', '')}**!`, ephemeral: true });
      }

      // Check seed inventory
      const seed = await db.select()
        .from(schema.inventory)
        .where(and(eq(schema.inventory.userId, userId), eq(schema.inventory.guildId, guildId), eq(schema.inventory.itemKey, seedType)))
        .then(res => res[0]);

      if (!seed || seed.quantity <= 0) {
        return interaction.reply({ content: `❌ You do not have any seeds of type **${seedType.replace('seed_', '')}**! Buy some in the \`/shop\`.`, ephemeral: true });
      }

      // Deduct seed
      await db.update(schema.inventory)
        .set({ quantity: seed.quantity - 1 })
        .where(eq(schema.inventory.id, seed.id));

      // Plant in garden table
      const existingDbRecord = await db.select()
        .from(schema.garden)
        .where(and(eq(schema.garden.userId, userId), eq(schema.garden.guildId, guildId), eq(schema.garden.plotIndex, plotIndex)))
        .then(res => res[0]);

      if (existingDbRecord) {
        await db.update(schema.garden)
          .set({ plantType: seedType, growthStage: 0, lastWateredAt: new Date().toISOString() })
          .where(eq(schema.garden.id, existingDbRecord.id));
      } else {
        await db.insert(schema.garden).values({
          userId,
          guildId,
          plotIndex,
          plantType: seedType,
          growthStage: 0,
          lastWateredAt: new Date().toISOString()
        });
      }

      const name = seedType.replace('seed_', '').toUpperCase();
      const embed = new EmbedBuilder()
        .setColor('#ff9ecf')
        .setDescription(`╭─────────────👑\n> ✅ Planted a **${name} Seed** in Plot #${plotIndex + 1}!\n╰─────────────👑`);
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'water') {
      const plotIndex = interaction.options.getInteger('plot');
      const plots = await getGarden(userId, guildId);
      const plot = plots[plotIndex];

      if (!plot || !plot.plantType) {
        return interaction.reply({ content: `❌ There is nothing planted in Plot #${plotIndex + 1}!`, ephemeral: true });
      }

      if (plot.growthStage >= 3) {
        return interaction.reply({ content: `❌ The plant in Plot #${plotIndex + 1} is already fully mature! Use \`/garden harvest\`.`, ephemeral: true });
      }

      // Cooldown check (5 minutes)
      const now = new Date();
      const lastWatered = plot.lastWateredAt ? new Date(plot.lastWateredAt) : null;
      if (lastWatered && (now - lastWatered < 300000)) { // 5 mins
        const remainingMs = 300000 - (now - lastWatered);
        return interaction.reply({ content: `⏳ Plant has already been watered! Wait **${Math.floor(remainingMs / 1000)}s** before watering again.`, ephemeral: true });
      }

      // Increment growth stage
      const newStage = plot.growthStage + 1;
      const dbRecord = await db.select()
        .from(schema.garden)
        .where(and(eq(schema.garden.userId, userId), eq(schema.garden.guildId, guildId), eq(schema.garden.plotIndex, plotIndex)))
        .then(res => res[0]);

      await db.update(schema.garden)
        .set({ growthStage: newStage, lastWateredAt: now.toISOString() })
        .where(eq(schema.garden.id, dbRecord.id));

      const emojis = stageEmojis[plot.plantType] || ['🌱', '🌿', ' Bud', '🌹'];
      const nextEmoji = emojis[newStage];

      const embed = new EmbedBuilder()
        .setColor('#ff9ecf')
        .setDescription(`╭─────────────👑\n> 💦 You watered Plot #${plotIndex + 1}!\n> ${nextEmoji} Growth advanced to **${stageNames[newStage]}**!\n╰─────────────👑`);
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'harvest') {
      const plotIndex = interaction.options.getInteger('plot');
      const plots = await getGarden(userId, guildId);
      const plot = plots[plotIndex];

      if (!plot || !plot.plantType) {
        return interaction.reply({ content: `❌ There is nothing planted in Plot #${plotIndex + 1}!`, ephemeral: true });
      }

      if (plot.growthStage < 3) {
        return interaction.reply({ content: `❌ The plant in Plot #${plotIndex + 1} is not mature yet! Current stage: **${stageNames[plot.growthStage]}**.`, ephemeral: true });
      }

      const sellValue = harvestValues[plot.plantType] || 100;
      const econ = await getEconomy(userId, guildId);

      // Add coins
      await db.update(schema.userEconomy)
        .set({ balance: econ.balance + sellValue })
        .where(eq(schema.userEconomy.id, econ.id));

      // Reset plot
      const dbRecord = await db.select()
        .from(schema.garden)
        .where(and(eq(schema.garden.userId, userId), eq(schema.garden.guildId, guildId), eq(schema.garden.plotIndex, plotIndex)))
        .then(res => res[0]);

      await db.update(schema.garden)
        .set({ plantType: null, growthStage: 0, lastWateredAt: null })
        .where(eq(schema.garden.id, dbRecord.id));

      const name = plot.plantType.replace('seed_', '').toUpperCase();
      const embed = new EmbedBuilder()
        .setColor('#ff9ecf')
        .setDescription(
`╭─────────────👑
> 🎉 You harvested a beautiful **${name}**!
> 💰 Sold automatically for **${sellValue} coins**!
> 💳 Wallet Balance: **${econ.balance + sellValue} coins**
╰─────────────👑`
        );
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'inventory') {
      // List seeds owned
      const inv = await db.select()
        .from(schema.inventory)
        .where(and(eq(schema.inventory.userId, userId), eq(schema.inventory.guildId, guildId)));

      const seeds = inv.filter(i => i.itemKey.startsWith('seed_') && i.quantity > 0);

      const embed = new EmbedBuilder()
        .setColor('#ff9ecf')
        .setTitle('🎒 Seed Bag')
        .setTimestamp();

      if (seeds.length === 0) {
        embed.setDescription('╭─────────────👑\n> ❌ You have no seeds! Buy some in the `/shop`.\n╰─────────────👑');
      } else {
        const seedLines = seeds.map(s => `> **${s.itemKey.replace('seed_', '').toUpperCase()} Seed**: \`x${s.quantity}\``).join('\n');
        embed.setDescription(`╭─────────────👑\n${seedLines}\n╰─────────────👑`);
      }
      return interaction.reply({ embeds: [embed] });
    }
  },

  async executePrefix(message) {
    const plots = await getGarden(message.author.id, message.guild.id);
    const occupied = plots.filter(p => p.plantType).length;
    return message.reply(`🏡 **Garden grid**: You have **${occupied}/6** active plots. Manage them via `/garden`.`);
  }
};
