const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../config');
const {
  buildMissionsPanelEmbed,
  panelRow,
} = require('../handlers/missions');

module.exports = {
  category: 'Misiuni',
  data: new SlashCommandBuilder()
    .setName('misiuni-panel')
    .setDescription('Publică panoul cu misiunile active')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const channel = interaction.channel;
    if (!channel?.isTextBased()) {
      return interaction.reply({
        content: `Rulează comanda într-un canal text. Moneda recompenselor este ${config.economy.currency}.`,
        ephemeral: true,
      });
    }

    await channel.send({
      embeds: [buildMissionsPanelEmbed(interaction.guild)],
      components: [panelRow()],
      allowedMentions: { parse: [] },
    });

    return interaction.reply({
      content: 'Panoul misiunilor a fost publicat.',
      ephemeral: true,
    });
  },
};
