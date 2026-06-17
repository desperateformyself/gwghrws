import {
  SlashCommandBuilder,
  EmbedBuilder
} from 'discord.js';
import { db } from '../db.js';
import * as schema from '../schema.js';
import { eq, and, sql } from 'drizzle-orm';
import { unlockAchievement } from '../systems/achievements.js';

// Shop Items Registry
export const shopItems = {
  seed_rose: { name: '🌹 Rose Seed', cost: 50, type: 'seed', desc: 'Plant in your garden. Sells for 120 coins.' },
  seed_tulip: { name: '🌷 Tulip Seed', cost: 80, type: 'seed', desc: 'Plant in your garden. Sells for 200 coins.' },
  seed_sunflower: { name: '🌻 Sunflower Seed', cost: 150, type: 'seed', desc: 'Plant in your garden. Sells for 400 coins.' },
  pet_food: { name: '🍖 Pet Food', cost: 30, type: 'pet', desc: 'Feed your pet. Restores +30 hunger.' },
  pet_toy: { name: '🧶 Pet Yarn Toy', cost: 60, type: 'pet', desc: 'Play with your pet. Restores +30 happiness.' }
};

// Helper to fetch or create economy record
export async function getEconomy(userId, guildId) {
  let record = await db.select()
    .from(schema.userEconomy)
    .where(and(eq(schema.userEconomy.userId, userId), eq(schema.userEconomy.guildId, guildId)))
    .then(res => res[0]);

  if (!record) {
    await db.insert(schema.userEconomy).values({
      userId,
      guildId,
      balance: 100, // starting gift
      bank: 0
    });
    record = { userId, guildId, balance: 100, bank: 0, lastDaily: null, lastWork: null, lastCrime: null, lastRob: null };
  }
  return record;
}

// Check and award economy milestones
async function checkEconMilestones(client, userId, guildId, channel) {
  const econ = await getEconomy(userId, guildId);
  if (econ.balance + econ.bank >= 10000) {
    await unlockAchievement(client, userId, guildId, 'economy_10k', channel);
  }
}

// ── 1. DAILY COMMAND ─────────────────────────────────────────────────────────
export const dailyCommand = {
  data: new SlashCommandBuilder()
    .setName('daily')
    .setDescription('Claim your daily reward of 200 coins.'),

  async executeSlash(interaction) {
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;
    const now = new Date();

    const econ = await getEconomy(userId, guildId);
    const lastDailyDate = econ.lastDaily ? new Date(econ.lastDaily) : null;

    if (lastDailyDate && (now - lastDailyDate < 86400000)) {
      const remainingMs = 86400000 - (now - lastDailyDate);
      const hours = Math.floor(remainingMs / (3600000));
      const minutes = Math.floor((remainingMs % 3600000) / 60000);
      return interaction.reply({ content: `⏳ You have already claimed your daily reward! Try again in **${hours}h ${minutes}m**.`, ephemeral: true });
    }

    const reward = 200;
    await db.update(schema.userEconomy)
      .set({
        balance: econ.balance + reward,
        lastDaily: now.toISOString()
      })
      .where(and(eq(schema.userEconomy.userId, userId), eq(schema.userEconomy.guildId, guildId)));

    await checkEconMilestones(interaction.client, userId, guildId, interaction.channel);
    await unlockAchievement(interaction.client, userId, guildId, 'daily_streak_3', interaction.channel);

    const embed = new EmbedBuilder()
      .setColor('#ff9ecf')
      .setTitle('🎁 Daily Coins Claimed')
      .setDescription(
`╭─────────────୨୧
> 🌸 **Hey ${interaction.user.username}!**
> 💰 You claimed your daily **200 coins**!
> 💳 New Wallet Balance: **${econ.balance + reward} coins**
╰─────────────୨୧`
      )
      .setTimestamp()
      .setFooter({ text: interaction.client.user.username, iconURL: interaction.client.user.displayAvatarURL() });

    await interaction.reply({ embeds: [embed] });
  },

  async executePrefix(message) {
    const userId = message.author.id;
    const guildId = message.guild.id;
    const now = new Date();

    const econ = await getEconomy(userId, guildId);
    const lastDailyDate = econ.lastDaily ? new Date(econ.lastDaily) : null;

    if (lastDailyDate && (now - lastDailyDate < 86400000)) {
      const remainingMs = 86400000 - (now - lastDailyDate);
      const hours = Math.floor(remainingMs / (3600000));
      const minutes = Math.floor((remainingMs % 3600000) / 60000);
      return message.reply(`⏳ Already claimed! Try again in **${hours}h ${minutes}m**.`);
    }

    const reward = 200;
    await db.update(schema.userEconomy)
      .set({
        balance: econ.balance + reward,
        lastDaily: now.toISOString()
      })
      .where(and(eq(schema.userEconomy.userId, userId), eq(schema.userEconomy.guildId, guildId)));

    await checkEconMilestones(message.client, userId, guildId, message.channel);
    await unlockAchievement(message.client, userId, guildId, 'daily_streak_3', message.channel);

    await message.reply(`🎁 Daily claimed! **+200 coins** added to wallet. Balance: **${econ.balance + reward}**.`);
  }
};

