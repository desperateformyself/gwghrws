import {
  SlashCommandBuilder,
  EmbedBuilder
} from 'discord.js';
import { db } from '../db.js';
import * as schema from '../schema.js';
import { eq, and } from 'drizzle-orm';

// Helper to make stats bar
function getProgressBar(val) {
  const filled = Math.min(10, Math.floor(val / 10));
  const empty = 10 - filled;
  return `\`[${'▰'.repeat(filled)}${'▱'.repeat(empty)}]\` **${val}/100**`;
}

// Helper to get or create pet record
async function getPet(userId, guildId) {
  return await db.select()
    .from(schema.pets)
    .where(and(eq(schema.pets.userId, userId), eq(schema.pets.guildId, guildId)))
    .then(res => res[0]);
}

export const petCommand = {
  data: new SlashCommandBuilder()
    .setName('pet')
    .setDescription('Adopt, interact, and check stats on your virtual server pet.')
    .addSubcommand(sub =>
      sub.setName('adopt')
        .setDescription('Adopt a pet!')
        .addStringOption(opt => opt.setName('type').setDescription('Pet type (e.g. cat, dog, bunny)').setRequired(true).addChoices(
          { name: '🐱 Cat', value: 'cat' },
          { name: '🐶 Dog', value: 'dog' },
          { name: '🐰 Bunny', value: 'bunny' }
        ))
        .addStringOption(opt => opt.setName('name').setDescription('Name your new pet').setRequired(true))
    )
    .addSubcommand(sub => sub.setName('stats').setDescription('Show your pet\'s statistics.'))
    .addSubcommand(sub => sub.setName('feed').setDescription('Feed your pet using 1x Pet Food.'))
    .addSubcommand(sub => sub.setName('play').setDescription('Play with your pet to raise happiness.'))
    .addSubcommand(sub =>
      sub.setName('rename')
        .setDescription('Rename your pet (costs 50 coins).')
        .addStringOption(opt => opt.setName('name').setDescription('New name').setRequired(true))
    ),

  async executeSlash(interaction) {
    const sub = interaction.options.getSubcommand();
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;

    if (sub === 'adopt') {
      const existing = await getPet(userId, guildId);
      if (existing) return interaction.reply({ content: `❌ You already have a pet named **${existing.name}**!`, ephemeral: true });

      const type = interaction.options.getString('type');
      const name = interaction.options.getString('name');

      await db.insert(schema.pets).values({
        userId,
        guildId,
        name,
        type,
        level: 1,
        experience: 0,
        hunger: 100,
        happiness: 100
      });

      const icon = type === 'cat' ? '🐱' : type === 'dog' ? '🐶' : '🐰';
      const embed = new EmbedBuilder()
        .setColor('#ff9ecf')
        .setTitle('🐾 Pet Adopted!')
        .setDescription(
`╭─────────────୨୧
> ${icon} You adopted a new **${type}**!
> 🏷️ **Name:** **${name}**
> 💖 Love them, feed them, and watch them grow!
╰─────────────୨୧`
        );
      return interaction.reply({ embeds: [embed] });
    }

    // All other subcommands require having a pet
    const pet = await getPet(userId, guildId);
    if (!pet) return interaction.reply({ content: '❌ You don\'t have a pet yet! Use `/pet adopt` to get one.', ephemeral: true });

    if (sub === 'stats') {
      const icon = pet.type === 'cat' ? '🐱' : pet.type === 'dog' ? '🐶' : '🐰';
      const nextLvlXp = pet.level * 100;

      const embed = new EmbedBuilder()
        .setColor('#ff9ecf')
        .setTitle(`${icon} ${pet.name}'s Stats`)
        .addFields(
          { name: '🐾 Species / Type', value: pet.type.toUpperCase(), inline: true },
          { name: '⭐ Pet Level', value: `Level **${pet.level}** (${pet.experience}/${nextLvlXp} XP)`, inline: true },
          { name: '🍖 Fullness / Hunger', value: getProgressBar(pet.hunger), inline: false },
          { name: '🧸 Happiness', value: getProgressBar(pet.happiness), inline: false }
        )
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'feed') {
      if (pet.hunger >= 100) return interaction.reply({ content: `❌ **${pet.name}** is already full!`, ephemeral: true });

      // Check food inventory
      const food = await db.select()
        .from(schema.inventory)
        .where(and(eq(schema.inventory.userId, userId), eq(schema.inventory.guildId, guildId), eq(schema.inventory.itemKey, 'pet_food')))
        .then(res => res[0]);

      if (!food || food.quantity <= 0) {
        return interaction.reply({ content: '❌ You do not have any **Pet Food**! Purchase some from the `/shop`.', ephemeral: true });
      }

      // Deduct food
      await db.update(schema.inventory)
        .set({ quantity: food.quantity - 1 })
        .where(eq(schema.inventory.id, food.id));

      // Update pet hunger & XP
      let newHunger = Math.min(100, pet.hunger + 30);
      let newXp = pet.experience + 20;
      let newLvl = pet.level;
      let leveledUp = false;

      if (newXp >= newLvl * 100) {
        newXp -= newLvl * 100;
        newLvl++;
        leveledUp = true;
      }

      await db.update(schema.pets)
        .set({ hunger: newHunger, experience: newXp, level: newLvl })
        .where(eq(schema.pets.id, pet.id));

      let desc = `╭─────────────୨୧\n> 🍖 You fed **${pet.name}** 1x Pet Food.\n> 💓 Hunger: **${newHunger}/100**\n`;
      if (leveledUp) desc += `> 🎉 **${pet.name}** leveled up to Level **${newLvl}**!\n`;
      desc += `╰─────────────୨୧`;

      const embed = new EmbedBuilder().setColor('#ff9ecf').setDescription(desc);
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'play') {
      if (pet.hunger <= 20) {
        return interaction.reply({ content: `❌ **${pet.name}** is too hungry to play! Feed them first.`, ephemeral: true });
      }

      let newHappiness = Math.min(100, pet.happiness + 30);
      let newHunger = Math.max(0, pet.hunger - 15);
      let newXp = pet.experience + 25;
      let newLvl = pet.level;
      let leveledUp = false;

      if (newXp >= newLvl * 100) {
        newXp -= newLvl * 100;
        newLvl++;
        leveledUp = true;
      }

      await db.update(schema.pets)
        .set({ happiness: newHappiness, hunger: newHunger, experience: newXp, level: newLvl })
        .where(eq(schema.pets.id, pet.id));

      let desc = `╭─────────────୨୧\n> 🧶 You played fetch with **${pet.name}**!\n> 😊 Happiness: **${newHappiness}/100**\n> 🍖 Hunger: **${newHunger}/100**\n`;
      if (leveledUp) desc += `> 🎉 **${pet.name}** leveled up to Level **${newLvl}**!\n`;
      desc += `╰─────────────୨୧`;

      const embed = new EmbedBuilder().setColor('#ff9ecf').setDescription(desc);
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'rename') {
      const newName = interaction.options.getString('name');

      // Deduct 50 coins from wallet
      const econ = await db.select()
        .from(schema.userEconomy)
        .where(and(eq(schema.userEconomy.userId, userId), eq(schema.userEconomy.guildId, guildId)))
        .then(res => res[0]);

      if (!econ || econ.balance < 50) {
        return interaction.reply({ content: '❌ Renaming your pet costs **50 coins** from your wallet.', ephemeral: true });
      }

      await db.update(schema.userEconomy)
        .set({ balance: econ.balance - 50 })
        .where(eq(schema.userEconomy.id, econ.id));

      await db.update(schema.pets)
        .set({ name: newName })
        .where(eq(schema.pets.id, pet.id));

      const embed = new EmbedBuilder()
        .setColor('#ff9ecf')
        .setDescription(`╭─────────────୨୧\n> 📝 Renamed your pet from **${pet.name}** to **${newName}**!\n> 💰 Fee: **50 coins**\n╰─────────────୨୧`);
      return interaction.reply({ embeds: [embed] });
    }
  },

  async executePrefix(message, args) {
    // Prefix execution default to stats
    const pet = await getPet(message.author.id, message.guild.id);
    if (!pet) return message.reply('❌ Adopt a pet first using `/pet adopt`!');

    return message.reply(`🐾 **Pet Status**: **${pet.name}** (Level ${pet.level}) • Hunger: **${pet.hunger}/100** • Happiness: **${pet.happiness}/100**`);
  }
};
