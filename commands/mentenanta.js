const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  MessageFlags,
} = require('discord.js');
const config = require('../config');
const { beginMaintenance, endMaintenance } = require('../handlers/maintenance');
const { getMaintenanceState, isMaintenanceActive } = require('../utils/maintenance');

function hasManageGuild(interaction) {
  return interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild);
}

function timestamp(seconds, style = 'f') {
  return `<t:${Math.floor(seconds / 1000)}:${style}>`;
}

function requirePermission(interaction) {
  if (hasManageGuild(interaction)) return false;

  interaction.reply({
    content: 'Ai nevoie de permisiunea Manage Server pentru a administra mentenanța.',
    flags: MessageFlags.Ephemeral,
  });
  return true;
}

async function start(interaction) {
  if (requirePermission(interaction)) return;

  const state = getMaintenanceState(interaction.guild.id);

  if (isMaintenanceActive(interaction.guild.id)) {
    return interaction.reply({
      content: state.endsAt
        ? `Mentenanța este deja activă până la ${timestamp(state.endsAt)}.`
        : 'Mentenanța este deja activă, fără un termen prestabilit.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const ping = interaction.options.getBoolean('ping') ?? false;
  if (ping && !config.maintenance.pingRoleId) {
    return interaction.reply({
      content:
        'Opțiunea ping cere `MAINTENANCE_PING_ROLE_ID` în `.env`. Fără un rol configurat, anunțul poate fi publicat fără ping.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const reason = interaction.options.getString('motiv')?.trim() || null;
  const durationMinutes = interaction.options.getInteger('minute');
  const channelId = config.maintenance.channelId ?? interaction.channelId;

  const result = await beginMaintenance(interaction.client, {
    guildId: interaction.guild.id,
    reason,
    durationMinutes,
    actorId: interaction.user.id,
    actorTag: interaction.user.tag,
    channelId,
    pingRoleId: ping ? config.maintenance.pingRoleId : null,
    announce: true,
  });

  if (!result.ok) {
    return interaction.reply({
      content: 'Mentenanța nu a putut fi pornită. Încearcă din nou.',
      flags: MessageFlags.Ephemeral,
    });
  }

  let announcement;
  if (result.announced) {
    announcement = `Anunțul a fost publicat în <#${channelId}>.`;
  } else if (!channelId) {
    announcement = 'Nu a fost trimis niciun anunț, pentru că nu există un canal configurat.';
  } else {
    announcement = `Anunțul nu a putut fi trimis${result.announceError ? `: ${result.announceError}` : '.'}`;
  }

  return interaction.reply({
    content: [
      'Mentenanța a fost pornită. Comenzile membrilor sunt blocate, iar ticketele și verificarea rămân active.',
      announcement,
    ].join('\n'),
    flags: MessageFlags.Ephemeral,
  });
}

async function stop(interaction) {
  if (requirePermission(interaction)) return;

  if (!isMaintenanceActive(interaction.guild.id)) {
    return interaction.reply({
      content: 'Mentenanța nu este activă.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const result = await endMaintenance(interaction.client, {
    guildId: interaction.guild.id,
    actorId: interaction.user.id,
    actorTag: interaction.user.tag,
  });

  if (!result.ok) {
    return interaction.reply({
      content: 'Mentenanța nu a putut fi oprită. Încearcă din nou.',
      flags: MessageFlags.Ephemeral,
    });
  }

  return interaction.reply({
    content: result.announced
      ? 'Mentenanța a fost oprită, iar anunțul de revenire a fost publicat.'
      : 'Mentenanța a fost oprită. Anunțul de revenire nu a putut fi trimis.',
    flags: MessageFlags.Ephemeral,
  });
}

async function status(interaction) {
  if (requirePermission(interaction)) return;

  const state = getMaintenanceState(interaction.guild.id);
  const active = isMaintenanceActive(interaction.guild.id);

  const embed = new EmbedBuilder()
    .setColor(active ? 0xfaa61a : 0x57f287)
    .setTitle('Stare mentenanță')
    .setDescription(
      active
        ? 'Mentenanța este activă. Comenzile membrilor sunt blocate; ticketele și verificarea rămân disponibile.'
        : 'Mentenanța este oprită. Botul funcționează normal.',
    )
    .setTimestamp();

  if (active) {
    embed.addFields(
      { name: 'Motiv', value: state.reason || 'Nespecificat', inline: true },
      {
        name: 'Pornită',
        value: state.startedAt ? timestamp(state.startedAt) : 'Necunoscut',
        inline: true,
      },
      {
        name: 'Estimare',
        value: state.endsAt ? timestamp(state.endsAt) : 'Fără termen',
        inline: true,
      },
      {
        name: 'Pornită de',
        value: state.startedByTag
          ? `${state.startedByTag}${state.startedBy ? ` (${state.startedBy})` : ''}`
          : 'Necunoscut',
        inline: true,
      },
    );
  }

  const history = state.history.slice(0, 5);
  if (history.length) {
    embed.addFields({
      name: 'Istoric recent',
      value: history
        .map((entry) => {
          const range = entry.endedAt
            ? `${timestamp(entry.startedAt, 'd')} • ${timestamp(entry.endedAt, 'd')}`
            : `${timestamp(entry.startedAt, 'd')} • în curs`;
          return `- ${range} — ${entry.reason || 'fără motiv'}`;
        })
        .join('\n'),
    });
  }

  return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

module.exports = {
  category: 'Mentenanță',
  data: new SlashCommandBuilder()
    .setName('mentenanta')
    .setDescription('Pornește, oprește sau verifică mentenanța botului')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((subcommand) =>
      subcommand
        .setName('porneste')
        .setDescription('Blochează comenzile membrilor și anunță mentenanța')
        .addStringOption((option) =>
          option
            .setName('motiv')
            .setDescription('Motivul mentenanței')
            .setMaxLength(500),
        )
        .addIntegerOption((option) =>
          option
            .setName('minute')
            .setDescription('Durata în minute, după care mentenanța se oprește automat')
            .setMinValue(1)
            .setMaxValue(10_080),
        )
        .addBooleanOption((option) =>
          option
            .setName('ping')
            .setDescription('Ping-uiește rolul din MAINTENANCE_PING_ROLE_ID'),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand.setName('opreste').setDescription('Oprește mentenanța și anunță revenirea'),
    )
    .addSubcommand((subcommand) =>
      subcommand.setName('status').setDescription('Arată starea și istoricul mentenanței'),
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'porneste') return start(interaction);
    if (subcommand === 'opreste') return stop(interaction);
    return status(interaction);
  },
};
