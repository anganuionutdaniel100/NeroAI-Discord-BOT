const { SlashCommandBuilder } = require('discord.js');
const { NAME_MAX } = require('../utils/customCommands');
const { invokeCustomCommand } = require('../handlers/customCommands');

module.exports = {
  category: 'Comenzi personalizate',
  data: new SlashCommandBuilder()
    .setName('comanda')
    .setDescription('Rulează o comandă personalizată a serverului')
    .addStringOption((option) =>
      option
        .setName('nume')
        .setDescription('Numele comenzii personalizate')
        .setRequired(true)
        .setAutocomplete(true)
        .setMaxLength(NAME_MAX),
    )
    .addUserOption((option) =>
      option
        .setName('membru')
        .setDescription('Membru vizat de răspuns, dacă este nevoie'),
    ),

  async execute(interaction) {
    return invokeCustomCommand(interaction);
  },
};
