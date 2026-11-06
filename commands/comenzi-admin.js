const {
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits,
} = require('discord.js');
const {
  NAME_MIN,
  NAME_MAX,
  DESCRIPTION_MAX,
  RESPONSE_MAX,
  TITLE_MAX,
  IMAGE_URL_MAX,
  COOLDOWN_MAX,
} = require('../utils/customCommands');
const {
  adminCreate,
  adminEdit,
  adminDelete,
  adminList,
  adminSettings,
  adminStats,
} = require('../handlers/customCommands');

function commandOption(option) {
  return option
    .setName('comanda')
    .setDescription('Numele sau ID-ul comenzii')
    .setRequired(true)
    .setAutocomplete(true)
    .setMaxLength(NAME_MAX);
}

module.exports = {
  category: 'Comenzi personalizate',
  data: new SlashCommandBuilder()
    .setName('comenzi-admin')
    .setDescription('Administrează comenzile personalizate ale serverului')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((subcommand) =>
      subcommand
        .setName('creaza')
        .setDescription('Creează o comandă personalizată')
        .addStringOption((option) =>
          option
            .setName('nume')
            .setDescription('Numele comenzii (litere mici, cifre, - și _)')
            .setRequired(true)
            .setMinLength(NAME_MIN)
            .setMaxLength(NAME_MAX),
        )
        .addStringOption((option) =>
          option
            .setName('raspuns')
            .setDescription('Textul trimis când comanda este folosită')
            .setRequired(true)
            .setMaxLength(RESPONSE_MAX),
        )
        .addStringOption((option) =>
          option
            .setName('descriere')
            .setDescription('Descriere scurtă afișată în listă')
            .setMaxLength(DESCRIPTION_MAX),
        )
        .addStringOption((option) =>
          option
            .setName('titlu')
            .setDescription('Titlul embed-ului; fără titlu răspunsul este text simplu')
            .setMaxLength(TITLE_MAX),
        )
        .addStringOption((option) =>
          option
            .setName('culoare')
            .setDescription('Culoarea embed-ului, de exemplu #8b5cf6')
            .setMinLength(4)
            .setMaxLength(7),
        )
        .addStringOption((option) =>
          option
            .setName('imagine')
            .setDescription('Adresa unei imagini pentru embed')
            .setMaxLength(IMAGE_URL_MAX),
        )
        .addIntegerOption((option) =>
          option
            .setName('cooldown')
            .setDescription('Secunde între două utilizări ale aceluiași membru')
            .setMinValue(0)
            .setMaxValue(COOLDOWN_MAX),
        )
        .addBooleanOption((option) =>
          option
            .setName('efemera')
            .setDescription('Răspunsul este vizibil doar pentru cel care folosește comanda'),
        )
        .addBooleanOption((option) =>
          option.setName('activ').setDescription('Comanda este activă imediat după creare'),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('editeaza')
        .setDescription('Modifică o comandă personalizată')
        .addStringOption(commandOption)
        .addStringOption((option) =>
          option
            .setName('nume_nou')
            .setDescription('Nume nou pentru comandă')
            .setMinLength(NAME_MIN)
            .setMaxLength(NAME_MAX),
        )
        .addStringOption((option) =>
          option
            .setName('raspuns')
            .setDescription('Răspuns nou')
            .setMaxLength(RESPONSE_MAX),
        )
        .addStringOption((option) =>
          option
            .setName('descriere')
            .setDescription('Descriere nouă')
            .setMaxLength(DESCRIPTION_MAX),
        )
        .addBooleanOption((option) =>
          option.setName('sterge_descriere').setDescription('Elimină descrierea'),
        )
        .addStringOption((option) =>
          option.setName('titlu').setDescription('Titlu nou').setMaxLength(TITLE_MAX),
        )
        .addBooleanOption((option) =>
          option.setName('sterge_titlu').setDescription('Elimină titlul'),
        )
        .addStringOption((option) =>
          option
            .setName('culoare')
            .setDescription('Culoare nouă, de exemplu #8b5cf6')
            .setMinLength(4)
            .setMaxLength(7),
        )
        .addStringOption((option) =>
          option
            .setName('imagine')
            .setDescription('Adresă nouă pentru imagine')
            .setMaxLength(IMAGE_URL_MAX),
        )
        .addBooleanOption((option) =>
          option.setName('sterge_imagine').setDescription('Elimină imaginea'),
        )
        .addIntegerOption((option) =>
          option
            .setName('cooldown')
            .setDescription('Cooldown nou, în secunde')
            .setMinValue(0)
            .setMaxValue(COOLDOWN_MAX),
        )
        .addBooleanOption((option) =>
          option
            .setName('efemera')
            .setDescription('Răspunsul este vizibil doar pentru cel care folosește comanda'),
        )
        .addBooleanOption((option) =>
          option.setName('activ').setDescription('Activează sau dezactivează comanda'),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('sterge')
        .setDescription('Șterge o comandă personalizată')
        .addStringOption(commandOption),
    )
    .addSubcommand((subcommand) =>
      subcommand.setName('lista').setDescription('Listează toate comenzile personalizate'),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('setari')
        .setDescription('Afișează sau modifică setările generale')
        .addBooleanOption((option) =>
          option.setName('activ').setDescription('Activează sau dezactivează sistemul'),
        )
        .addChannelOption((option) =>
          option
            .setName('canal_log')
            .setDescription('Canalul pentru log-ul administrativ')
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement),
        )
        .addBooleanOption((option) =>
          option
            .setName('fara_canal')
            .setDescription('Revine la canalul din .env sau elimină log-ul'),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand.setName('statistici').setDescription('Vezi utilizarea comenzilor personalizate'),
    ),

  async execute(interaction) {
    switch (interaction.options.getSubcommand()) {
      case 'creaza':
        return adminCreate(interaction);
      case 'editeaza':
        return adminEdit(interaction);
      case 'sterge':
        return adminDelete(interaction);
      case 'lista':
        return adminList(interaction);
      case 'setari':
        return adminSettings(interaction);
      case 'statistici':
        return adminStats(interaction);
      default:
        return undefined;
    }
  },
};