// ── 2. WORK COMMAND ──────────────────────────────────────────────────────────
export const workCommand = {
  data: new SlashCommandBuilder()
    .setName('work')
    .setDescription('Work to earn coins (cooldown: 1 hour).'),

  async executeSlash(interaction) {
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;
    const now = new Date();

    const econ = await getEconomy(userId, guildId);
    const lastWorkDate = econ.lastWork ? new Date(econ.lastWork) : null;

    if (lastWorkDate && (now - lastWorkDate < 3600000)) {
      const remainingMs = 3600000 - (now - lastWorkDate);
      const minutes = Math.floor(remainingMs / 60000);
      const seconds = Math.floor((remainingMs % 60000) / 1000);
      return interaction.reply({ content: `⏳ You are too tired to work! Sleep for **${minutes}m ${seconds}s** before working.`, ephemeral: true });
    }

    const earnings = Math.floor(Math.random() * 151) + 50; // 50 to 200
    const jobs = ['Florist', 'Baker', 'Cafe Hostess', 'Discord Mod', 'Gardener', 'Artist'];
    const job = jobs[Math.floor(Math.random() * jobs.length)];

    await db.update(schema.userEconomy)
      .set({
        balance: econ.balance + earnings,
        lastWork: now.toISOString()
      })
      .where(and(eq(schema.userEconomy.userId, userId), eq(schema.userEconomy.guildId, guildId)));

    await checkEconMilestones(interaction.client, userId, guildId, interaction.channel);

    const embed = new EmbedBuilder()
      .setColor('#ff9ecf')
      .setTitle('💼 Shift Complete')
      .setDescription(
`╭─────────────୨୧
> 🌸 You worked as a **${job}**!
> 💰 You earned **${earnings} coins**!
> 💳 New Wallet Balance: **${econ.balance + earnings} coins**
╰─────────────୨୧`
      )
      .setTimestamp()
      .setFooter({ text: interaction.client.user.username, iconURL: interaction.client.user.displayAvatarURL() });

    await interaction.reply({ embeds: [embed] });
  },

  async executePrefix(message) {
    const userId = message.author.id;
    const guildId = message.guild.id;
    const now = new Date();

    const econ = await getEconomy(userId, guildId);
    const lastWorkDate = econ.lastWork ? new Date(econ.lastWork) : null;

    if (lastWorkDate && (now - lastWorkDate < 3600000)) {
      const remainingMs = 3600000 - (now - lastWorkDate);
      return message.reply(`⏳ You're tired. Wait **${Math.floor(remainingMs / 60000)}m**.`);
    }

    const earnings = Math.floor(Math.random() * 151) + 50;
    await db.update(schema.userEconomy)
      .set({
        balance: econ.balance + earnings,
        lastWork: now.toISOString()
      })
      .where(and(eq(schema.userEconomy.userId, userId), eq(schema.userEconomy.guildId, guildId)));

    await message.reply(`💼 Work completed! You earned **${earnings} coins**.`);
  }
};

