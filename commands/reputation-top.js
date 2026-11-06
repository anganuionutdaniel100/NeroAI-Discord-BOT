const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getLeaderboard, getStats } = require('../utils/reputation');

module.exports = {
  category: 'Reputație',
  data: new SlashCommandBuilder()
    .setName('reputation-top')
    .setDescription('Cei mai reputați membri ai serverului'),

  async execute(interaction) {
    const top = getLeaderboard(interaction.guild.id, 10);
    const stats = getStats(interaction.guild.id);

    const embed = new EmbedBuilder()
      .setColor(0xfee75c)
      .setTitle(`Top reputație — ${interaction.guild.name}`)
      .setTimestamp();

    if (!top.length) {
      embed.setDescription('Nimeni nu are reputație încă. Folosește `/rep` pentru a oferi primul punct.');
      return interaction.reply({ embeds: [embed] });
    }

    embed.setDescription(
      top
        .map(
          (entry, index) =>
            `**${index + 1}.** <@${entry.userId}> — **${entry.points} puncte**`,
        )
        .join('\n'),
    );

    embed.setFooter({
      text: `${stats.totalPoints} puncte în total, oferite de ${stats.totalGiven} ori.`,
    });

    await interaction.reply({ embeds: [embed] });
  },
};
