const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { buildPanelEmbed, panelRow } = require('../handlers/applications');

module.exports = {
  category: 'Cereri',
  data: new SlashCommandBuilder()
    .setName('apply-panel')
    .setDescription('Trimite panoul de cereri în acest canal')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({
        content: 'Ai nevoie de permisiunea Manage Server pentru asta.',
        flags: MessageFlags.Ephemeral,
      });
    }

    if (!interaction.channel?.isTextBased()) {
      return interaction.reply({
        content: 'Panoul poate fi trimis doar într-un canal text.',
        flags: MessageFlags.Ephemeral,
      });
    }

    await interaction.channel.send({
      embeds: [buildPanelEmbed()],
      components: [panelRow()],
      allowedMentions: { parse: [] },
    });

    return interaction.reply({
      content: 'Panoul de cereri a fost trimis.',
      flags: MessageFlags.Ephemeral,
    });
  },
};
