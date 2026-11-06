const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../config');
const { getLeaderboard, formatAmount } = require('../utils/economy');

module.exports = {
  category: 'Economie',
  data: new SlashCommandBuilder()
    .setName('richest')
    .setDescription('Cei mai bogați membri ai serverului'),

  async execute(interaction) {
    const top = getLeaderboard(interaction.guild.id, 10);

    const embed = new EmbedBuilder()
      .setColor(0xfee75c)
      .setTitle(`Cei mai bogați — ${interaction.guild.name}`)
      .setTimestamp();

    if (!top.length) {
      embed.setDescription('Nimeni nu are monede încă. Începe cu `/daily`.');
      return interaction.reply({ embeds: [embed] });
    }

    embed.setDescription(
      top
        .map(
          (entry, index) =>
            `**${index + 1}.** <@${entry.userId}> — **${formatAmount(entry.balance)} ${config.economy.currency}**`,
        )
        .join('\n'),
    );

    await interaction.reply({ embeds: [embed] });
  },
};
