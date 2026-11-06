const {
  SlashCommandBuilder,
  ChannelType,
  EmbedBuilder,
  PermissionFlagsBits,
  MessageFlags,
} = require('discord.js');
const config = require('../config');
const {
  NAME_MIN,
  NAME_MAX,
  DESCRIPTION_MIN,
  DESCRIPTION_MAX,
  TARGET_MIN,
  TARGET_MAX,
  REWARD_COINS_MAX,
  REWARD_XP_MAX,
  MAX_MISSIONS,
  TYPES,
  RECURRENCES,
  TYPE_LABELS,
  RECURRENCE_LABELS,
  getMission,
  getMissionsStats,
  getMissionSummaries,
  getClaimLeaderboard,
  createMission,
  updateMission,
  deleteMission,
  resetProgress,
  getSettings,
  updateSettings,
  flush,
} = require('../utils/missions');
const { sendMissionsLog } = require('../handlers/missions');

const TEXT_CHANNEL_TYPES = [ChannelType.GuildText, ChannelType.GuildAnnouncement];

function channelLabel(id) {
  return id ? `<#${id}>` : 'Neconfigurat';
}

function formatNumber(value) {
  return Number(value).toLocaleString('ro-RO');
}

function rewardLabel(coins, xp) {
  const parts = [];
  if (coins > 0) parts.push(`${formatNumber(coins)} ${config.economy.currency}`);
  if (xp > 0) parts.push(`${formatNumber(xp)} XP`);
  return parts.length ? parts.join(' • ') : 'Fără recompensă';
}

function missionLabel(mission) {
  return `${mission.name} (\`${mission.id}\`)`;
}

function settingsEmbed(guild, settings) {
  const stats = getMissionsStats(guild.id);

  return new EmbedBuilder()
    .setColor(0x8b5cf6)
    .setTitle('Misiuni — setări')
    .addFields(
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
        name: 'Misiuni definite',
        value: `${stats.total} (${stats.active} active)`,
        inline: true,
      },
      {
        name: 'Locuri disponibile',
        value: String(Math.max(0, MAX_MISSIONS - stats.total)),
        inline: true,
      },
    )
    .setFooter({
      text: 'Setările din dashboard au prioritate față de valorile din .env.',
    });
}

async function settingsCommand(interaction) {
  const guild = interaction.guild;
  const logChannel = interaction.options.getChannel('canal_log');
  const reset = interaction.options.getBoolean('reseteaza') ?? false;

  const patch = {};
  if (reset) patch.logChannelId = null;
  else if (logChannel) patch.logChannelId = logChannel.id;

  if (!Object.keys(patch).length) {
    return interaction.reply({
      embeds: [settingsEmbed(guild, getSettings(guild.id))],
      flags: MessageFlags.Ephemeral,
    });
  }

  const settings = updateSettings(guild.id, patch);
  flush();

  await sendMissionsLog(guild, {
    action: 'setări actualizate',
    actorTag: interaction.user.tag,
    fields: [{ name: 'Canal log', value: channelLabel(settings.logChannelId), inline: true }],
  });

  return interaction.reply({
    content: reset
      ? 'Setările misiunilor au fost resetate la valorile din .env.'
      : 'Setările misiunilor au fost actualizate.',
    embeds: [settingsEmbed(guild, settings)],
    flags: MessageFlags.Ephemeral,
  });
}

async function createCommand(interaction) {
  const guild = interaction.guild;
  const mission = createMission({
    guildId: guild.id,
    name: interaction.options.getString('nume', true),
    description: interaction.options.getString('descriere', true),
    type: interaction.options.getString('tip', true),
    target: interaction.options.getInteger('tinta', true),
    recurrence: interaction.options.getString('recurenta', true),
    rewardCoins: interaction.options.getInteger('monede') ?? 0,
    rewardXp: interaction.options.getInteger('xp') ?? 0,
    createdBy: interaction.user.id,
    createdByTag: interaction.user.tag,
  });

  if (!mission) {
    return interaction.reply({
      content: [
        'Misiunea nu a putut fi creată.',
        `Verifică numele (${NAME_MIN}-${NAME_MAX} caractere, unic), descrierea (${DESCRIPTION_MIN}-${DESCRIPTION_MAX}), ținta (${TARGET_MIN}-${TARGET_MAX}) și recompensele.`,
        `Poți avea cel mult ${MAX_MISSIONS} misiuni.`,
      ].join(' '),
      flags: MessageFlags.Ephemeral,
    });
  }

  flush();

  await sendMissionsLog(guild, {
    action: 'misiune creată',
    actorTag: interaction.user.tag,
    fields: [
      { name: 'Misiune', value: missionLabel(mission), inline: false },
      { name: 'Tip', value: TYPE_LABELS[mission.type], inline: true },
      { name: 'Țintă', value: formatNumber(mission.target), inline: true },
      { name: 'Recurență', value: RECURRENCE_LABELS[mission.recurrence], inline: true },
      {
        name: 'Recompensă',
        value: rewardLabel(mission.rewardCoins, mission.rewardXp),
        inline: false,
      },
    ],
  });

  return interaction.reply({
    content: `Misiunea **${mission.name}** a fost creată cu ID-ul \`${mission.id}\`.`,
    flags: MessageFlags.Ephemeral,
  });
}

