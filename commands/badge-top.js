const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getBadgeStats, getLeaderboard } = require('../utils/badges');

module.exports = {
  category: 'Badge-uri',
  data: new SlashCommandBuilder()
    .setName('badge-top')
    .setDescription('Cei mai mulți membri cu badge-uri ai serverului'),

  async execute(interaction) {
    const top = getLeaderboard(interaction.guild.id, 10);
    const stats = getBadgeStats(interaction.guild.id);

    const embed = new EmbedBuilder()
      .setColor(0x8b5cf6)
      .setTitle(`Top badge-uri — ${interaction.guild.name}`)
      .setTimestamp();

    if (!top.length) {
      embed.setDescription(
        'Nimeni nu are badge-uri încă. Un administrator le poate acorda cu `/badge-admin acorda`.',
      );
      return interaction.reply({ embeds: [embed] });
    }

    embed.setDescription(
      top
        .map(
          (entry, index) =>
            `**${index + 1}.** <@${entry.userId}> — **${entry.count} ${entry.count === 1 ? 'badge' : 'badge-uri'}**`,
        )
        .join('\n'),
    );

    const footer = [`${stats.awards} acordări`, `${stats.total} badge-uri definite`];
    if (stats.topBadge) {
      footer.push(`cel mai popular: ${stats.topBadge.name}`);
    }
    embed.setFooter({ text: footer.join(' • ') });

    await interaction.reply({ embeds: [embed], allowedMentions: { parse: [] } });
  },
};
