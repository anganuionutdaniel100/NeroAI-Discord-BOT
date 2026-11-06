const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getLeaderboard } = require('../utils/levels');

module.exports = {
  category: 'Niveluri',
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Cei mai activi membri după XP'),

  async execute(interaction) {
    const top = getLeaderboard(interaction.guild.id, 10);

    const embed = new EmbedBuilder()
      .setColor(0x8b5cf6)
      .setTitle(`Top 10 — ${interaction.guild.name}`)
      .setTimestamp();

    if (!top.length) {
      embed.setDescription('Nimeni nu are XP încă. Scrie un mesaj ca să începi.');
      return interaction.reply({ embeds: [embed] });
    }

    embed.setDescription(
      top
        .map(
          (entry, index) =>
            `**${index + 1}.** <@${entry.userId}> — Nivel **${entry.level}** • ${entry.totalXp} XP`,
        )
        .join('\n'),
    );

    await interaction.reply({ embeds: [embed] });
  },
};
