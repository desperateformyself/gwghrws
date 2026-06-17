import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from 'discord.js';

// Would You Rather Questions Registry
const wyrQuestions = [
  { a: 'Have the ability to fly but only at 5mph', b: 'Have the ability to teleport but only once a day' },
  { a: 'Be able to speak all human languages', b: 'Be able to speak to all animals' },
  { a: 'Live in a luxury mansion in the middle of nowhere', b: 'Live in a tiny apartment in the world\'s best city' },
  { a: 'Never have to sleep again without being tired', b: 'Never have to eat again while staying fully nourished' },
  { a: 'Always be 10 minutes late', b: 'Always be 20 minutes early' }
];

// ── 1. SHIP COMMAND ──────────────────────────────────────────────────────────
export const shipCommand = {
  data: new SlashCommandBuilder()
    .setName('ship')
    .setDescription('Calculates the love compatibility between two users.')
    .addUserOption(option => option.setName('user1').setDescription('First user').setRequired(true))
    .addUserOption(option => option.setName('user2').setDescription('Second user').setRequired(false)),

  async executeSlash(interaction) {
    const u1 = interaction.options.getUser('user1');
    const u2 = interaction.options.getUser('user2') || interaction.user;

    if (u1.id === u2.id) return interaction.reply({ content: '❌ Self-love is great, but shipping requires two distinct users!', ephemeral: true });

    // Consistent pseudo-random percentage based on user IDs
    const idSum = BigInt(u1.id) + BigInt(u2.id);
    const lovePercent = Number(idSum % 101n);

    // Progress bar for visual appeal
    const filledBars = Math.floor(lovePercent / 10);
    const emptyBars = 10 - filledBars;
    const progressStr = `❤️${'▰'.repeat(filledBars)}${'▱'.repeat(emptyBars)}🖤`;

    let loveMessage = '';
    if (lovePercent >= 80) loveMessage = '💞 Absolute Soulmates! Wedding bells are ringing!';
    else if (lovePercent >= 50) loveMessage = '🌸 Good match! There is definitely a spark here.';
    else if (lovePercent >= 20) loveMessage = '💔 Just friends. Keep looking!';
    else loveMessage = '❄️ Total mismatch. Ice-cold vibes.';

    const embed = new EmbedBuilder()
      .setColor('#ff9ecf')
      .setTitle('💕 Love Matchmaker')
      .setDescription(
`╭─────────────୨୧
> **Partners:** <@${u1.id}> & <@${u2.id}>
> **Score:** **${lovePercent}%**
> ${progressStr}
> 
> *${loveMessage}*
╰─────────────୨୧`
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },

  async executePrefix(message, args) {
    const u1 = message.mentions.users.first();
    const u2 = message.mentions.users.at(1) || message.author;

    if (!u1) return message.reply('❌ Please mention at least one user.');

    const idSum = BigInt(u1.id) + BigInt(u2.id);
    const lovePercent = Number(idSum % 101n);
    const progressStr = `❤️${'▰'.repeat(Math.floor(lovePercent / 10))}${'▱'.repeat(10 - Math.floor(lovePercent / 10))}🖤`;

    await message.reply(`💕 **Ship Matchmaker**:\nCompatibility for **${u1.username}** & **${u2.username}**: **${lovePercent}%**\n${progressStr}`);
  }
};

// ── 2. 8BALL COMMAND ─────────────────────────────────────────────────────────
export const eightBallCommand = {
  data: new SlashCommandBuilder()
    .setName('8ball')
    .setDescription('Ask the magic 8ball a question.')
    .addStringOption(option => option.setName('question').setDescription('Your question').setRequired(true)),

  async executeSlash(interaction) {
    const question = interaction.options.getString('question');
    const answers = [
      'It is certain.', 'Without a doubt.', 'Yes - definitely.', 'As I see it, yes.', 'Most likely.',
      'Reply hazy, try again.', 'Ask again later.', 'Better not tell you now.', 'Cannot predict now.',
      'Don\'t count on it.', 'My reply is no.', 'My sources say no.', 'Very doubtful.'
    ];

    const answer = answers[Math.floor(Math.random() * answers.length)];
    const embed = new EmbedBuilder()
      .setColor('#ff9ecf')
      .setTitle('🔮 Magic 8-Ball')
      .setDescription(
`╭─────────────୨୧
> ❓ **Question:** ${question}
> 🎱 **Answer:** ${answer}
╰─────────────୨୧`
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },

  async executePrefix(message, args) {
    const question = args.join(' ');
    if (!question) return message.reply('❌ Ask a question!');
    const answers = ['It is certain.', 'Yes.', 'Ask again later.', 'My sources say no.', 'Doubtful.'];
    const answer = answers[Math.floor(Math.random() * answers.length)];
    await message.reply(`🔮 **Magic 8-Ball**:\n🎱 **Answer**: ${answer}`);
  }
};

// ── 3. MEME COMMAND ──────────────────────────────────────────────────────────
export const memeCommand = {
  data: new SlashCommandBuilder()
    .setName('meme')
    .setDescription('Displays a random funny meme.'),

  async executeSlash(interaction) {
    await interaction.deferReply();
    try {
      const res = await fetch('https://meme-api.com/gimme');
      if (!res.ok) throw new Error('Failed to fetch meme');
      const data = await res.json();

      const embed = new EmbedBuilder()
        .setColor('#ff9ecf')
        .setTitle(data.title)
        .setURL(data.postLink)
        .setImage(data.url)
        .setFooter({ text: `r/${data.subreddit} | Poster: ${data.author}` });

      await interaction.editReply({ embeds: [embed] });
    } catch {
      await interaction.editReply('❌ Failed to fetch meme. API might be offline.');
    }
  },

  async executePrefix(message) {
    try {
      const res = await fetch('https://meme-api.com/gimme');
      const data = await res.json();
      const embed = new EmbedBuilder()
        .setColor('#ff9ecf')
        .setTitle(data.title)
        .setURL(data.postLink)
        .setImage(data.url);
      await message.reply({ embeds: [embed] });
    } catch {
      await message.reply('❌ Meme API currently unavailable.');
    }
  }
};

// ── 4. COINFLIP COMMAND ──────────────────────────────────────────────────────
export const coinflipCommand = {
  data: new SlashCommandBuilder()
    .setName('coinflip')
    .setDescription('Flips a coin.'),

  async executeSlash(interaction) {
    const side = Math.random() > 0.5 ? 'Heads' : 'Tails';
    const embed = new EmbedBuilder()
      .setColor('#ff9ecf')
      .setTitle('🪙 Coin Flip')
      .setDescription(
`╭─────────────୨୧
> The coin spins in the air...
> And lands on **${side}**!
╰─────────────୨୧`
      )
      .setTimestamp();
    await interaction.reply({ embeds: [embed] });
  },

  async executePrefix(message) {
    const side = Math.random() > 0.5 ? 'Heads' : 'Tails';
    await message.reply(`🪙 **Coin Flip**: Lands on **${side}**!`);
  }
};

// ── 5. DICE COMMAND ──────────────────────────────────────────────────────────
export const diceCommand = {
  data: new SlashCommandBuilder()
    .setName('dice')
    .setDescription('Rolls a dice.')
    .addIntegerOption(option => option.setName('sides').setDescription('Number of sides (default: 6)').setRequired(false)),

  async executeSlash(interaction) {
    const sides = interaction.options.getInteger('sides') || 6;
    if (sides < 2) return interaction.reply({ content: '❌ A dice must have at least 2 sides!', ephemeral: true });

    const roll = Math.floor(Math.random() * sides) + 1;
    const embed = new EmbedBuilder()
      .setColor('#ff9ecf')
      .setTitle('🎲 Dice Roll')
      .setDescription(
`╭─────────────୨୧
> You rolled a **${sides}-sided** dice...
> And got a **${roll}**!
╰─────────────୨୧`
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },

  async executePrefix(message, args) {
    const sides = parseInt(args[0]) || 6;
    if (sides < 2) return message.reply('❌ Min 2 sides.');
    const roll = Math.floor(Math.random() * sides) + 1;
    await message.reply(`🎲 **Dice Roll**: Rolled a **d${sides}** and got **${roll}**!`);
  }
};

// ── 6. CAT COMMAND ───────────────────────────────────────────────────────────
export const catCommand = {
  data: new SlashCommandBuilder()
    .setName('cat')
    .setDescription('Get a random cute cat image!'),

  async executeSlash(interaction) {
    await interaction.deferReply();
    try {
      const res = await fetch('https://api.thecatapi.com/v1/images/search');
      const data = await res.json();
      const url = data[0].url;

      const embed = new EmbedBuilder()
        .setColor('#ff9ecf')
        .setTitle('🐱 Meow!')
        .setImage(url)
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch {
      await interaction.editReply('❌ Failed to fetch cat picture.');
    }
  },

  async executePrefix(message) {
    try {
      const res = await fetch('https://api.thecatapi.com/v1/images/search');
      const data = await res.json();
      await message.reply(data[0].url);
    } catch {
      await message.reply('❌ Cat API unavailable.');
    }
  }
};

// ── 7. DOG COMMAND ───────────────────────────────────────────────────────────
export const dogCommand = {
  data: new SlashCommandBuilder()
    .setName('dog')
    .setDescription('Get a random cute dog image!'),

  async executeSlash(interaction) {
    await interaction.deferReply();
    try {
      const res = await fetch('https://dog.ceo/api/breeds/image/random');
      const data = await res.json();
      const url = data.message;

      const embed = new EmbedBuilder()
        .setColor('#ff9ecf')
        .setTitle('🐶 Woof!')
        .setImage(url)
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch {
      await interaction.editReply('❌ Failed to fetch dog picture.');
    }
  },

  async executePrefix(message) {
    try {
      const res = await fetch('https://dog.ceo/api/breeds/image/random');
      const data = await res.json();
      await message.reply(data.message);
    } catch {
      await message.reply('❌ Dog API unavailable.');
    }
  }
};

// ── 8. WOULDYOURATHER COMMAND ───────────────────────────────────────────────
export const wouldyouratherCommand = {
  data: new SlashCommandBuilder()
    .setName('wouldyourather')
    .setDescription('Presents an interactive Would You Rather question.'),

  async executeSlash(interaction) {
    const item = wyrQuestions[Math.floor(Math.random() * wyrQuestions.length)];

    const embed = new EmbedBuilder()
      .setColor('#ff9ecf')
      .setTitle('❓ Would You Rather...')
      .setDescription(
`╭─────────────୨୧
> 🅰️ **${item.a}**
> 
> *or*
> 
> 🅱️ **${item.b}**
╰─────────────୨୧`
      )
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('wyr_a').setLabel('Option A').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('wyr_b').setLabel('Option B').setStyle(ButtonStyle.Success)
    );

    const reply = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

    // Collector to handle button presses dynamically (lasts 30 seconds)
    const collector = reply.createMessageComponentCollector({ time: 30000 });
    let countA = 0;
    let countB = 0;

    collector.on('collect', async i => {
      if (i.customId === 'wyr_a') countA++;
      if (i.customId === 'wyr_b') countB++;
      await i.reply({ content: `✅ Registered your vote for Option ${i.customId === 'wyr_a' ? 'A' : 'B'}!`, ephemeral: true });
    });

    collector.on('end', async () => {
      const finishedEmbed = new EmbedBuilder()
        .setColor('#ff9ecf')
        .setTitle('🏁 Would You Rather Results')
        .setDescription(
`╭─────────────୨୧
> 🅰️ **${item.a}** • Votes: **${countA}**
> 🅱️ **${item.b}** • Votes: **${countB}**
╰─────────────୨୧`
        );
      await interaction.editReply({ embeds: [finishedEmbed], components: [] }).catch(() => null);
    });
  },

  async executePrefix(message) {
    const item = wyrQuestions[Math.floor(Math.random() * wyrQuestions.length)];
    const reply = await message.reply(`❓ **Would You Rather**:\n🅰️ **${item.a}**\n*or*\n🅱️ **${item.b}**`);
    await reply.react('🅰️');
    await reply.react('🅱️');
  }
};

// ── 9. FACT COMMAND ──────────────────────────────────────────────────────────
export const factCommand = {
  data: new SlashCommandBuilder()
    .setName('fact')
    .setDescription('Get a random interesting and useless fact!'),

  async executeSlash(interaction) {
    await interaction.deferReply();
    try {
      const res = await fetch('https://uselessfacts.jsph.pl/api/v2/facts/random?language=en');
      const data = await res.json();

      const embed = new EmbedBuilder()
        .setColor('#ff9ecf')
        .setTitle('💡 Random Fact')
        .setDescription(`╭─────────────୨୧\n> ${data.text}\n╰─────────────୨୧`)
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch {
      await interaction.editReply('❌ Failed to fetch a fact.');
    }
  },

  async executePrefix(message) {
    try {
      const res = await fetch('https://uselessfacts.jsph.pl/api/v2/facts/random?language=en');
      const data = await res.json();
      await message.reply(`💡 **Random Fact**: ${data.text}`);
    } catch {
      await message.reply('❌ Fact API unavailable.');
    }
  }
};