// ── 3. CRIME COMMAND ─────────────────────────────────────────────────────────
export const crimeCommand = {
  data: new SlashCommandBuilder()
    .setName('crime')
    .setDescription('Commit a high-risk crime to earn coins (cooldown: 2 hours).'),

  async executeSlash(interaction) {
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;
    const now = new Date();

    const econ = await getEconomy(userId, guildId);
    const lastCrimeDate = econ.lastCrime ? new Date(econ.lastCrime) : null;

    if (lastCrimeDate && (now - lastCrimeDate < 7200000)) {
      const remainingMs = 7200000 - (now - lastCrimeDate);
      return interaction.reply({ content: `⏳ The police are looking for you! Lay low for **${Math.floor(remainingMs / 60000)} minutes**.`, ephemeral: true });
    }

    const success = Math.random() > 0.5;
    let description = '';
    let netBalance = econ.balance;

    if (success) {
      const reward = Math.floor(Math.random() * 201) + 100; // 100 - 300
      netBalance += reward;
      description = `╭─────────────୨୧\n> 💰 **Success!** You pickpocketed a rich merchant!\n> Earned **${reward} coins**!\n╰─────────────୨୧`;
    } else {
      const penalty = Math.floor(Math.random() * 101) + 50; // 50 - 150
      netBalance = Math.max(0, netBalance - penalty);
      description = `╭─────────────୨୧\n> 🚔 **Caught!** You got caught shoplifting!\n> Fined **${penalty} coins**!\n╰─────────────୨୧`;
    }

    await db.update(schema.userEconomy)
      .set({
        balance: netBalance,
        lastCrime: now.toISOString()
      })
      .where(and(eq(schema.userEconomy.userId, userId), eq(schema.userEconomy.guildId, guildId)));

    await checkEconMilestones(interaction.client, userId, guildId, interaction.channel);

    const embed = new EmbedBuilder()
      .setColor('#ff9ecf')
      .setTitle('⚔️ Crime Report')
      .setDescription(description)
      .setTimestamp()
      .setFooter({ text: `New Wallet: ${netBalance} coins`, iconURL: interaction.client.user.displayAvatarURL() });

    await interaction.reply({ embeds: [embed] });
  },

  async executePrefix(message) {
    const userId = message.author.id;
    const guildId = message.guild.id;
    const now = new Date();

    const econ = await getEconomy(userId, guildId);
    const lastCrimeDate = econ.lastCrime ? new Date(econ.lastCrime) : null;

    if (lastCrimeDate && (now - lastCrimeDate < 7200000)) {
      return message.reply('⏳ Lay low for a bit. Cooldown active.');
    }

    const success = Math.random() > 0.5;
    if (success) {
      const reward = Math.floor(Math.random() * 201) + 100;
      await db.update(schema.userEconomy)
        .set({ balance: econ.balance + reward, lastCrime: now.toISOString() })
        .where(and(eq(schema.userEconomy.userId, userId), eq(schema.userEconomy.guildId, guildId)));
      await message.reply(`💰 **Success!** You pulled off a heist and earned **${reward} coins**.`);
    } else {
      const penalty = Math.floor(Math.random() * 101) + 50;
      await db.update(schema.userEconomy)
        .set({ balance: Math.max(0, econ.balance - penalty), lastCrime: now.toISOString() })
        .where(and(eq(schema.userEconomy.userId, userId), eq(schema.userEconomy.guildId, guildId)));
      await message.reply(`🚔 **Caught!** You got fined **${penalty} coins**.`);
    }
  }
};

