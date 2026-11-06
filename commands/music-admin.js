const {
  SlashCommandBuilder,
  ChannelType,
  EmbedBuilder,
  PermissionFlagsBits,
  MessageFlags,
} = require('discord.js');
const config = require('../config');
const {
  VOLUME_MIN,
  VOLUME_MAX,
  MAX_QUEUE_MIN,
  MAX_QUEUE_MAX,
  MAX_DURATION_MIN,
  MAX_DURATION_MAX,
  getSettings,
  updateSettings,
  resetSettings,
  getStats,
  getHistory,
  formatDuration,
  flush,
} = require('../utils/music');
const {
  sendMusicLog,
  getEngineStatus,
  getSessionView,
} = require('../handlers/music');

const TEXT_CHANNEL_TYPES = [ChannelType.GuildText, ChannelType.GuildAnnouncement];

function channelLabel(id) {
  return id ? `<#${id}>` : 'Neconfigurat';
}

function timestampLabel(value) {
  if (!value) return 'Niciodată';
  return `<t:${Math.floor(value / 1000)}:f>`;
}

function settingsEmbed(guild, settings) {
  const stats = getStats(guild.id);
  const engine = getEngineStatus();
  const session = getSessionView(guild);

  return new EmbedBuilder()
    .setColor(0x1db954)
    .setTitle('Muzică — setări')
    .addFields(
      { name: 'Stare', value: settings.enabled ? 'Activă' : 'Dezactivată', inline: true },
      {
        name: 'Rol DJ',
        value: settings.djRoleId ? `<@&${settings.djRoleId}>` : 'Membrii din canal',
        inline: true,
      },
      { name: 'Volum implicit', value: `${settings.defaultVolume}%`, inline: true },
      { name: 'Coadă maximă', value: `${settings.maxQueue} piese`, inline: true },
      {
        name: 'Durată maximă',
        value: `${Math.round(settings.maxDurationSeconds / 60)} minute`,
        inline: true,
      },
      {
        name: 'Canal log',
        value: settings.logChannelId
          ? channelLabel(settings.logChannelId)
          : config.channels.modLog
            ? `${channelLabel(config.channels.modLog)} (implicit)`
            : 'Neconfigurat',
        inline: true,
      },
      {
        name: 'Motor audio',
        value: engine.ready ? 'Disponibil' : 'Indisponibil',
        inline: true,
      },
      {
        name: 'Sesiune curentă',
        value: session.active
          ? `${session.voiceChannelName ?? 'Canal vocal'} • ${session.status}`
          : 'Inactivă',
        inline: true,
      },
      { name: 'Piese redate', value: String(stats.played), inline: true },
      { name: 'Sesiuni', value: String(stats.sessions), inline: true },
    )
    .setFooter({
      text: 'Setările din dashboard au prioritate față de valorile din .env.',
    });
}

function statsEmbed(guild) {
  const stats = getStats(guild.id);
  const history = getHistory(guild.id, 5);
  const embed = new EmbedBuilder()
    .setColor(0x1db954)
    .setTitle('Muzică — statistici')
    .addFields(
      { name: 'Piese redate', value: String(stats.played), inline: true },
      { name: 'Piese adăugate', value: String(stats.queued), inline: true },
      { name: 'Piese sărite', value: String(stats.skipped), inline: true },
      { name: 'Sesiuni', value: String(stats.sessions), inline: true },
      {
        name: 'Ultima redare',
        value: timestampLabel(stats.lastPlayedAt),
        inline: true,
      },
    )
    .setTimestamp();

  if (history.length) {
    embed.addFields({
      name: 'Ultimele piese',
      value: history
        .map((track, index) => {
          const duration = track.isLive
            ? 'Live'
            : track.duration > 0
              ? formatDuration(track.duration)
              : 'Necunoscut';
          return `${index + 1}. [${track.title.slice(0, 100)}](${track.url}) • ${duration}`;
        })
        .join('\n'),
      inline: false,
    });
  }

  return embed;
}

