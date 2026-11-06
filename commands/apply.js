const { SlashCommandBuilder } = require('discord.js');
const { APPLICATION_TYPES } = require('../utils/applicationTypes');
const { openApplicationModal } = require('../handlers/applications');

module.exports = {
  category: 'Cereri',
  data: new SlashCommandBuilder()
    .setName('apply')
    .setDescription('Aplică pentru un rol sau un parteneriat')
    .addStringOption((option) =>
      option
        .setName('tip')
        .setDescription('Tipul cererii')
        .setRequired(true)
        .addChoices(
          ...Object.entries(APPLICATION_TYPES).map(([value, info]) => ({
            name: info.label,
            value,
          })),
        ),
    ),

  async execute(interaction) {
    const type = interaction.options.getString('tip', true);
    return openApplicationModal(interaction, type);
  },
};