// ── 4. ROB COMMAND ───────────────────────────────────────────────────────────
export const robCommand = {
  data: new SlashCommandBuilder()
    .setName('rob')
    .setDescription("Attempts to rob another user's wallet coins (cooldown: 3 hours).")
    .addUserOption(option => option.setName('user').setDescription('Target user').setRequired(true)),

  async executeSlash(interaction) {
    const target = interaction.options.getUser('user');
    if (target.id === interaction.user.id) return interaction.reply({ content: '❌ You cannot rob yourself!', ephemeral: true });

    const userId = interaction.user.id;
    const guildId = interaction.guild.id;
    const now = new Date();

    const econ = await getEconomy(userId, guildId);
    const targetEcon = await getEconomy(target.id, guildId);

    const lastRobDate = econ.lastRob ? new Date(econ.lastRob) : null;
    if (lastRobDate && (now - lastRobDate < 10800000)) {
      const remainingMs = 10800000 - (now - lastRobDate);
      return interaction.reply({ content: `⏳ You need to lay low. Rob cooldown: **${Math.floor(remainingMs / 60000)} minutes**.`, ephemeral: true });
    }

    if (targetEcon.balance < 50) {
      return interaction.reply({ content: `❌ **${target.username}** is too poor to be worth robbing!`, ephemeral: true });
    }

    const success = Math.random() > 0.6; // 40% success rate
    let description = '';
    let myBalance = econ.balance;
    let targetBalance = targetEcon.balance;

    if (success) {
      const stolenPercent = Math.random() * 0.2 + 0.1; // 10% - 30%
      const stolen = Math.floor(targetBalance * stolenPercent);
      myBalance += stolen;
      targetBalance -= stolen;
      description = `╭─────────────୨୧\n> 🥷 **Successful Robbery!**\n> You robbed <@${target.id}> and stole **${stolen} coins**!\n╰─────────────୨୧`;
    } else {
      const fine = Math.floor(Math.random() * 101) + 100; // 100 - 200
      myBalance = Math.max(0, myBalance - fine);
      targetBalance += fine; // Fine goes to the target
      description = `╭─────────────୨୧\n> 🚔 **Failed Robbery!**\n> You tripped on a rock and paid **${fine} coins** in compensation to <@${target.id}>!\n╰─────────────୨୧`;
    }

    await db.update(schema.userEconomy)
      .set({ balance: myBalance, lastRob: now.toISOString() })
      .where(and(eq(schema.userEconomy.userId, userId), eq(schema.userEconomy.guildId, guildId)));

    await db.update(schema.userEconomy)
      .set({ balance: targetBalance })
      .where(and(eq(schema.userEconomy.userId, target.id), eq(schema.userEconomy.guildId, guildId)));

    await checkEconMilestones(interaction.client, userId, guildId, interaction.channel);

    const embed = new EmbedBuilder()
      .setColor('#ff9ecf')
      .setTitle('🥷 Robbery Details')
      .setDescription(description)
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },

  async executePrefix(message, args) {
    const target = message.mentions.users.first();
    if (!target) return message.reply('❌ Please mention a user to rob.');
    if (target.id === message.author.id) return message.reply('❌ Cannot rob yourself.');

    const userId = message.author.id;
    const guildId = message.guild.id;
    const now = new Date();

    const econ = await getEconomy(userId, guildId);
    const targetEcon = await getEconomy(target.id, guildId);

    const lastRobDate = econ.lastRob ? new Date(econ.lastRob) : null;
    if (lastRobDate && (now - lastRobDate < 10800000)) {
      return message.reply('⏳ Rob cooldown is active.');
    }

    if (targetEcon.balance < 50) return message.reply('❌ User is too poor.');

    const success = Math.random() > 0.6;
    if (success) {
      const stolen = Math.floor(targetEcon.balance * (Math.random() * 0.2 + 0.1));
      await db.update(schema.userEconomy).set({ balance: econ.balance + stolen, lastRob: now.toISOString() }).where(and(eq(schema.userEconomy.userId, userId), eq(schema.userEconomy.guildId, guildId)));
      await db.update(schema.userEconomy).set({ balance: targetEcon.balance - stolen }).where(and(eq(schema.userEconomy.userId, target.id), eq(schema.userEconomy.guildId, guildId)));
      await message.reply(`🥷 **Success!** You robbed **${stolen} coins** from **${target.username}**!`);
    } else {
      const fine = Math.floor(Math.random() * 101) + 100;
      await db.update(schema.userEconomy).set({ balance: Math.max(0, econ.balance - fine), lastRob: now.toISOString() }).where(and(eq(schema.userEconomy.userId, userId), eq(schema.userEconomy.guildId, guildId)));
      await db.update(schema.userEconomy).set({ balance: targetEcon.balance + fine }).where(and(eq(schema.userEconomy.userId, target.id), eq(schema.userEconomy.guildId, guildId)));
      await message.reply(`🚔 **Busted!** You paid **${fine} coins** in compensation to **${target.username}**.`);
    }
  }
};

