const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  MessageFlags,
} = require('discord.js');
const config = require('../config');
const { publishUpdate } = require('../handlers/updates');
const { getEntries, setLastVersion, flush } = require('../utils/updates');

function truncate(text, length) {
  return text.length > length ? `${text.slice(0, length - 3)}...` : text;
}

async function publish(interaction) {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
    return interaction.reply({
      content: 'Ai nevoie de permisiunea Manage Server pentru a publica update-uri.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const version = interaction.options
    .getString('versiune', true)
    .trim()
    .replace(/^v/i, '');
  const title = interaction.options.getString('titlu')?.trim() || null;
  const notes = interaction.options.getString('note', true).trim();
  const ping = interaction.options.getBoolean('ping') ?? false;

  if (!version || !notes) {
    return interaction.reply({
      content: 'Versiunea și notele nu pot fi goale.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const result = await publishUpdate(interaction.client, {
    channelId: config.updates.channelId ?? interaction.channelId,
    version,
    title,
    notes,
    authorId: interaction.user.id,
    authorTag: interaction.user.tag,
    pingRoleId: ping ? config.updates.pingRoleId : null,
  });

  if (!result) {
    return interaction.reply({
      content:
        'Update-ul nu a putut fi publicat. Verifică `UPDATE_CHANNEL_ID` și permisiunile botului (Send Messages, Embed Links).',
      flags: MessageFlags.Ephemeral,
    });
  }

  if (version === config.version) {
    setLastVersion(version);
    flush();
  }

  return interaction.reply({
    content: `Update publicat: ${result.message.url}`,
    flags: MessageFlags.Ephemeral,
  });
}

async function history(interaction) {
  const limit = interaction.options.getInteger('limita') ?? 10;
  const entries = getEntries(limit);

  if (!entries.length) {
    return interaction.reply({
      content: 'Nu există update-uri publicate încă.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const description = entries
    .map((entry) => {
      const title = entry.title ? ` — ${entry.title}` : '';
      const date = `<t:${Math.floor(entry.createdAt / 1000)}:d>`;
      const mode = entry.auto ? ' • automat' : '';

      return `**v${entry.version}${title}**\n${date}${mode}\n${truncate(entry.notes ?? '', 100)}`;
    })
    .join('\n\n');

  const embed = new EmbedBuilder()
    .setColor(0x8b5cf6)
    .setTitle('Istoric update-uri')
    .setDescription(description)
    .setFooter({ text: `Versiune curentă: v${config.version} • ${entries.length} afișate` })
    .setTimestamp();

  return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

module.exports = {
  category: 'Update-uri',
  data: new SlashCommandBuilder()
    .setName('update')
    .setDescription('Publică sau consultă update-urile botului')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('publica')
        .setDescription('Publică un update în canalul de update-uri')
        .addStringOption((option) =>
          option
            .setName('versiune')
            .setDescription('Versiunea, de exemplu 1.2.0')
            .setRequired(true)
            .setMaxLength(32),
        )
        .addStringOption((option) =>
          option
            .setName('note')
            .setDescription('Ce s-a schimbat în această versiune')
            .setRequired(true)
            .setMaxLength(3800),
        )
        .addStringOption((option) =>
          option.setName('titlu').setDescription('Titlu scurt').setMaxLength(150),
        )
        .addBooleanOption((option) =>
          option
            .setName('ping')
            .setDescription('Ping-uiește rolul de update-uri (dacă este configurat)'),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('istoric')
        .setDescription('Ultimele update-uri publicate')
        .addIntegerOption((option) =>
          option
            .setName('limita')
            .setDescription('Câte intrări să afișeze (implicit 10)')
            .setMinValue(1)
            .setMaxValue(20),
        ),
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'publica') return publish(interaction);
    return history(interaction);
  },
};
