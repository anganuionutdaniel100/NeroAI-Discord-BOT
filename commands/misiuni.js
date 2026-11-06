const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const {
  buildMissionsProgressEmbed,
  progressRow,
} = require('../handlers/missions');

module.exports = {
  category: 'Misiuni',
  data: new SlashCommandBuilder()
    .setName('misiuni')
    .setDescription('Vezi progresul tău și revendică recompensele'),

  async execute(interaction) {
    const { embed, entries } = buildMissionsProgressEmbed(interaction.guild, interaction.member);

    return interaction.reply({
      embeds: [embed],
      components: entries.length ? [progressRow(entries)] : [],
      flags: MessageFlags.Ephemeral,
    });
  },
};
