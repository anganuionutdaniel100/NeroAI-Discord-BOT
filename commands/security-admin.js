const {
  SlashCommandBuilder,
  ChannelType,
  MessageFlags,
  PermissionFlagsBits,
} = require('discord.js');
const {
  JOIN_ACTION_LABELS,
  MESSAGE_ACTION_LABELS,
  RISK_MIN,
  RISK_MAX,
  ACCOUNT_AGE_MIN,
  ACCOUNT_AGE_MAX,
  JOIN_WINDOW_MIN,
  JOIN_WINDOW_MAX,
  JOIN_THRESHOLD_MIN,
  JOIN_THRESHOLD_MAX,
  SPAM_WINDOW_MIN,
  SPAM_WINDOW_MAX,
  SPAM_THRESHOLD_MIN,
  SPAM_THRESHOLD_MAX,
  TIMEOUT_MIN,
  TIMEOUT_MAX,
  adminSettings,
  adminLockdown,
  adminReset,
} = require('../handlers/aiSecurity');

module.exports = {
  category: 'Securitate',
  data: new SlashCommandBuilder()
    .setName('security-admin')
    .setDescription('Configurează AI Security')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((subcommand) =>
      subcommand
        .setName('setari')
        .setDescription('Modifică setările securității')
        .addBooleanOption((option) =>
          option.setName('activ').setDescription('Activează sau dezactivează AI Security'),
        )
        .addIntegerOption((option) =>
          option
            .setName('prag')
            .setDescription('Pragul de risc de la care membrul este semnalat')
            .setMinValue(RISK_MIN)
            .setMaxValue(RISK_MAX),
        )
        .addIntegerOption((option) =>
          option
            .setName('varsta_minima')
            .setDescription('Vârsta minimă a contului, în zile')
            .setMinValue(ACCOUNT_AGE_MIN)
            .setMaxValue(ACCOUNT_AGE_MAX),
        )
        .addIntegerOption((option) =>
          option
            .setName('fereastra_intrari')
            .setDescription('Fereastra pentru detectarea valurilor de intrări, în secunde')
            .setMinValue(JOIN_WINDOW_MIN)
            .setMaxValue(JOIN_WINDOW_MAX),
        )
        .addIntegerOption((option) =>
          option
            .setName('prag_intrari')
            .setDescription('Numărul de intrări care declanșează alerta de val')
            .setMinValue(JOIN_THRESHOLD_MIN)
            .setMaxValue(JOIN_THRESHOLD_MAX),
        )
        .addStringOption((option) =>
          option
            .setName('actiune_intrare')
            .setDescription('Acțiunea pentru intrările cu risc ridicat')
            .addChoices(
              ...Object.entries(JOIN_ACTION_LABELS).map(([value, name]) => ({
                name,
                value,
              })),
            ),
        )
        .addIntegerOption((option) =>
          option
            .setName('timeout')
            .setDescription('Durata timeout-ului, în minute')
            .setMinValue(TIMEOUT_MIN)
            .setMaxValue(TIMEOUT_MAX),
        )
        .addIntegerOption((option) =>
          option
            .setName('fereastra_mesaje')
            .setDescription('Fereastra pentru detectarea spamului, în secunde')
            .setMinValue(SPAM_WINDOW_MIN)
            .setMaxValue(SPAM_WINDOW_MAX),
        )
        .addIntegerOption((option) =>
          option
            .setName('prag_mesaje')
            .setDescription('Numărul de mesaje care declanșează alerta de spam')
            .setMinValue(SPAM_THRESHOLD_MIN)
            .setMaxValue(SPAM_THRESHOLD_MAX),
        )
        .addStringOption((option) =>
          option
            .setName('actiune_mesaj')
            .setDescription('Acțiunea pentru mesajele cu risc ridicat')
            .addChoices(
              ...Object.entries(MESSAGE_ACTION_LABELS).map(([value, name]) => ({
                name,
                value,
              })),
            ),
        )
        .addBooleanOption((option) =>
          option.setName('verificari_ai').setDescription('Activează evaluarea AI a mesajelor'),
        )
        .addBooleanOption((option) =>
          option
            .setName('lockdown_auto')
            .setDescription('Activează lockdown-ul automat la valuri de intrări'),
        )
        .addChannelOption((option) =>
          option
            .setName('canal_log')
            .setDescription('Canalul pentru logul AI Security')
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement),
        )
        .addBooleanOption((option) =>
          option.setName('fara_canal').setDescription('Elimină canalul de log configurat'),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('lockdown')
        .setDescription('Activează sau dezactivează lockdown-ul serverului')
        .addBooleanOption((option) =>
          option
            .setName('activ')
            .setDescription('true activează lockdown-ul, false îl dezactivează')
            .setRequired(true),
        )
        .addStringOption((option) =>
          option
            .setName('motiv')
            .setDescription('Motivul lockdown-ului')
            .setMaxLength(300),
        ),
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
      case 'lockdown':
        return adminLockdown(interaction);
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
