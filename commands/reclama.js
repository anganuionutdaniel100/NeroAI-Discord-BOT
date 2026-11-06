const { SlashCommandBuilder } = require('discord.js');
const {
  TITLE_MIN,
  TITLE_MAX,
  DESCRIPTION_MIN,
  DESCRIPTION_MAX,
  URL_MAX,
  DAYS_MAX,
} = require('../utils/ads');
const { submitAd } = require('../handlers/ads');

module.exports = {
  category: 'Reclame',
  data: new SlashCommandBuilder()
    .setName('reclama')
    .setDescription('Trimite o reclamă spre verificare')
    .addStringOption((option) =>
      option
        .setName('titlu')
        .setDescription('Titlul reclamei')
        .setRequired(true)
        .setMinLength(TITLE_MIN)
        .setMaxLength(TITLE_MAX),
    )
    .addStringOption((option) =>
      option
        .setName('descriere')
        .setDescription('Descrierea reclamei')
        .setRequired(true)
        .setMinLength(DESCRIPTION_MIN)
        .setMaxLength(DESCRIPTION_MAX),
    )
    .addStringOption((option) =>
      option
        .setName('link')
        .setDescription('Linkul promovat (opțional)')
        .setMaxLength(URL_MAX)
        .setRequired(false),
    )
    .addStringOption((option) =>
      option
        .setName('imagine')
        .setDescription('Link direct către o imagine (opțional)')
        .setMaxLength(URL_MAX)
        .setRequired(false),
    )
    .addIntegerOption((option) =>
      option
        .setName('zile')
        .setDescription('Durata în zile, 0-30. 0 înseamnă permanentă (opțional)')
        .setMinValue(0)
        .setMaxValue(DAYS_MAX)
        .setRequired(false),
    ),

  async execute(interaction) {
    return submitAd(interaction, {
      title: interaction.options.getString('titlu', true),
      description: interaction.options.getString('descriere', true),
      link: interaction.options.getString('link'),
      image: interaction.options.getString('imagine'),
      days: interaction.options.getInteger('zile'),
    });
  },
};
