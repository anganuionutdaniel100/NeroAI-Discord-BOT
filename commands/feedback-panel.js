const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
} = require('discord.js');
const config = require('../config');
const {
  buildFeedbackPanelEmbed,
  feedbackPanelRow,
} = require('../handlers/feedback');

module.exports = {
  category: 'Feedback',
  data: new SlashCommandBuilder()
    .setName('feedback-panel')
    .setDescription('Trimite panoul de feedback în acest canal')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({
        content: 'Ai nevoie de permisiunea Manage Server pentru asta.',
        flags: MessageFlags.Ephemeral,
      });
    }

    if (!config.feedback.channelId) {
      return interaction.reply({
        content: 'Setează `FEEDBACK_CHANNEL_ID` în `.env` înainte de a trimite panoul.',
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
      embeds: [buildFeedbackPanelEmbed()],
      components: [feedbackPanelRow()],
      allowedMentions: { parse: [] },
    });

    return interaction.reply({
      content: 'Panoul de feedback a fost trimis.',
      flags: MessageFlags.Ephemeral,
    });
  },
};
