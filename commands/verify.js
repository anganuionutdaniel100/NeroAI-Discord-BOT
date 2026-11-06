const { SlashCommandBuilder } = require('discord.js');
const { startVerification } = require('../handlers/verification');

module.exports = {
  category: 'Verificare',
  data: new SlashCommandBuilder()
    .setName('verify')
    .setDescription('Verifică-te pentru a primi rolul de membru'),

  async execute(interaction) {
    await startVerification(interaction);
  },
};
