const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const config = require('../config');
const { getAccount, claimDaily, formatAmount } = require('../utils/economy');

const COOLDOWN_MS = 24 * 60 * 60 * 1000;
const MIN_REWARD = 250;
const MAX_REWARD = 350;

module.exports = {
  category: 'Economie',
  data: new SlashCommandBuilder()
    .setName('daily')
    .setDescription('Revendică recompensa zilnică'),

  async execute(interaction) {
    const account = getAccount(interaction.guild.id, interaction.user.id);
    const nextAt = account.lastDaily + COOLDOWN_MS;

    if (Date.now() < nextAt) {
      return interaction.reply({
        content: `Ai revendicat deja daily-ul. Revino <t:${Math.floor(nextAt / 1000)}:R>.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    const reward = MIN_REWARD + Math.floor(Math.random() * (MAX_REWARD - MIN_REWARD + 1));
    const balance = claimDaily(interaction.guild.id, interaction.user.id, reward);

    const embed = new EmbedBuilder()
      .setColor(0x57f287)
      .setTitle('Daily revendicat')
      .setDescription(`Ai primit **${formatAmount(reward)} ${config.economy.currency}**.`)
      .addFields({
        name: 'Balanță',
        value: `${formatAmount(balance)} ${config.economy.currency}`,
        inline: true,
      })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
