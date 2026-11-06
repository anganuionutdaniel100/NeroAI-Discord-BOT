const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
} = require('discord.js');
const { getSettings } = require('../utils/ads');
const {
  buildAdsPanelEmbed,
  adsPanelRow,
} = require('../handlers/ads');

module.exports = {
  category: 'Reclame',
  data: new SlashCommandBuilder()
    .setName('reclama-panel')
    .setDescription('Trimite panoul de reclame în acest canal')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({
        content: 'Ai nevoie de permisiunea Manage Server pentru asta.',
        flags: MessageFlags.Ephemeral,
      });
    }

    if (!getSettings(interaction.guild.id).channelId) {
      return interaction.reply({
        content:
          'Setează `ADS_CHANNEL_ID` în `.env` sau canalul din `/reclame-admin setari` înainte de a trimite panoul.',
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
      embeds: [buildAdsPanelEmbed()],
      components: [adsPanelRow()],
      allowedMentions: { parse: [] },
    });

    return interaction.reply({
      content: 'Panoul de reclame a fost trimis.',
      flags: MessageFlags.Ephemeral,
    });
  },
};
