const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
} = require('discord.js');
const config = require('../config');
const {
  buildSuggestionPanelEmbed,
  suggestionPanelRow,
} = require('../handlers/suggestions');

module.exports = {
  category: 'Sugestii',
  data: new SlashCommandBuilder()
    .setName('suggest-panel')
    .setDescription('Trimite panoul de sugestii în acest canal')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({
        content: 'Ai nevoie de permisiunea Manage Server pentru asta.',
        flags: MessageFlags.Ephemeral,
      });
    }

    if (!config.suggestions.channelId) {
      return interaction.reply({
        content: 'Setează `SUGGESTION_CHANNEL_ID` în `.env` înainte de a trimite panoul.',
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
      embeds: [buildSuggestionPanelEmbed()],
      components: [suggestionPanelRow()],
      allowedMentions: { parse: [] },
    });

    return interaction.reply({
      content: 'Panoul de sugestii a fost trimis.',
      flags: MessageFlags.Ephemeral,
    });
  },
};
