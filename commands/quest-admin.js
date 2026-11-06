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
  LEVEL_MIN,
  LEVEL_MAX,
  STEP_MIN,
  STEP_MAX,
  REWARD_COINS_MAX,
  REWARD_XP_MAX,
  MAX_QUESTS,
  MAX_ACTIVE_MIN,
  MAX_ACTIVE_MAX,
  TYPES,
  TYPE_LABELS,
  getQuest,
  getQuestSummaries,
  getQuestsStats,
  getClaimLeaderboard,
  getSettings,
  updateSettings,
  createQuest,
  updateQuest,
  deleteQuest,
  resetProgress,
  flush,
} = require('../utils/quests');
const { sendQuestsLog } = require('../handlers/quests');

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

function questLabel(quest) {
  return `${quest.name} (\`${quest.id}\`)`;
}

function stepsLabel(quest) {
  return quest.steps
    .map((step, index) => `${index + 1}. ${TYPE_LABELS[step.type]} — ${formatNumber(step.target)}`)
    .join(' → ');
}

function requirementLabel(quest, guildId) {
  const parts = [];
  if (quest.requiredLevel > 0) parts.push(`nivel ${quest.requiredLevel}+`);
  if (quest.prerequisiteId) {
    const prerequisite = getQuest(guildId, quest.prerequisiteId);
    parts.push(`după „${prerequisite?.name ?? quest.prerequisiteId}”`);
  }
  return parts.length ? parts.join(' • ') : 'Fără cerințe';
}

function settingsEmbed(guild, settings) {
  const stats = getQuestsStats(guild.id);

  return new EmbedBuilder()
    .setColor(0xf59e0b)
    .setTitle('Quest-uri — setări')
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
        name: 'Quest-uri active simultan',
        value: String(settings.maxActive),
        inline: true,
      },
      {
        name: 'Quest-uri definite',
        value: `${stats.total} (${stats.active} active)`,
        inline: true,
      },
      {
        name: 'Locuri disponibile',
        value: String(Math.max(0, MAX_QUESTS - stats.total)),
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
  const maxActive = interaction.options.getInteger('max_active');
  const reset = interaction.options.getBoolean('reseteaza') ?? false;

  const patch = {};
  if (reset) {
    patch.logChannelId = null;
    patch.maxActive = null;
  } else {
    if (logChannel) patch.logChannelId = logChannel.id;
    if (maxActive !== null) patch.maxActive = maxActive;
  }

  if (!Object.keys(patch).length) {
    return interaction.reply({
      embeds: [settingsEmbed(guild, getSettings(guild.id))],
      flags: MessageFlags.Ephemeral,
    });
  }

  const settings = updateSettings(guild.id, patch);
  flush();

  await sendQuestsLog(guild, {
    action: 'setări actualizate',
    actorTag: interaction.user.tag,
    fields: [
      { name: 'Canal log', value: channelLabel(settings.logChannelId), inline: true },
      { name: 'Quest-uri active', value: String(settings.maxActive), inline: true },
    ],
  });

  return interaction.reply({
    content: reset
      ? 'Setările quest-urilor au fost resetate la valorile din .env.'
      : 'Setările quest-urilor au fost actualizate.',
    embeds: [settingsEmbed(guild, settings)],
    flags: MessageFlags.Ephemeral,
  });
}

async function createCommand(interaction) {
  const guild = interaction.guild;
  const quest = createQuest({
    guildId: guild.id,
    name: interaction.options.getString('nume', true),
    description: interaction.options.getString('descriere', true),
    steps: interaction.options.getString('pasi', true),
    requiredLevel: interaction.options.getInteger('nivel') ?? 0,
    prerequisiteId: interaction.options.getString('prerechizit') ?? null,
    rewardCoins: interaction.options.getInteger('monede') ?? 0,
    rewardXp: interaction.options.getInteger('xp') ?? 0,
    createdBy: interaction.user.id,
    createdByTag: interaction.user.tag,
  });

  if (!quest) {
    return interaction.reply({
      content: [
        'Questul nu a putut fi creat.',
        `Verifică numele (${NAME_MIN}-${NAME_MAX} caractere, unic), descrierea (${DESCRIPTION_MIN}-${DESCRIPTION_MAX}), cerințele și recompensele.`,
        `Pașii se scriu în ordine, separați prin virgulă: ${STEP_MIN}-${STEP_MAX} pași, ex. \`messages:20, voice:30, invites:2\`.`,
        `Tipuri disponibile: ${TYPES.map((type) => `${type} (${TYPE_LABELS[type]})`).join(', ')}.`,
      ].join(' '),
      flags: MessageFlags.Ephemeral,
    });
  }

  flush();

  await sendQuestsLog(guild, {
    action: 'quest creat',
    actorTag: interaction.user.tag,
    fields: [
      { name: 'Quest', value: questLabel(quest), inline: false },
      { name: 'Pași', value: stepsLabel(quest), inline: false },
      { name: 'Cerințe', value: requirementLabel(quest, guild.id), inline: true },
      { name: 'Recompensă', value: rewardLabel(quest.rewardCoins, quest.rewardXp), inline: true },
    ],
  });

  return interaction.reply({
    content: `Questul **${quest.name}** a fost creat cu ID-ul \`${quest.id}\`.\n${stepsLabel(quest)}`,
    flags: MessageFlags.Ephemeral,
  });
}