// ── 5. SHOP COMMAND ──────────────────────────────────────────────────────────
export const shopCommand = {
  data: new SlashCommandBuilder()
    .setName('shop')
    .setDescription('Browse or purchase items from the shop.')
    .addSubcommand(sub => sub.setName('view').setDescription('View available shop items.'))
    .addSubcommand(sub =>
      sub.setName('buy')
        .setDescription('Buy an item from the shop.')
        .addStringOption(opt => opt.setName('item').setDescription('Item ID to buy').setRequired(true))
        .addIntegerOption(opt => opt.setName('amount').setDescription('Quantity to purchase').setRequired(false))
    ),

  async executeSlash(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'view') {
      const embed = new EmbedBuilder()
        .setColor('#ff9ecf')
        .setTitle('🌸 Lily Shop')
        .setDescription('Use `/shop buy [item_id]` to purchase.')
        .setTimestamp();

      for (const [key, item] of Object.entries(shopItems)) {
        embed.addFields({
          name: `${item.name} (\`${key}\`)`,
          value: `💰 Cost: **${item.cost} coins**\n📝 *${item.desc}*`,
          inline: false
        });
      }
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'buy') {
      const itemKey = interaction.options.getString('item');
      const amount = interaction.options.getInteger('amount') || 1;

      if (amount <= 0) return interaction.reply({ content: '❌ Invalid amount.', ephemeral: true });

      const item = shopItems[itemKey];
      if (!item) return interaction.reply({ content: '❌ Item not found in the shop.', ephemeral: true });

      const totalCost = item.cost * amount;
      const econ = await getEconomy(interaction.user.id, interaction.guild.id);

      if (econ.balance < totalCost) {
        return interaction.reply({ content: `❌ You do not have enough coins! Costs **${totalCost} coins** but you only have **${econ.balance}**.`, ephemeral: true });
      }

      // Update balance
      await db.update(schema.userEconomy)
        .set({ balance: econ.balance - totalCost })
        .where(and(eq(schema.userEconomy.userId, interaction.user.id), eq(schema.userEconomy.guildId, interaction.guild.id)));

      // Add to inventory
      const existingInv = await db.select()
        .from(schema.inventory)
        .where(and(
          eq(schema.inventory.userId, interaction.user.id),
          eq(schema.inventory.guildId, interaction.guild.id),
          eq(schema.inventory.itemKey, itemKey)
        ))
        .then(res => res[0]);

      if (existingInv) {
        await db.update(schema.inventory)
          .set({ quantity: existingInv.quantity + amount })
          .where(eq(schema.inventory.id, existingInv.id));
      } else {
        await db.insert(schema.inventory).values({
          userId: interaction.user.id,
          guildId: interaction.guild.id,
          itemKey,
          quantity: amount
        });
      }

      const embed = new EmbedBuilder()
        .setColor('#ff9ecf')
        .setDescription(
`╭─────────────୨୧
> ✅ Successfully purchased **${amount}x ${item.name}**!
> 💰 Total Cost: **${totalCost} coins**
> 💳 Remaining Wallet: **${econ.balance - totalCost} coins**
╰─────────────୨୧`
        );
      return interaction.reply({ embeds: [embed] });
    }
  },

  async executePrefix(message, args) {
    // Prefix lists the shop
    const embed = new EmbedBuilder()
      .setColor('#ff9ecf')
      .setTitle('🌸 Lily Shop')
      .setDescription('Use `,shop buy [item_id] [amount]` to purchase.')
      .setTimestamp();

    for (const [key, item] of Object.entries(shopItems)) {
      embed.addFields({
        name: `${item.name} (\`${key}\`)`,
        value: `💰 Cost: **${item.cost} coins**\n📝 *${item.desc}*`,
        inline: false
      });
    }

    if (args[0] === 'buy') {
      const itemKey = args[1];
      const amount = parseInt(args[2]) || 1;
      const item = shopItems[itemKey];

      if (!item) return message.reply('❌ Item not found.');
      const totalCost = item.cost * amount;
      const econ = await getEconomy(message.author.id, message.guild.id);

      if (econ.balance < totalCost) return message.reply('❌ Not enough coins.');

      await db.update(schema.userEconomy).set({ balance: econ.balance - totalCost }).where(and(eq(schema.userEconomy.userId, message.author.id), eq(schema.userEconomy.guildId, message.guild.id)));
      
      const existingInv = await db.select().from(schema.inventory).where(and(eq(schema.inventory.userId, message.author.id), eq(schema.inventory.guildId, message.guild.id), eq(schema.inventory.itemKey, itemKey))).then(res => res[0]);
      if (existingInv) {
        await db.update(schema.inventory).set({ quantity: existingInv.quantity + amount }).where(eq(schema.inventory.id, existingInv.id));
      } else {
        await db.insert(schema.inventory).values({ userId: message.author.id, guildId: message.guild.id, itemKey, quantity: amount });
      }

      return message.reply(`✅ Purchased **${amount}x ${item.name}** for **${totalCost} coins**.`);
    }

    await message.reply({ embeds: [embed] });
  }
};

