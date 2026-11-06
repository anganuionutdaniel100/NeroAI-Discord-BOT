const { SlashCommandBuilder } = require('discord.js');
const { listCommands } = require('../handlers/customCommands');

module.exports = {
  category: 'Comenzi personalizate',
  data: new SlashCommandBuilder()
    .setName('comenzi')
    .setDescription('Afișează comenzile personalizate disponibile pe server'),

  async execute(interaction) {
    return listCommands(interaction);
  },
};
