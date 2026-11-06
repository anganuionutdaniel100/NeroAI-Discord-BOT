const { SlashCommandBuilder } = require('discord.js');
const { submitSuggestion } = require('../handlers/suggestions');

module.exports = {
  category: 'Sugestii',
  data: new SlashCommandBuilder()
    .setName('suggest')
    .setDescription('Trimite o sugestie pentru server')
    .addStringOption((option) =>
      option
        .setName('text')
        .setDescription('Sugestia ta (10-1500 caractere)')
        .setRequired(true)
        .setMinLength(10)
        .setMaxLength(1500),
    ),

  async execute(interaction) {
    const content = interaction.options.getString('text', true);
    return submitSuggestion(interaction, content);
  },
};