// ── 6. INVENTORY COMMAND ─────────────────────────────────────────────────────
export const inventoryCommand = {
  data: new SlashCommandBuilder()
    .setName('inventory')
    .setDescription("View all items you currently own."),

  async executeSlash(interaction) {
    const inv = await db.select()
      .from(schema.inventory)
      .where(and(eq(schema.inventory.userId, interaction.user.id), eq(schema.inventory.guildId, interaction.guild.id)));

    const embed = new EmbedBuilder()
      .setColor('#ff9ecf')
      .setTitle(`🎒 ${interaction.user.username}'s Inventory`)
      .setTimestamp();

    const activeItems = inv.filter(i => i.quantity > 0);
    if (activeItems.length === 0) {
      embed.setDescription('╭─────────────୨୧\n> 🎒 Your inventory is empty.\n╰─────────────୨୧');
    } else {
      const invLines = activeItems.map(i => {
        const itemInfo = shopItems[i.itemKey] || { name: i.itemKey };
        return `> **${itemInfo.name}**: \`x${i.quantity}\``;
      }).join('\n');
      embed.setDescription(`╭─────────────୨୧\n${invLines}\n╰─────────────୨୧`);
    }

    await interaction.reply({ embeds: [embed] });
  },

  async executePrefix(message) {
    const inv = await db.select()
      .from(schema.inventory)
      .where(and(eq(schema.inventory.userId, message.author.id), eq(schema.inventory.guildId, message.guild.id)));

    const embed = new EmbedBuilder()
      .setColor('#ff9ecf')
      .setTitle(`🎒 ${message.author.username}'s Inventory`)
      .setTimestamp();

    const activeItems = inv.filter(i => i.quantity > 0);
    if (activeItems.length === 0) {
      embed.setDescription('╭─────────────୨୧\n> 🎒 Your inventory is empty.\n╰─────────────୨୧');
    } else {
      const invLines = activeItems.map(i => {
        const itemInfo = shopItems[i.itemKey] || { name: i.itemKey };
        return `> **${itemInfo.name}**: \`x${i.quantity}\``;
      }).join('\n');
      embed.setDescription(`╭─────────────୨୧\n${invLines}\n╰─────────────୨୧`);
    }

    await message.reply({ embeds: [embed] });
  }
};

// ── 7. PROFILE COMMAND ───────────────────────────────────────────────────────
export const profileCommand = {
  data: new SlashCommandBuilder()
    .setName('profile')
    .setDescription("View your detailed economy profile details.")
    .addUserOption(option => option.setName('user').setDescription('Target user').setRequired(false)),

  async executeSlash(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;
    const econ = await getEconomy(user.id, interaction.guild.id);

    const embed = new EmbedBuilder()
      .setColor('#ff9ecf')
      .setTitle(`💳 Balance Sheet: ${user.username}`)
      .setThumbnail(user.displayAvatarURL())
      .addFields(
        { name: '👛 Wallet Balance', value: `\`${econ.balance} coins\``, inline: true },
        { name: '🏦 Bank Deposit', value: `\`${econ.bank} coins\``, inline: true },
        { name: '💰 Net Assets', value: `\`${econ.balance + econ.bank} coins\``, inline: true }
      )
      .setTimestamp()
      .setFooter({ text: interaction.client.user.username, iconURL: interaction.client.user.displayAvatarURL() });

    await interaction.reply({ embeds: [embed] });
  },

  async executePrefix(message) {
    const user = message.mentions.users.first() || message.author;
    const econ = await getEconomy(user.id, message.guild.id);

    const embed = new EmbedBuilder()
      .setColor('#ff9ecf')
      .setTitle(`💳 Balance Sheet: ${user.username}`)
      .setThumbnail(user.displayAvatarURL())
      .addFields(
        { name: '👛 Wallet Balance', value: `\`${econ.balance} coins\``, inline: true },
        { name: '🏦 Bank Deposit', value: `\`${econ.bank} coins\``, inline: true },
        { name: '💰 Net Assets', value: `\`${econ.balance + econ.bank} coins\``, inline: true }
      )
      .setTimestamp()
      .setFooter({ text: message.client.user.username, iconURL: message.client.user.displayAvatarURL() });

    await message.reply({ embeds: [embed] });
  }
};

