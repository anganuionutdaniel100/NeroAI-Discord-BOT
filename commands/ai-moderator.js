const {
  SlashCommandBuilder,
  ChannelType,
  MessageFlags,
  PermissionFlagsBits,
} = require('discord.js');
const {
  THRESHOLD_MIN,
  THRESHOLD_MAX,
  TIMEOUT_MIN,
  TIMEOUT_MAX,
  MIN_TEXT,
  MAX_TEXT,
  MODERATION_ACTIONS,
  adminSettings,
  adminStatus,
  adminStats,
  adminAnalyze,
  adminReset,
} = require('../handlers/aiModerator');

module.exports = {
  category: 'Moderare',
  data: new SlashCommandBuilder()
    .setName('ai-moderator')
    .setDescription('Configurează moderarea automată a mesajelor cu AI')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((subcommand) =>
      subcommand
        .setName('setari')
        .setDescription('Modifică setările moderării automate')
        .addBooleanOption((option) =>
          option.setName('activ').setDescription('Activează sau dezactivează AI Moderator'),
        )
        .addStringOption((option) =>
          option
            .setName('actiune')
            .setDescription('Ce se întâmplă când un mesaj depășește pragul')
            .addChoices(
              ...Object.entries(MODERATION_ACTIONS).map(([value, name]) => ({
                name,
                value,
              })),
            ),
        )
        .addNumberOption((option) =>
          option
            .setName('prag')
            .setDescription('Pragul de la care mesajul este semnalat')
            .setMinValue(THRESHOLD_MIN)
            .setMaxValue(THRESHOLD_MAX),
        )
        .addIntegerOption((option) =>
          option
            .setName('durata')
            .setDescription('Durata timeout-ului, în minute')
            .setMinValue(TIMEOUT_MIN)
            .setMaxValue(TIMEOUT_MAX),
        )
        .addChannelOption((option) =>
          option
            .setName('canal_log')
            .setDescription('Canalul pentru logul moderării AI')
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement),
        )
        .addBooleanOption((option) =>
          option
            .setName('fara_canal')
            .setDescription('Elimină canalul de log configurat'),
        )
        .addBooleanOption((option) =>
          option
            .setName('notificare')
            .setDescription('Trimite membrului un DM când i se aplică o acțiune'),
        )
        .addStringOption((option) =>
          option
            .setName('canale_ignorate')
            .setDescription('ID-uri de canale ignorate, separate prin virgulă')
            .setMaxLength(1000),
        )
        .addStringOption((option) =>
          option
            .setName('roluri_ignorate')
            .setDescription('ID-uri de roluri ignorate, separate prin virgulă')
            .setMaxLength(1000),
        )
        .addBooleanOption((option) =>
          option
            .setName('goleste_ignorate')
            .setDescription('Elimină toate canalele și rolurile ignorate'),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand.setName('status').setDescription('Afișează setările curente'),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('analizeaza')
        .setDescription('Testează un text fără a aplica vreo acțiune')
        .addStringOption((option) =>
          option
            .setName('text')
            .setDescription('Textul de analizat')
            .setRequired(true)
            .setMinLength(MIN_TEXT)
            .setMaxLength(MAX_TEXT),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand.setName('statistici').setDescription('Afișează statisticile moderării AI'),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('reseteaza')
        .setDescription('Resetează setările la valorile implicite'),
    ),

  async execute(interaction) {
    switch (interaction.options.getSubcommand()) {
      case 'setari':
        return adminSettings(interaction);
      case 'status':
        return adminStatus(interaction);
      case 'analizeaza':
        return adminAnalyze(interaction);
      case 'statistici':
        return adminStats(interaction);
      case 'reseteaza':
        return adminReset(interaction);
      default:
        return interaction.reply({
          content: 'Subcomanda nu este disponibilă.',
          flags: MessageFlags.Ephemeral,
        });
    }
  },
};
