const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const config = require('../config');
const { getAccount, claimWork, formatAmount } = require('../utils/economy');

const COOLDOWN_MS = 60 * 60 * 1000;
const MIN_REWARD = 40;
const MAX_REWARD = 120;

const JOBS = [
  'Ai livrat o comandă',
  'Ai reparat un server',
  'Ai scris o comandă nouă',
  'Ai ajutat un client',
  'Ai curățat logurile',
];

module.exports = {
  category: 'Economie',
  data: new SlashCommandBuilder()
    .setName('work')
    .setDescription('Muncește pentru monede'),

  async execute(interaction) {
    const account = getAccount(interaction.guild.id, interaction.user.id);
    const nextAt = account.lastWork + COOLDOWN_MS;

    if (Date.now() < nextAt) {
      return interaction.reply({
        content: `Ești obosit. Poți munci din nou <t:${Math.floor(nextAt / 1000)}:R>.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    const reward = MIN_REWARD + Math.floor(Math.random() * (MAX_REWARD - MIN_REWARD + 1));
    const balance = claimWork(interaction.guild.id, interaction.user.id, reward);
    const job = JOBS[Math.floor(Math.random() * JOBS.length)];

    const embed = new EmbedBuilder()
      .setColor(0x57f287)
      .setTitle('Muncă finalizată')
      .setDescription(`${job} și ai primit **${formatAmount(reward)} ${config.economy.currency}**.`)
      .addFields({
        name: 'Balanță',
        value: `${formatAmount(balance)} ${config.economy.currency}`,
        inline: true,
      })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