async function editCommand(interaction) {
  const guild = interaction.guild;
  const id = interaction.options.getString('id', true).trim().toLowerCase();
  const mission = getMission(guild.id, id);

  if (!mission) {
    return interaction.reply({
      content: 'Misiunea nu a fost găsită. Folosește /misiuni-admin lista pentru ID-uri.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const patch = {};
  const fields = {
    nume: 'name',
    descriere: 'description',
    tip: 'type',
    tinta: 'target',
    recurenta: 'recurrence',
    monede: 'rewardCoins',
    xp: 'rewardXp',
  };

  for (const [option, key] of Object.entries(fields)) {
    const value = interaction.options.get(option);
    if (value !== null && value !== undefined) patch[key] = value;
  }

  const active = interaction.options.getBoolean('activ');
  if (active !== null) patch.active = active;

  if (!Object.keys(patch).length) {
    return interaction.reply({
      content: 'Nu ai trimis nicio modificare.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const updated = updateMission(guild.id, mission.id, patch);
  if (!updated) {
    return interaction.reply({
      content:
        'Modificările nu au putut fi aplicate. Verifică numele unic, descrierea, tipul, ținta și recompensele.',
      flags: MessageFlags.Ephemeral,
    });
  }

  flush();

  await sendMissionsLog(guild, {
    action: 'misiune actualizată',
    actorTag: interaction.user.tag,
    fields: [
      { name: 'Misiune', value: missionLabel(updated), inline: false },
      { name: 'Status', value: updated.active ? 'Activă' : 'Inactivă', inline: true },
      { name: 'Țintă', value: formatNumber(updated.target), inline: true },
      {
        name: 'Recompensă',
        value: rewardLabel(updated.rewardCoins, updated.rewardXp),
        inline: true,
      },
    ],
  });

  return interaction.reply({
    content: `Misiunea **${updated.name}** a fost actualizată.`,
    embeds: [
      new EmbedBuilder()
        .setColor(0x8b5cf6)
        .setTitle('Misiune actualizată')
        .addFields(
          { name: 'Nume', value: updated.name, inline: true },
          { name: 'Status', value: updated.active ? 'Activă' : 'Inactivă', inline: true },
          { name: 'Recurență', value: RECURRENCE_LABELS[updated.recurrence], inline: true },
          { name: 'Tip', value: TYPE_LABELS[updated.type], inline: true },
          { name: 'Țintă', value: formatNumber(updated.target), inline: true },
          {
            name: 'Recompensă',
            value: rewardLabel(updated.rewardCoins, updated.rewardXp),
            inline: true,
          },
        ),
    ],
    flags: MessageFlags.Ephemeral,
  });
}

async function deleteCommand(interaction) {
  const guild = interaction.guild;
  const id = interaction.options.getString('id', true).trim().toLowerCase();
  const removed = deleteMission(guild.id, id);

  if (!removed) {
    return interaction.reply({
      content: 'Misiunea nu a fost găsită.',
      flags: MessageFlags.Ephemeral,
    });
  }

  flush();

  await sendMissionsLog(guild, {
    action: 'misiune ștearsă',
    actorTag: interaction.user.tag,
    fields: [
      { name: 'Misiune', value: missionLabel(removed), inline: false },
      { name: 'Tip', value: TYPE_LABELS[removed.type], inline: true },
      { name: 'Țintă', value: formatNumber(removed.target), inline: true },
    ],
  });

  return interaction.reply({
    content: `Misiunea **${removed.name}** a fost ștearsă împreună cu progresul aferent.`,
    flags: MessageFlags.Ephemeral,
  });
}

function listCommand(interaction) {
  const summaries = getMissionSummaries(interaction.guild.id);

  if (!summaries.length) {
    return interaction.reply({
      content: 'Nu există misiuni definite. Creează una cu /misiuni-admin creaza.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const lines = summaries.map((mission) => {
    const status = mission.active ? 'activă' : 'inactivă';
    return [
      `• **${mission.name}** (\`${mission.id}\`) — ${status}`,
      `${TYPE_LABELS[mission.type]} • țintă ${formatNumber(mission.target)} • ${RECURRENCE_LABELS[mission.recurrence]}`,
      `Recompensă: ${rewardLabel(mission.rewardCoins, mission.rewardXp)} • participanți ${mission.participants} • finalizări ${mission.completed} • revendicări ${mission.claimed}`,
    ].join('\n');
  });

  const embed = new EmbedBuilder()
    .setColor(0x8b5cf6)
    .setTitle('Misiuni definite')
    .setDescription(lines.join('\n\n').slice(0, 4096))
    .setFooter({
      text: `${summaries.length} misiuni • /misiuni-admin editeaza pentru modificări`,
    })
    .setTimestamp();

  return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

async function resetCommand(interaction) {
  const guild = interaction.guild;
  const missionId = interaction.options.getString('misiune')?.trim().toLowerCase() ?? null;
  const user = interaction.options.getUser('membru');
  const everything = interaction.options.getBoolean('totul') ?? false;

  if (!missionId && !user && !everything) {
    return interaction.reply({
      content:
        'Alege ce resetezi: o misiune, un membru, ambele sau folosește opțiunea totul.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const mission = missionId ? getMission(guild.id, missionId) : null;
  if (missionId && !mission) {
    return interaction.reply({
      content: 'Misiunea nu a fost găsită.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const removed = resetProgress(guild.id, {
    missionId: everything ? null : mission?.id ?? null,
    userId: everything ? null : user?.id ?? null,
  });
  flush();

  const scope = everything
    ? 'tot progresul serverului'
    : mission && user
      ? `misiunea **${mission.name}** pentru ${user.tag}`
      : mission
        ? `misiunea **${mission.name}** pentru toți membrii`
        : `progresul lui ${user.tag}`;

  await sendMissionsLog(guild, {
    action: 'progres resetat',
    actorTag: interaction.user.tag,
    fields: [
      { name: 'Domeniu', value: scope, inline: false },
      { name: 'Înregistrări eliminate', value: String(removed), inline: true },
    ],
  });

  return interaction.reply({
    content: `Am resetat ${scope}. Înregistrări eliminate: **${removed}**.`,
    flags: MessageFlags.Ephemeral,
  });
}

function statsCommand(interaction) {
  const stats = getMissionsStats(interaction.guild.id);
  const leaderboard = getClaimLeaderboard(interaction.guild.id, 10);

  const embed = new EmbedBuilder()
    .setColor(0x8b5cf6)
    .setTitle('Misiuni — statistici')
    .addFields(
      { name: 'Misiuni definite', value: String(stats.total), inline: true },
      { name: 'Active', value: String(stats.active), inline: true },
      {
        name: 'Recurență',
        value: `${stats.daily} zilnice • ${stats.weekly} săptămânale • ${stats.once} unice`,
        inline: false,
      },
      { name: 'Membri urmăriți', value: String(stats.trackedMembers), inline: true },
      { name: 'Finalizări totale', value: String(stats.completed), inline: true },
      { name: 'Finalizări în perioada curentă', value: String(stats.completedNow), inline: true },
      { name: 'Recompense revendicate', value: String(stats.claims), inline: true },
      {
        name: 'Total oferit',
        value: rewardLabel(stats.coins, stats.xp),
        inline: false,
      },
      {
        name: 'Ultima revendicare',
        value: stats.lastClaimAt
          ? `<t:${Math.floor(stats.lastClaimAt / 1000)}:R>`
          : 'Nicio revendicare',
        inline: true,
      },
    )
    .setTimestamp();

  if (leaderboard.length) {
    embed.addFields({
      name: 'Top membri după revendicări',
      value: leaderboard
        .slice(0, 5)
        .map(
          (entry, index) =>
            `**${index + 1}.** <@${entry.userId}> — ${entry.claims} revendicări, ${rewardLabel(entry.coins, entry.xp)}`,
        )
        .join('\n'),
      inline: false,
    });
  }

  return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

module.exports = {
  category: 'Misiuni',
  data: new SlashCommandBuilder()
    .setName('misiuni-admin')
    .setDescription('Administrează sistemul de misiuni')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((subcommand) =>
      subcommand
        .setName('creaza')
        .setDescription('Creează o misiune nouă')
        .addStringOption((option) =>
          option
            .setName('nume')
            .setDescription('Numele misiunii')
            .setRequired(true)
            .setMinLength(NAME_MIN)
            .setMaxLength(NAME_MAX),
        )
        .addStringOption((option) =>
          option
            .setName('descriere')
            .setDescription('Descrierea afișată membrilor')
            .setRequired(true)
            .setMinLength(DESCRIPTION_MIN)
            .setMaxLength(DESCRIPTION_MAX),
        )
        .addStringOption((option) =>
          option
            .setName('tip')
            .setDescription('Ce urmărește misiunea')
            .setRequired(true)
            .addChoices(...TYPES.map((type) => ({ name: TYPE_LABELS[type], value: type }))),
        )
        .addIntegerOption((option) =>
          option
            .setName('tinta')
            .setDescription('Cantitatea necesară pentru finalizare')
            .setRequired(true)
            .setMinValue(TARGET_MIN)
            .setMaxValue(TARGET_MAX),
        )
        .addStringOption((option) =>
          option
            .setName('recurenta')
            .setDescription('Cât de des se resetează progresul')
            .setRequired(true)
            .addChoices(
              ...RECURRENCES.map((recurrence) => ({
                name: RECURRENCE_LABELS[recurrence],
                value: recurrence,
              })),
            ),
        )
        .addIntegerOption((option) =>
          option
            .setName('monede')
            .setDescription('Recompensa în monedă')
            .setMinValue(0)
            .setMaxValue(REWARD_COINS_MAX),
        )
        .addIntegerOption((option) =>
          option
            .setName('xp')
            .setDescription('Recompensa în XP')
            .setMinValue(0)
            .setMaxValue(REWARD_XP_MAX),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('editeaza')
        .setDescription('Modifică o misiune existentă')
        .addStringOption((option) =>
          option
            .setName('id')
            .setDescription('ID-ul misiunii')
            .setRequired(true)
            .setMaxLength(32),
        )
        .addStringOption((option) =>
          option
            .setName('nume')
            .setDescription('Numele nou')
            .setMinLength(NAME_MIN)
            .setMaxLength(NAME_MAX),
        )
        .addStringOption((option) =>
          option
            .setName('descriere')
            .setDescription('Descrierea nouă')
            .setMinLength(DESCRIPTION_MIN)
            .setMaxLength(DESCRIPTION_MAX),
        )
        .addStringOption((option) =>
          option
            .setName('tip')
            .setDescription('Tipul nou')
            .addChoices(...TYPES.map((type) => ({ name: TYPE_LABELS[type], value: type }))),
        )
        .addIntegerOption((option) =>
          option
            .setName('tinta')
            .setDescription('Ținta nouă')
            .setMinValue(TARGET_MIN)
            .setMaxValue(TARGET_MAX),
        )
        .addStringOption((option) =>
          option
            .setName('recurenta')
            .setDescription('Recurența nouă')
            .addChoices(
              ...RECURRENCES.map((recurrence) => ({
                name: RECURRENCE_LABELS[recurrence],
                value: recurrence,
              })),
            ),
        )
        .addIntegerOption((option) =>
          option
            .setName('monede')
            .setDescription('Recompensa nouă în monedă')
            .setMinValue(0)
            .setMaxValue(REWARD_COINS_MAX),
        )
        .addIntegerOption((option) =>
          option
            .setName('xp')
            .setDescription('Recompensa nouă în XP')
            .setMinValue(0)
            .setMaxValue(REWARD_XP_MAX),
        )
        .addBooleanOption((option) =>
          option.setName('activ').setDescription('Activează sau dezactivează misiunea'),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('sterge')
        .setDescription('Șterge o misiune și progresul ei')
        .addStringOption((option) =>
          option
            .setName('id')
            .setDescription('ID-ul misiunii')
            .setRequired(true)
            .setMaxLength(32),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand.setName('lista').setDescription('Vezi toate misiunile definite'),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('reseteaza')
        .setDescription('Resetează progresul misiunilor')
        .addStringOption((option) =>
          option
            .setName('misiune')
            .setDescription('ID-ul misiunii')
            .setMaxLength(32),
        )
        .addUserOption((option) =>
          option.setName('membru').setDescription('Membrul vizat'),
        )
        .addBooleanOption((option) =>
          option.setName('totul').setDescription('Resetează progresul tuturor misiunilor'),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand.setName('statistici').setDescription('Vezi statisticile misiunilor'),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('setari')
        .setDescription('Configurează canalul de log')
        .addChannelOption((option) =>
          option
            .setName('canal_log')
            .setDescription('Canalul pentru logurile misiunilor')
            .addChannelTypes(...TEXT_CHANNEL_TYPES),
        )
        .addBooleanOption((option) =>
          option
            .setName('reseteaza')
            .setDescription('Revine la valorile din .env'),
        ),
    ),

  async execute(interaction) {
    switch (interaction.options.getSubcommand()) {
      case 'creaza':
        return createCommand(interaction);
      case 'editeaza':
        return editCommand(interaction);
      case 'sterge':
        return deleteCommand(interaction);
      case 'lista':
        return listCommand(interaction);
      case 'reseteaza':
        return resetCommand(interaction);
      case 'statistici':
        return statsCommand(interaction);
      case 'setari':
        return settingsCommand(interaction);
      default:
        return undefined;
    }
  },
};
