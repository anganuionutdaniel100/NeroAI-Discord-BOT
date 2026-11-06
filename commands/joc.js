const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const {
  MIN_BET_MIN,
  MAX_BET_MAX,
  DICE_MIN,
  DICE_MAX,
  GUESS_MIN,
  GUESS_MAX,
} = require('../utils/minigames');
const {
  play,
  buildPlayerStatsEmbed,
  buildLeaderboardEmbed,
} = require('../handlers/minigames');

function betOption(option) {
  return option
    .setName('suma')
    .setDescription('Miza în moneda serverului')
    .setRequired(true)
    .setMinValue(MIN_BET_MIN)
    .setMaxValue(MAX_BET_MAX);
}

module.exports = {
  category: 'Mini-game-uri',
  data: new SlashCommandBuilder()
    .setName('joc')
    .setDescription('Joacă un mini-joc pe monede')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('banut')
        .setDescription('Cap sau pajură')
        .addIntegerOption(betOption)
        .addStringOption((option) =>
          option
            .setName('optiune')
            .setDescription('Cap sau pajură')
            .setRequired(true)
            .addChoices({ name: 'Cap', value: 'cap' }, { name: 'Pajură', value: 'pajura' }),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('piatra-foarfeca-hartie')
        .setDescription('Piatră, foarfecă sau hârtie împotriva calculatorului')
        .addIntegerOption(betOption)
        .addStringOption((option) =>
          option
            .setName('optiune')
            .setDescription('Alegerea ta')
            .setRequired(true)
            .addChoices(
              { name: 'Piatră', value: 'piatra' },
              { name: 'Foarfecă', value: 'foarfeca' },
              { name: 'Hârtie', value: 'hartie' },
            ),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('zar')
        .setDescription('Ghiceste fața zarului')
        .addIntegerOption(betOption)
        .addIntegerOption((option) =>
          option
            .setName('fata')
            .setDescription('Fața zarului')
            .setRequired(true)
            .setMinValue(DICE_MIN)
            .setMaxValue(DICE_MAX),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('ghiceste')
        .setDescription('Ghiceste un număr între 1 și 10')
        .addIntegerOption(betOption)
        .addIntegerOption((option) =>
          option
            .setName('numar')
            .setDescription('Numărul ghicit')
            .setRequired(true)
            .setMinValue(GUESS_MIN)
            .setMaxValue(GUESS_MAX),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('pacanele')
        .setDescription('Învârte pacanelele')
        .addIntegerOption(betOption),
    )
    .addSubcommand((subcommand) =>
      subcommand.setName('statistici').setDescription('Vezi statisticile tale și topul membrilor'),
    )
    .addSubcommand((subcommand) =>
      subcommand.setName('top').setDescription('Vezi topul membrilor după câștigul net'),
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const guild = interaction.guild;

    if (subcommand === 'statistici') {
      return interaction.reply({
        embeds: [buildPlayerStatsEmbed(guild, interaction.user.id)],
        flags: MessageFlags.Ephemeral,
      });
    }

    if (subcommand === 'top') {
      return interaction.reply({ embeds: [buildLeaderboardEmbed(guild)] });
    }

    const bet = interaction.options.getInteger('suma', true);

    if (subcommand === 'banut') {
      return play(interaction, 'coinflip', {
        bet,
        choice: interaction.options.getString('optiune', true),
      });
    }

    if (subcommand === 'piatra-foarfeca-hartie') {
      return play(interaction, 'rps', {
        bet,
        choice: interaction.options.getString('optiune', true),
      });
    }

    if (subcommand === 'zar') {
      return play(interaction, 'dice', {
        bet,
        choice: interaction.options.getInteger('fata', true),
      });
    }

    if (subcommand === 'ghiceste') {
      return play(interaction, 'guess', {
        bet,
        choice: interaction.options.getInteger('numar', true),
      });
    }

    if (subcommand === 'pacanele') {
      return play(interaction, 'slots', { bet });
    }

    return undefined;
  },
};
