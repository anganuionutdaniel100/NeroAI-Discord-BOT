const {
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits,
} = require('discord.js');
const {
  TITLE_MAX,
  MESSAGE_MAX,
  IMAGE_URL_MAX,
} = require('../utils/welcome');
const {
  handleSettingsCommand,
  handleTestCommand,
  handleStatsCommand,
} = require('../handlers/welcome');

const TEXT_CHANNEL_TYPES = [ChannelType.GuildText, ChannelType.GuildAnnouncement];

function typeOption(option) {
  return option
    .setName('tip')
    .setDescription('Mesajul configurat')
    .setRequired(true)
    .addChoices(
      { name: 'Bine ai venit', value: 'welcome' },
      { name: 'La revedere', value: 'goodbye' },
    );
}

module.exports = {
  category: 'Bine ai venit',
  data: new SlashCommandBuilder()
    .setName('intampinare')
    .setDescription('Configurează mesajele de bun venit și la revedere')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((subcommand) =>
      subcommand
        .setName('setari')
        .setDescription('Afișează sau modifică setările mesajului ales')
        .addStringOption(typeOption)
        .addChannelOption((option) =>
          option
            .setName('canal')
            .setDescription('Canalul în care este trimis mesajul')
            .addChannelTypes(...TEXT_CHANNEL_TYPES),
        )
        .addBooleanOption((option) =>
          option.setName('activ').setDescription('Activează sau dezactivează mesajul'),
        )
        .addStringOption((option) =>
          option
            .setName('titlu')
            .setDescription('Titlul embed-ului')
            .setMaxLength(TITLE_MAX),
        )
        .addStringOption((option) =>
          option
            .setName('mesaj')
            .setDescription('Textul mesajului, cu placeholders')
            .setMaxLength(MESSAGE_MAX),
        )
        .addStringOption((option) =>
          option
            .setName('culoare')
            .setDescription('Culoarea embed-ului în format hexazecimal')
            .setMaxLength(7),
        )
        .addStringOption((option) =>
          option
            .setName('imagine')
            .setDescription('Adresa imaginii afișate în embed')
            .setMaxLength(IMAGE_URL_MAX),
        )
        .addBooleanOption((option) =>
          option
            .setName('sterge_imagine')
            .setDescription('Elimină imaginea configurată'),
        )
        .addBooleanOption((option) =>
          option
            .setName('mentioneaza')
            .setDescription('Menționează membrul în mesajul de bun venit'),
        )
        .addBooleanOption((option) =>
          option.setName('reseteaza').setDescription('Revine la valorile implicite'),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('test')
        .setDescription('Trimite un mesaj de test în canalul configurat')
        .addStringOption(typeOption),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('statistici')
        .setDescription('Vezi câte mesaje au fost trimise')
        .addStringOption(typeOption),
    ),

  async execute(interaction) {
    const type = interaction.options.getString('tip', true);

    switch (interaction.options.getSubcommand()) {
      case 'setari':
        return handleSettingsCommand(interaction, type);
      case 'test':
        return handleTestCommand(interaction, type);
      case 'statistici':
        return handleStatsCommand(interaction, type);
      default:
        return undefined;
    }
  },
};
