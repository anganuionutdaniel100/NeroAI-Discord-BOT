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
  TAG_MIN,
  TAG_MAX,
  DESCRIPTION_MIN,
  DESCRIPTION_MAX,
  MAX_CLANS,
  MAX_MEMBERS_MIN,
  MAX_MEMBERS_MAX,
  INVITE_TTL_MIN,
  INVITE_TTL_MAX,
  CREATE_COST_MAX,
  findClan,
  getClans,
  getClansStats,
  getClanLevelInfo,
  getSettings,
  updateSettings,
  resetSettings,
  updateClan,
  disbandClan,
  adjustClanPoints,
  resetClanPoints,
  getActivity,
  flush,
} = require('../utils/clans');
const { sendClanLog } = require('../handlers/clans');

const TEXT_CHANNEL_TYPES = [ChannelType.GuildText, ChannelType.GuildAnnouncement];

const ACTIVITY_LABELS = {
  created: 'clan creat',
  invited: 'invitație trimisă',
  joined: 'membru adăugat',
  declined: 'invitație refuzată',
  left: 'membru ieșit',
  kicked: 'membru eliminat',
  transferred: 'conducere transferată',
  disbanded: 'clan dizolvat',
  deleted: 'clan șters',
  points: 'puncte ajustate',
  reset: 'puncte resetate',
};

function formatNumber(value) {
  return Number(value).toLocaleString('ro-RO');
}

function channelLabel(id) {
  return id ? `<#${id}>` : 'Neconfigurat';
}

function clanLabel(clan) {
  return `${clan.name} (${clan.tag})`;
}

function settingsEmbed(guild, settings) {
  const stats = getClansStats(guild.id);

  return new EmbedBuilder()
    .setColor(0x8b5cf6)
    .setTitle('Clanuri — setări')
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
        name: 'Membri maximi per clan',
        value: String(settings.maxMembers),
        inline: true,
      },
      {
        name: 'Valabilitate invitații',
        value: `${settings.inviteTtlHours} ore`,
        inline: true,
      },
      {
        name: 'Cost creare',
        value:
          settings.createCost > 0
            ? `${formatNumber(settings.createCost)} ${config.economy.currency}`
            : 'Gratuit',
        inline: true,
      },
      {
        name: 'Clanuri',
        value: `${stats.total} / ${MAX_CLANS}`,
        inline: true,
      },
      {
        name: 'Membri în clanuri',
        value: formatNumber(stats.members),
        inline: true,
      },
      {
        name: 'Invitații în așteptare',
        value: formatNumber(stats.pendingInvites),
        inline: true,
      },
    )
    .setFooter({
      text: 'Setările din dashboard au prioritate față de valorile din .env.',
    });
}

async function settingsCommand(interaction) {
  const guild = interaction.guild;
  const reset = interaction.options.getBoolean('reseteaza') ?? false;
  const maxMembers = interaction.options.getInteger('max_membri');
  const inviteTtl = interaction.options.getInteger('ore_invitatie');
  const createCost = interaction.options.getInteger('cost_creare');
  const logChannel = interaction.options.getChannel('canal_log');

  let settings;

  if (reset) {
    settings = resetSettings(guild.id);
  } else {
    const patch = {};
    if (maxMembers !== null) patch.maxMembers = maxMembers;
    if (inviteTtl !== null) patch.inviteTtlHours = inviteTtl;
    if (createCost !== null) patch.createCost = createCost;
    if (logChannel) patch.logChannelId = logChannel.id;

    if (!Object.keys(patch).length) {
      return interaction.reply({
        embeds: [settingsEmbed(guild, getSettings(guild.id))],
        flags: MessageFlags.Ephemeral,
      });
    }

    settings = updateSettings(guild.id, patch);
  }

  flush();

  await sendClanLog(guild, {
    action: 'setări actualizate',
    actorTag: interaction.user.tag,
    fields: [
      { name: 'Membri maximi', value: String(settings.maxMembers), inline: true },
      { name: 'Invitații valabile', value: `${settings.inviteTtlHours} ore`, inline: true },
      {
        name: 'Cost creare',
        value:
          settings.createCost > 0
            ? `${formatNumber(settings.createCost)} ${config.economy.currency}`
            : 'Gratuit',
        inline: true,
      },
    ],
  });

  return interaction.reply({
    content: reset
      ? 'Setările clanurilor au fost resetate la valorile din .env.'
      : 'Setările clanurilor au fost actualizate.',
    embeds: [settingsEmbed(guild, settings)],
    flags: MessageFlags.Ephemeral,
  });
}

