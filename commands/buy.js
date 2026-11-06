const { SlashCommandBuilder } = require('discord.js');
const { purchaseItem } = require('../handlers/shop');

module.exports = {
  category: 'Economie',
  data: new SlashCommandBuilder()
    .setName('buy')
    .setDescription('Cumpără un articol din magazin')
    .addStringOption((option) =>
      option
        .setName('id')
        .setDescription('ID-ul articolului (îl vezi în /shop)')
        .setRequired(true)
        .setMinLength(4)
        .setMaxLength(32),
    ),

  async execute(interaction) {
    const id = interaction.options.getString('id', true);
    return purchaseItem(interaction, id);
  },
};