// ── 8. GIVE COMMAND ──────────────────────────────────────────────────────────
export const giveCommand = {
  data: new SlashCommandBuilder()
    .setName('give')
    .setDescription('Transfer coins to another user.')
    .addUserOption(option => option.setName('user').setDescription('Target user').setRequired(true))
    .addIntegerOption(option => option.setName('amount').setDescription('Coins amount to give').setRequired(true)),

  async executeSlash(interaction) {
    const target = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');

    if (target.id === interaction.user.id) return interaction.reply({ content: '❌ Cannot give coins to yourself.', ephemeral: true });
    if (amount <= 0) return interaction.reply({ content: '❌ Amount must be greater than zero.', ephemeral: true });

    const econ = await getEconomy(interaction.user.id, interaction.guild.id);
    if (econ.balance < amount) return interaction.reply({ content: '❌ Insufficient wallet balance.', ephemeral: true });

    const targetEcon = await getEconomy(target.id, interaction.guild.id);

    await db.update(schema.userEconomy)
      .set({ balance: econ.balance - amount })
      .where(and(eq(schema.userEconomy.userId, interaction.user.id), eq(schema.userEconomy.guildId, interaction.guild.id)));

    await db.update(schema.userEconomy)
      .set({ balance: targetEcon.balance + amount })
      .where(and(eq(schema.userEconomy.userId, target.id), eq(schema.userEconomy.guildId, interaction.guild.id)));

    await checkEconMilestones(interaction.client, target.id, interaction.guild.id, interaction.channel);

    const embed = new EmbedBuilder()
      .setColor('#ff9ecf')
      .setDescription(`╭─────────────୨୧\n> ✅ You sent **${amount} coins** to <@${target.id}>!\n╰─────────────୨୧`);
    await interaction.reply({ embeds: [embed] });
  },

  async executePrefix(message, args) {
    const target = message.mentions.users.first();
    const amount = parseInt(args[1]);

    if (!target || isNaN(amount) || amount <= 0) {
      return message.reply('❌ Syntax: `,give @user [amount]`');
    }
    if (target.id === message.author.id) return message.reply('❌ Cannot give to yourself.');

    const econ = await getEconomy(message.author.id, message.guild.id);
    if (econ.balance < amount) return message.reply('❌ Insufficient balance.');

    const targetEcon = await getEconomy(target.id, message.guild.id);

    await db.update(schema.userEconomy).set({ balance: econ.balance - amount }).where(and(eq(schema.userEconomy.userId, message.author.id), eq(schema.userEconomy.guildId, message.guild.id)));
    await db.update(schema.userEconomy).set({ balance: targetEcon.balance + amount }).where(and(eq(schema.userEconomy.userId, target.id), eq(schema.userEconomy.guildId, message.guild.id)));

    await message.reply(`✅ Sent **${amount} coins** to **${target.username}**.`);
  }
};

