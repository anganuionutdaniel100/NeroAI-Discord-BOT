const { SlashCommandBuilder } = require('discord.js');
const { submitFeedback } = require('../handlers/feedback');

module.exports = {
  category: 'Feedback',
  data: new SlashCommandBuilder()
    .setName('feedback')
    .setDescription('Trimite un feedback pentru server')
    .addStringOption((option) =>
      option
        .setName('mesaj')
        .setDescription('Feedback-ul tău (10-1000 caractere)')
        .setRequired(true)
        .setMinLength(10)
        .setMaxLength(1000),
    )
    .addIntegerOption((option) =>
      option
        .setName('rating')
        .setDescription('Notă de la 1 la 5 (opțional)')
        .setMinValue(1)
        .setMaxValue(5)
        .setRequired(false),
    )
    .addBooleanOption((option) =>
      option
        .setName('anonim')
        .setDescription('Ascunde-ți identitatea în feedback (opțional)')
        .setRequired(false),
    ),

  async execute(interaction) {
    return submitFeedback(interaction, {
      content: interaction.options.getString('mesaj', true),
      rating: interaction.options.getInteger('rating'),
      anonymous: interaction.options.getBoolean('anonim') ?? false,
    });
  },
};