async function settingsCommand(interaction) {
  const guild = interaction.guild;
  const reset = interaction.options.getBoolean('reseteaza') ?? false;

  if (reset) {
    const result = resetSettings(guild.id);
    if (result.error) {
      return interaction.reply({ content: result.error, flags: MessageFlags.Ephemeral });
    }

    flush();

    await sendMusicLog(guild, {
      action: 'setări resetate',
      actorTag: interaction.user.tag,
      fields: [{ name: 'Valori', value: 'Implicite / .env', inline: true }],
    });

    return interaction.reply({
      content: 'Setările muzicii au fost resetate la valorile implicite.',
      embeds: [settingsEmbed(guild, result.settings)],
      flags: MessageFlags.Ephemeral,
    });
  }

  const patch = {};
  const logChannel = interaction.options.getChannel('canal_log');
  const djRole = interaction.options.getRole('rol_dj');
  const volume = interaction.options.getInteger('volum_implicit');
  const maxQueue = interaction.options.getInteger('coada_maxima');
  const maxDuration = interaction.options.getInteger('durata_maxima');
  const enabled = interaction.options.getBoolean('activ');

  if (logChannel) patch.logChannelId = logChannel.id;
  if (djRole) patch.djRoleId = djRole.id;
  if (volume !== null) patch.defaultVolume = volume;
  if (maxQueue !== null) patch.maxQueue = maxQueue;
  if (maxDuration !== null) patch.maxDurationSeconds = maxDuration * 60;
  if (enabled !== null) patch.enabled = enabled;

  if (!Object.keys(patch).length) {
    return interaction.reply({
      embeds: [settingsEmbed(guild, getSettings(guild.id))],
      flags: MessageFlags.Ephemeral,
    });
  }

  const result = updateSettings(guild.id, patch);
  if (result.error) {
    return interaction.reply({ content: result.error, flags: MessageFlags.Ephemeral });
  }

  flush();

  await sendMusicLog(guild, {
    action: 'setări actualizate',
    actorTag: interaction.user.tag,
    fields: [
      {
        name: 'Stare',
        value: result.settings.enabled ? 'Activă' : 'Dezactivată',
        inline: true,
      },
      {
        name: 'Rol DJ',
        value: result.settings.djRoleId ? `<@&${result.settings.djRoleId}>` : 'Membrii din canal',
        inline: true,
      },
      {
        name: 'Volum implicit',
        value: `${result.settings.defaultVolume}%`,
        inline: true,
      },
      {
        name: 'Coadă maximă',
        value: `${result.settings.maxQueue} piese`,
        inline: true,
      },
      {
        name: 'Durată maximă',
        value: `${Math.round(result.settings.maxDurationSeconds / 60)} minute`,
        inline: true,
      },
      {
        name: 'Canal log',
        value: channelLabel(result.settings.logChannelId),
        inline: true,
      },
    ],
  });

  return interaction.reply({
    content: 'Setările muzicii au fost actualizate.',
    embeds: [settingsEmbed(guild, result.settings)],
    flags: MessageFlags.Ephemeral,
  });
}

module.exports = {
  category: 'Muzică',
  data: new SlashCommandBuilder()
    .setName('music-admin')
    .setDescription('Administrează sistemul de muzică')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((subcommand) =>
      subcommand
        .setName('setari')
        .setDescription('Configurează sistemul de muzică')
        .addChannelOption((option) =>
          option
            .setName('canal_log')
            .setDescription('Canalul pentru logurile de administrare')
            .addChannelTypes(...TEXT_CHANNEL_TYPES),
        )
        .addRoleOption((option) =>
          option
            .setName('rol_dj')
            .setDescription('Rolul care poate controla muzica'),
        )
        .addIntegerOption((option) =>
          option
            .setName('volum_implicit')
            .setDescription('Volumul implicit al sesiunilor noi')
            .setMinValue(VOLUME_MIN)
            .setMaxValue(VOLUME_MAX),
        )
        .addIntegerOption((option) =>
          option
            .setName('coada_maxima')
            .setDescription('Numărul maxim de piese din coadă')
            .setMinValue(MAX_QUEUE_MIN)
            .setMaxValue(MAX_QUEUE_MAX),
        )
        .addIntegerOption((option) =>
          option
            .setName('durata_maxima')
            .setDescription('Durata maximă a unei piese, în minute')
            .setMinValue(MAX_DURATION_MIN / 60)
            .setMaxValue(MAX_DURATION_MAX / 60),
        )
        .addBooleanOption((option) =>
          option.setName('activ').setDescription('Activează sau dezactivează muzica'),
        )
        .addBooleanOption((option) =>
          option.setName('reseteaza').setDescription('Revine la valorile implicite'),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand.setName('status').setDescription('Vezi setările curente'),
    )
    .addSubcommand((subcommand) =>
      subcommand.setName('statistici').setDescription('Vezi statisticile muzicii'),
    ),

  async execute(interaction) {
    switch (interaction.options.getSubcommand()) {
      case 'setari':
        return settingsCommand(interaction);
      case 'status':
        return interaction.reply({
          embeds: [settingsEmbed(interaction.guild, getSettings(interaction.guild.id))],
          flags: MessageFlags.Ephemeral,
        });
      case 'statistici':
        return interaction.reply({
          embeds: [statsEmbed(interaction.guild)],
          flags: MessageFlags.Ephemeral,
        });
      default:
        return undefined;
    }
  },
};