// ── 9. GAMBLE COMMAND ────────────────────────────────────────────────────────
export const gambleCommand = {
  data: new SlashCommandBuilder()
    .setName('gamble')
    .setDescription('Double or nothing slot machine / dice rolls.')
    .addSubcommand(sub =>
      sub.setName('slots')
        .setDescription('Spin the slot machine.')
        .addIntegerOption(opt => opt.setName('bet').setDescription('Amount to bet').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('dice')
        .setDescription('Roll a higher number than the bot.')
        .addIntegerOption(opt => opt.setName('bet').setDescription('Amount to bet').setRequired(true))
    ),

  async executeSlash(interaction) {
    const sub = interaction.options.getSubcommand();
    const bet = interaction.options.getInteger('bet');

    if (bet <= 0) return interaction.reply({ content: '❌ Bet must be positive.', ephemeral: true });

    const econ = await getEconomy(interaction.user.id, interaction.guild.id);
    if (econ.balance < bet) return interaction.reply({ content: '❌ You do not have enough coins in your wallet.', ephemeral: true });

    if (sub === 'slots') {
      const items = ['🍒', '🍋', '🍇', '💎', '🌸'];
      const s1 = items[Math.floor(Math.random() * items.length)];
      const s2 = items[Math.floor(Math.random() * items.length)];
      const s3 = items[Math.floor(Math.random() * items.length)];

      let win = false;
      let mult = 0;

      if (s1 === s2 && s2 === s3) {
        win = true;
        mult = s1 === '🌸' || s1 === '💎' ? 5 : 3;
      } else if (s1 === s2 || s2 === s3 || s1 === s3) {
        win = true;
        mult = 1.5;
      }

      let netBalance = econ.balance;
      let desc = '';

      if (win) {
        const reward = Math.floor(bet * mult);
        netBalance += reward;
        desc = `╭─────────────୨୧\n> 🎰 **[ ${s1} | ${s2} | ${s3} ]**\n> 🎉 **You Won!**\n> Payout: **+${reward} coins**\n╰─────────────୨୧`;
      } else {
        netBalance -= bet;
        desc = `╭─────────────୨୧\n> 🎰 **[ ${s1} | ${s2} | ${s3} ]**\n> 😭 **You Lost!**\n> Lost: **-${bet} coins**\n╰─────────────୨୧`;
      }

      await db.update(schema.userEconomy)
        .set({ balance: netBalance })
        .where(and(eq(schema.userEconomy.userId, interaction.user.id), eq(schema.userEconomy.guildId, interaction.guild.id)));

      await checkEconMilestones(interaction.client, interaction.user.id, interaction.guild.id, interaction.channel);

      const embed = new EmbedBuilder()
        .setColor('#ff9ecf')
        .setTitle('🎰 Slot Machine')
        .setDescription(desc)
        .setTimestamp()
        .setFooter({ text: `Balance: ${netBalance} coins`, iconURL: interaction.client.user.displayAvatarURL() });

      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'dice') {
      const playerRoll = Math.floor(Math.random() * 6) + 1;
      const botRoll = Math.floor(Math.random() * 6) + 1;

      let netBalance = econ.balance;
      let result = '';

      if (playerRoll > botRoll) {
        netBalance += bet;
        result = `🎉 **You Won!** You roll a **${playerRoll}** and I roll a **${botRoll}**! Earned **${bet} coins**!`;
      } else if (playerRoll < botRoll) {
        netBalance -= bet;
        result = `😭 **You Lost!** You roll a **${playerRoll}** and I roll a **${botRoll}**. Lost **${bet} coins**!`;
      } else {
        result = `🤝 **Tie!** We both roll a **${playerRoll}**. Coins refunded!`;
      }

      await db.update(schema.userEconomy)
        .set({ balance: netBalance })
        .where(and(eq(schema.userEconomy.userId, interaction.user.id), eq(schema.userEconomy.guildId, interaction.guild.id)));

      await checkEconMilestones(interaction.client, interaction.user.id, interaction.guild.id, interaction.channel);

      const embed = new EmbedBuilder()
        .setColor('#ff9ecf')
        .setTitle('🎲 Dice Roll')
        .setDescription(`╭─────────────୨୧\n> ${result}\n╰─────────────୨୧`)
        .setTimestamp()
        .setFooter({ text: `Balance: ${netBalance} coins`, iconURL: interaction.client.user.displayAvatarURL() });

      return interaction.reply({ embeds: [embed] });
    }
  },

  async executePrefix(message, args) {
    if (args.length < 2) return message.reply('❌ Syntax: `,gamble slots [bet]` or `,gamble dice [bet]`');
    const sub = args[0];
    const bet = parseInt(args[1]);

    if (isNaN(bet) || bet <= 0) return message.reply('❌ Bet must be positive.');

    const econ = await getEconomy(message.author.id, message.guild.id);
    if (econ.balance < bet) return message.reply('❌ Insufficient balance.');

    if (sub === 'slots') {
      const items = ['🍒', '🍋', '🍇', '💎', '🌸'];
      const s1 = items[Math.floor(Math.random() * items.length)];
      const s2 = items[Math.floor(Math.random() * items.length)];
      const s3 = items[Math.floor(Math.random() * items.length)];

      const win = (s1 === s2 && s2 === s3) || (s1 === s2 || s2 === s3 || s1 === s3);
      if (win) {
        const mult = (s1 === s2 && s2 === s3) ? 4 : 1.5;
        const reward = Math.floor(bet * mult);
        await db.update(schema.userEconomy).set({ balance: econ.balance + reward }).where(and(eq(schema.userEconomy.userId, message.author.id), eq(schema.userEconomy.guildId, message.guild.id)));
        return message.reply(`🎰 **[ ${s1} | ${s2} | ${s3} ]** You won **${reward} coins**!`);
      } else {
        await db.update(schema.userEconomy).set({ balance: econ.balance - bet }).where(and(eq(schema.userEconomy.userId, message.author.id), eq(schema.userEconomy.guildId, message.guild.id)));
        return message.reply(`🎰 **[ ${s1} | ${s2} | ${s3} ]** You lost **${bet} coins**.`);
      }
    }

    if (sub === 'dice') {
      const player = Math.floor(Math.random() * 6) + 1;
      const bot = Math.floor(Math.random() * 6) + 1;
      if (player > bot) {
        await db.update(schema.userEconomy).set({ balance: econ.balance + bet }).where(and(eq(schema.userEconomy.userId, message.author.id), eq(schema.userEconomy.guildId, message.guild.id)));
        return message.reply(`🎲 Roll **${player}** vs **${bot}**. You won **${bet} coins**!`);
      } else if (player < bot) {
        await db.update(schema.userEconomy).set({ balance: econ.balance - bet }).where(and(eq(schema.userEconomy.userId, message.author.id), eq(schema.userEconomy.guildId, message.guild.id)));
        return message.reply(`🎲 Roll **${player}** vs **${bot}**. You lost **${bet} coins**.`);
      } else {
        return message.reply(`🎲 Both rolled **${player}**. Tie!`);
      }
    }
  }
};