async function editCommand(interaction) {
  const guild = interaction.guild;
  const id = interaction.options.getString('id', true).trim().toLowerCase();
  const quest = getQuest(guild.id, id);

  if (!quest) {
    return interaction.reply({
      content: 'Questul nu a fost găsit. Folosește /quest-admin lista pentru ID-uri.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const patch = {};
  const fields = {
    nume: 'name',
    descriere: 'description',
    pasi: 'steps',
    nivel: 'requiredLevel',
    prerechizit: 'prerequisiteId',
    monede: 'rewardCoins',
    xp: 'rewardXp',
  };

  for (const [option, key] of Object.entries(fields)) {
    const value = interaction.options.get(option);
    if (value !== null && value !== undefined) patch[key] = value;
  }

  if (interaction.options.getBoolean('fara_prerechizit')) {
    patch.prerequisiteId = null;
  }

  const active = interaction.options.getBoolean('activ');
  if (active !== null) patch.active = active;

  if (!Object.keys(patch).length) {
    return interaction.reply({
      content: 'Nu ai trimis nicio modificare.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const updated = updateQuest(guild.id, quest.id, patch);
  if (!updated) {
    return interaction.reply({
      content:
        'Modificările nu au putut fi aplicate. Verifică numele unic, descrierea, pașii, cerințele și recompensele. Schimbarea pașilor resetează progresul quest-ului.',
      flags: MessageFlags.Ephemeral,
    });
  }

  flush();

  await sendQuestsLog(guild, {
    action: 'quest actualizat',
    actorTag: interaction.user.tag,
    fields: [
      { name: 'Quest', value: questLabel(updated), inline: false },
      { name: 'Status', value: updated.active ? 'Activ' : 'Inactiv', inline: true },
      { name: 'Pași', value: stepsLabel(updated), inline: false },
      { name: 'Cerințe', value: requirementLabel(updated, guild.id), inline: true },
      { name: 'Recompensă', value: rewardLabel(updated.rewardCoins, updated.rewardXp), inline: true },
    ],
  });

  return interaction.reply({
    content: `Questul **${updated.name}** a fost actualizat.`,
    embeds: [
      new EmbedBuilder()
        .setColor(0xf59e0b)
        .setTitle('Quest actualizat')
        .addFields(
          { name: 'Nume', value: updated.name, inline: true },
          { name: 'Status', value: updated.active ? 'Activ' : 'Inactiv', inline: true },
          { name: 'Cerințe', value: requirementLabel(updated, guild.id), inline: true },
          { name: 'Pași', value: stepsLabel(updated), inline: false },
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
  const removed = deleteQuest(guild.id, id);

  if (!removed) {
    return interaction.reply({
      content: 'Questul nu a fost găsit.',
      flags: MessageFlags.Ephemeral,
    });
  }

  flush();

  await sendQuestsLog(guild, {
    action: 'quest șters',
    actorTag: interaction.user.tag,
    fields: [
      { name: 'Quest', value: questLabel(removed), inline: false },
      { name: 'Pași', value: stepsLabel(removed), inline: false },
    ],
  });

  return interaction.reply({
    content: `Questul **${removed.name}** a fost șters împreună cu progresul aferent.`,
    flags: MessageFlags.Ephemeral,
  });
}

function listCommand(interaction) {
  const summaries = getQuestSummaries(interaction.guild.id);

  if (!summaries.length) {
    return interaction.reply({
      content: 'Nu există quest-uri definite. Creează unul cu /quest-admin creaza.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const lines = summaries.map((quest) => {
    const status = quest.active ? 'activ' : 'inactiv';
    return [
      `• **${quest.name}** (\`${quest.id}\`) — ${status}`,
      stepsLabel(quest),
      `Cerințe: ${requirementLabel(quest, interaction.guild.id)} • recompensă: ${rewardLabel(quest.rewardCoins, quest.rewardXp)}`,
      `Participanți ${quest.participants} • în progres ${quest.started} • finalizări ${quest.completed} • revendicări ${quest.claimed}`,
    ].join('\n');
  });

  const embed = new EmbedBuilder()
    .setColor(0xf59e0b)
    .setTitle('Quest-uri definite')
    .setDescription(lines.join('\n\n').slice(0, 4096))
    .setFooter({
      text: `${summaries.length} quest-uri • /quest-admin editeaza pentru modificări`,
    })
    .setTimestamp();

  return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

async function resetCommand(interaction) {
  const guild = interaction.guild;
  const questId = interaction.options.getString('quest')?.trim().toLowerCase() ?? null;
  const user = interaction.options.getUser('membru');
  const everything = interaction.options.getBoolean('totul') ?? false;

  if (!questId && !user && !everything) {
    return interaction.reply({
      content: 'Alege ce resetezi: un quest, un membru, ambele sau folosește opțiunea totul.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const quest = questId ? getQuest(guild.id, questId) : null;
  if (questId && !quest) {
    return interaction.reply({
      content: 'Questul nu a fost găsit.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const removed = resetProgress(guild.id, {
    questId: everything ? null : quest?.id ?? null,
    userId: everything ? null : user?.id ?? null,
  });
  flush();

  const scope = everything
    ? 'tot progresul quest-urilor de pe server'
    : quest && user
      ? `questul **${quest.name}** pentru ${user.tag}`
      : quest
        ? `questul **${quest.name}** pentru toți membrii`
        : `progresul quest-urilor lui ${user.tag}`;

  await sendQuestsLog(guild, {
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
  const stats = getQuestsStats(interaction.guild.id);
  const leaderboard = getClaimLeaderboard(interaction.guild.id, 10);

  const embed = new EmbedBuilder()
    .setColor(0xf59e0b)
    .setTitle('Quest-uri — statistici')
    .addFields(
      { name: 'Quest-uri definite', value: String(stats.total), inline: true },
      { name: 'Active', value: String(stats.active), inline: true },
      { name: 'Pași definiți', value: String(stats.steps), inline: true },
      { name: 'Membri urmăriți', value: String(stats.trackedMembers), inline: true },
      { name: 'Quest-uri în progres', value: String(stats.started), inline: true },
      { name: 'Finalizări totale', value: String(stats.completed), inline: true },
      { name: 'Finalizări curente', value: String(stats.completedNow), inline: true },
      { name: 'Recompense revendicate', value: String(stats.claims), inline: true },
      {
        name: 'Limită activă',
        value: `${stats.maxActive} quest-uri simultan`,
        inline: true,
      },
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
  category: 'Quest-uri',
  data: new SlashCommandBuilder()
    .setName('quest-admin')
    .setDescription('Administrează sistemul de quest-uri')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((subcommand) =>
      subcommand
        .setName('creaza')
        .setDescription('Creează un quest nou')
        .addStringOption((option) =>
          option
            .setName('nume')
            .setDescription('Numele questului')
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
            .setName('pasi')
            .setDescription('Pașii în ordine, ex: messages:20, voice:30, invites:2')
            .setRequired(true)
            .setMinLength(3)
            .setMaxLength(300),
        )
        .addIntegerOption((option) =>
          option
            .setName('nivel')
            .setDescription('Nivelul minim necesar pentru a începe')
            .setMinValue(LEVEL_MIN)
            .setMaxValue(LEVEL_MAX),
        )
        .addStringOption((option) =>
          option
            .setName('prerechizit')
            .setDescription('Questul care trebuie revendicat înainte')
            .setAutocomplete(true),
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
        .setDescription('Modifică un quest existent')
        .addStringOption((option) =>
          option
            .setName('id')
            .setDescription('ID-ul questului')
            .setRequired(true)
            .setAutocomplete(true),
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
            .setName('pasi')
            .setDescription('Pașii noi, ex: messages:20, voice:30')
            .setMinLength(3)
            .setMaxLength(300),
        )
        .addIntegerOption((option) =>
          option
            .setName('nivel')
            .setDescription('Nivelul minim nou')
            .setMinValue(LEVEL_MIN)
            .setMaxValue(LEVEL_MAX),
        )
        .addStringOption((option) =>
          option
            .setName('prerechizit')
            .setDescription('Noul quest prerechizit')
            .setAutocomplete(true),
        )
        .addBooleanOption((option) =>
          option.setName('fara_prerechizit').setDescription('Elimină questul prerechizit'),
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
          option.setName('activ').setDescription('Activează sau dezactivează questul'),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('sterge')
        .setDescription('Șterge un quest și progresul lui')
        .addStringOption((option) =>
          option
            .setName('id')
            .setDescription('ID-ul questului')
            .setRequired(true)
            .setAutocomplete(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand.setName('lista').setDescription('Vezi toate quest-urile definite'),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('reseteaza')
        .setDescription('Resetează progresul quest-urilor')
        .addStringOption((option) =>
          option
            .setName('quest')
            .setDescription('ID-ul questului')
            .setAutocomplete(true),
        )
        .addUserOption((option) => option.setName('membru').setDescription('Membrul vizat'))
        .addBooleanOption((option) =>
          option.setName('totul').setDescription('Resetează progresul tuturor quest-urilor'),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand.setName('statistici').setDescription('Vezi statisticile quest-urilor'),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('setari')
        .setDescription('Configurează canalul de log și limita de quest-uri active')
        .addChannelOption((option) =>
          option
            .setName('canal_log')
            .setDescription('Canalul pentru logurile quest-urilor')
            .addChannelTypes(...TEXT_CHANNEL_TYPES),
        )
        .addIntegerOption((option) =>
          option
            .setName('max_active')
            .setDescription('Câte quest-uri poate avea un membru simultan')
            .setMinValue(MAX_ACTIVE_MIN)
            .setMaxValue(MAX_ACTIVE_MAX),
        )
        .addBooleanOption((option) =>
          option.setName('reseteaza').setDescription('Revine la valorile din .env'),
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