async function editCommand(interaction) {
  const guild = interaction.guild;
  const query = interaction.options.getString('clan', true);
  const clan = findClan(guild.id, query);

  if (!clan) {
    return interaction.reply({
      content: 'Clanul nu a fost găsit. Folosește /clan-admin lista pentru ID-uri.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const patch = {};
  const name = interaction.options.getString('nume');
  const tag = interaction.options.getString('tag');
  const description = interaction.options.getString('descriere');

  if (name !== null) patch.name = name;
  if (tag !== null) patch.tag = tag;
  if (description !== null) patch.description = description;

  if (!Object.keys(patch).length) {
    return interaction.reply({
      content: 'Nu ai trimis nicio modificare.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const result = updateClan(guild.id, clan.id, patch);
  if (!result.ok) {
    return interaction.reply({ content: result.error, flags: MessageFlags.Ephemeral });
  }

  flush();

  await sendClanLog(guild, {
    action: 'clan actualizat',
    actorTag: interaction.user.tag,
    fields: [
      { name: 'Clan', value: clanLabel(result.clan), inline: false },
      { name: 'Nume', value: result.clan.name, inline: true },
      { name: 'Tag', value: result.clan.tag, inline: true },
    ],
  });

  return interaction.reply({
    content: `Clanul **${result.clan.name}** a fost actualizat.`,
    flags: MessageFlags.Ephemeral,
  });
}

async function deleteCommand(interaction) {
  const guild = interaction.guild;
  const query = interaction.options.getString('clan', true);
  const reason = interaction.options.getString('motiv');
  const clan = findClan(guild.id, query);

  if (!clan) {
    return interaction.reply({
      content: 'Clanul nu a fost găsit.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const result = disbandClan(guild.id, clan.id, interaction.user.id, { force: true });
  if (!result.ok) {
    return interaction.reply({ content: result.error, flags: MessageFlags.Ephemeral });
  }

  flush();

  const fields = [
    { name: 'Clan', value: clanLabel(result.clan), inline: false },
    { name: 'Membri', value: String(result.clan.members.length), inline: true },
    { name: 'Puncte', value: formatNumber(result.clan.points), inline: true },
  ];
  if (reason) fields.push({ name: 'Motiv', value: reason.slice(0, 200), inline: false });

  await sendClanLog(guild, {
    action: 'clan șters',
    actorTag: interaction.user.tag,
    fields,
  });

  return interaction.reply({
    content: `Clanul **${result.clan.name}** a fost șters.`,
    flags: MessageFlags.Ephemeral,
  });
}

async function pointsCommand(interaction) {
  const guild = interaction.guild;
  const query = interaction.options.getString('clan', true);
  const delta = interaction.options.getInteger('puncte', true);
  const clan = findClan(guild.id, query);

  if (!clan) {
    return interaction.reply({
      content: 'Clanul nu a fost găsit.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const result = adjustClanPoints(guild.id, clan.id, delta);
  if (!result.ok) {
    return interaction.reply({ content: result.error, flags: MessageFlags.Ephemeral });
  }

  flush();

  const levelInfo = getClanLevelInfo(result.clan.points);

  await sendClanLog(guild, {
    action: 'puncte ajustate',
    actorTag: interaction.user.tag,
    fields: [
      { name: 'Clan', value: clanLabel(result.clan), inline: false },
      { name: 'Ajustare', value: `${delta > 0 ? '+' : ''}${formatNumber(delta)}`, inline: true },
      {
        name: 'Total',
        value: `${formatNumber(result.clan.points)} • nivel ${levelInfo.level}`,
        inline: true,
      },
    ],
  });

  return interaction.reply({
    content: `Punctajul clanului **${result.clan.name}** este acum ${formatNumber(result.clan.points)} (nivel ${levelInfo.level}).`,
    flags: MessageFlags.Ephemeral,
  });
}

async function resetCommand(interaction) {
  const guild = interaction.guild;
  const query = interaction.options.getString('clan', true);
  const clan = findClan(guild.id, query);

  if (!clan) {
    return interaction.reply({
      content: 'Clanul nu a fost găsit.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const result = resetClanPoints(guild.id, clan.id);
  if (!result.ok) {
    return interaction.reply({ content: result.error, flags: MessageFlags.Ephemeral });
  }

  flush();

  await sendClanLog(guild, {
    action: 'puncte resetate',
    actorTag: interaction.user.tag,
    fields: [{ name: 'Clan', value: clanLabel(result.clan), inline: false }],
  });

  return interaction.reply({
    content: `Punctele clanului **${result.clan.name}** au fost resetate.`,
    flags: MessageFlags.Ephemeral,
  });
}

function listCommand(interaction) {
  const clans = getClans(interaction.guild.id);

  if (!clans.length) {
    return interaction.reply({
      content: 'Nu există clanuri pe acest server.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const lines = clans.map((clan) => {
    const levelInfo = getClanLevelInfo(clan.points);
    return [
      `• **${clan.name}** (${clan.tag}) — \`${clan.id}\``,
      `${clan.members.length} membri • ${formatNumber(clan.points)} puncte • nivel ${levelInfo.level} • conducător <@${clan.ownerId}>`,
    ].join('\n');
  });

  const embed = new EmbedBuilder()
    .setColor(0x8b5cf6)
    .setTitle('Clanuri definite')
    .setDescription(lines.join('\n\n').slice(0, 4096))
    .setFooter({ text: `${clans.length} clanuri • /clan-admin editeaza pentru modificări` })
    .setTimestamp();

  return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

function statsCommand(interaction) {
  const guild = interaction.guild;
  const stats = getClansStats(guild.id);
  const settings = getSettings(guild.id);
  const top = getClans(guild.id).slice(0, 5);
  const activity = getActivity(guild.id, 8);

  const embed = new EmbedBuilder()
    .setColor(0x8b5cf6)
    .setTitle('Clanuri — statistici')
    .addFields(
      { name: 'Clanuri', value: String(stats.total), inline: true },
      { name: 'Membri în clanuri', value: formatNumber(stats.members), inline: true },
      { name: 'Puncte totale', value: formatNumber(stats.points), inline: true },
      {
        name: 'Dimensiune medie',
        value: stats.averageSize ? stats.averageSize.toFixed(1) : '0',
        inline: true,
      },
      {
        name: 'Invitații în așteptare',
        value: formatNumber(stats.pendingInvites),
        inline: true,
      },
      {
        name: 'Cost creare',
        value:
          settings.createCost > 0
            ? `${formatNumber(settings.createCost)} ${config.economy.currency}`
            : 'Gratuit',
        inline: true,
      },
    )
    .setTimestamp();

  if (top.length) {
    embed.addFields({
      name: 'Top clanuri',
      value: top
        .map(
          (clan, index) =>
            `**${index + 1}.** ${clan.tag} • ${clan.name} — ${formatNumber(clan.points)} puncte, ${clan.members.length} membri`,
        )
        .join('\n'),
      inline: false,
    });
  }

  if (activity.length) {
    embed.addFields({
      name: 'Activitate recentă',
      value: activity
        .map((entry) => {
          const label = ACTIVITY_LABELS[entry.type] ?? entry.type;
          const user = entry.userId ? ` • <@${entry.userId}>` : '';
          const detail = entry.detail ? ` • ${entry.detail}` : '';
          return `• <t:${Math.floor(entry.at / 1000)}:R> **${entry.clanName}** — ${label}${user}${detail}`;
        })
        .join('\n')
        .slice(0, 1024),
      inline: false,
    });
  }

  return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

module.exports = {
  category: 'Clanuri',
  data: new SlashCommandBuilder()
    .setName('clan-admin')
    .setDescription('Administrează sistemul de clanuri')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((subcommand) =>
      subcommand
        .setName('setari')
        .setDescription('Configurează limitele și canalul de log')
        .addIntegerOption((option) =>
          option
            .setName('max_membri')
            .setDescription('Numărul maxim de membri per clan')
            .setMinValue(MAX_MEMBERS_MIN)
            .setMaxValue(MAX_MEMBERS_MAX),
        )
        .addIntegerOption((option) =>
          option
            .setName('ore_invitatie')
            .setDescription('Cât timp rămân valabile invitațiile')
            .setMinValue(INVITE_TTL_MIN)
            .setMaxValue(INVITE_TTL_MAX),
        )
        .addIntegerOption((option) =>
          option
            .setName('cost_creare')
            .setDescription('Costul în monedă pentru crearea unui clan')
            .setMinValue(0)
            .setMaxValue(CREATE_COST_MAX),
        )
        .addChannelOption((option) =>
          option
            .setName('canal_log')
            .setDescription('Canalul pentru logurile clanurilor')
            .addChannelTypes(...TEXT_CHANNEL_TYPES),
        )
        .addBooleanOption((option) =>
          option
            .setName('reseteaza')
            .setDescription('Revine la valorile din .env'),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('editeaza')
        .setDescription('Modifică datele unui clan')
        .addStringOption((option) =>
          option
            .setName('clan')
            .setDescription('Numele, tag-ul sau ID-ul clanului')
            .setRequired(true)
            .setMaxLength(64),
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
            .setName('tag')
            .setDescription('Tag-ul nou')
            .setMinLength(TAG_MIN)
            .setMaxLength(TAG_MAX),
        )
        .addStringOption((option) =>
          option
            .setName('descriere')
            .setDescription('Descrierea nouă')
            .setMinLength(DESCRIPTION_MIN)
            .setMaxLength(DESCRIPTION_MAX),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('sterge')
        .setDescription('Șterge un clan')
        .addStringOption((option) =>
          option
            .setName('clan')
            .setDescription('Numele, tag-ul sau ID-ul clanului')
            .setRequired(true)
            .setMaxLength(64),
        )
        .addStringOption((option) =>
          option
            .setName('motiv')
            .setDescription('Motivul ștergerii')
            .setMaxLength(200),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('puncte')
        .setDescription('Ajustează punctele unui clan')
        .addStringOption((option) =>
          option
            .setName('clan')
            .setDescription('Numele, tag-ul sau ID-ul clanului')
            .setRequired(true)
            .setMaxLength(64),
        )
        .addIntegerOption((option) =>
          option
            .setName('puncte')
            .setDescription('Valoarea adăugată sau scăzută')
            .setRequired(true)
            .setMinValue(-1_000_000)
            .setMaxValue(1_000_000),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('reseteaza')
        .setDescription('Resetează punctele unui clan')
        .addStringOption((option) =>
          option
            .setName('clan')
            .setDescription('Numele, tag-ul sau ID-ul clanului')
            .setRequired(true)
            .setMaxLength(64),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand.setName('lista').setDescription('Vezi toate clanurile cu ID-uri'),
    )
    .addSubcommand((subcommand) =>
      subcommand.setName('statistici').setDescription('Vezi statisticile clanurilor'),
    ),

  async execute(interaction) {
    switch (interaction.options.getSubcommand()) {
      case 'setari':
        return settingsCommand(interaction);
      case 'editeaza':
        return editCommand(interaction);
      case 'sterge':
        return deleteCommand(interaction);
      case 'puncte':
        return pointsCommand(interaction);
      case 'reseteaza':
        return resetCommand(interaction);
      case 'lista':
        return listCommand(interaction);
      case 'statistici':
        return statsCommand(interaction);
      default:
        return undefined;
    }
  },
};
