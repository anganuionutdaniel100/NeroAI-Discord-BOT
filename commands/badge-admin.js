const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  MessageFlags,
} = require('discord.js');
const {
  NAME_MIN,
  NAME_MAX,
  DESCRIPTION_MAX,
  REASON_MAX,
  normalizeName,
  normalizeReason,
  normalizeColor,
  colorToHex,
  findBadgeByName,
  createBadge,
  getBadge,
  updateBadge,
  deleteBadge,
  getBadges,
  getAwards,
  awardBadge,
  revokeAward,
  flush,
} = require('../utils/badges');
const { sendBadgeLog, sendBadgeDm } = require('../handlers/badges');

function resolveBadge(guildId, input) {
  if (!input) return null;
  const id = String(input).trim().toLowerCase();
  const direct = getBadge(id);
  if (direct && direct.guildId === guildId) return direct;
  return findBadgeByName(guildId, input);
}

function invalidColor() {
  return 'Culoarea trebuie să fie în format hexazecimal, de exemplu `#8b5cf6`.';
}

async function create(interaction) {
  const name = normalizeName(interaction.options.getString('nume', true));
  if (!name) {
    return interaction.reply({
      content: `Numele badge-ului trebuie să aibă între ${NAME_MIN} și ${NAME_MAX} de caractere.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  if (findBadgeByName(interaction.guild.id, name)) {
    return interaction.reply({
      content: `Există deja un badge numit **${name}**.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  const color = normalizeColor(interaction.options.getString('culoare'));
  if (color === null) {
    return interaction.reply({ content: invalidColor(), flags: MessageFlags.Ephemeral });
  }

  const badge = createBadge({
    guildId: interaction.guild.id,
    name,
    description: interaction.options.getString('descriere'),
    color,
    createdBy: interaction.user.id,
    createdByTag: interaction.user.tag,
  });

  if (!badge) {
    return interaction.reply({
      content: 'Badge-ul nu a putut fi creat. Verifică datele introduse.',
      flags: MessageFlags.Ephemeral,
    });
  }
  flush();

  await interaction.reply({
    content: `Badge-ul **${badge.name}** a fost creat (${colorToHex(badge.color)}). ID: \`${badge.id}\``,
    flags: MessageFlags.Ephemeral,
  });

  await sendBadgeLog(interaction.guild, {
    action: 'creat',
    badge,
    actor: interaction.user,
  });
}

async function edit(interaction) {
  const badge = resolveBadge(
    interaction.guild.id,
    interaction.options.getString('badge', true),
  );
  if (!badge) {
    return interaction.reply({
      content: 'Badge-ul nu există pe acest server. Folosește `/badge-admin lista`.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const nameRaw = interaction.options.getString('nume');
  const descriptionRaw = interaction.options.getString('descriere');
  const colorRaw = interaction.options.getString('culoare');
  const clearDescription = interaction.options.getBoolean('fara_descriere') ?? false;

  if (nameRaw === null && descriptionRaw === null && colorRaw === null && !clearDescription) {
    return interaction.reply({
      content: 'Specifică cel puțin o modificare.',
      flags: MessageFlags.Ephemeral,
    });
  }

  if (descriptionRaw !== null && clearDescription) {
    return interaction.reply({
      content: 'Nu poți seta o descriere și simultan să o elimini.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const patch = {};

  if (nameRaw !== null) {
    const name = normalizeName(nameRaw);
    if (!name) {
      return interaction.reply({
        content: `Numele badge-ului trebuie să aibă între ${NAME_MIN} și ${NAME_MAX} de caractere.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    const existing = findBadgeByName(interaction.guild.id, name);
    if (existing && existing.id !== badge.id) {
      return interaction.reply({
        content: `Există deja un badge numit **${name}**.`,
        flags: MessageFlags.Ephemeral,
      });
    }
    patch.name = name;
  }

  if (clearDescription) patch.description = null;
  else if (descriptionRaw !== null) patch.description = descriptionRaw;

  if (colorRaw !== null) {
    const color = normalizeColor(colorRaw);
    if (color === null) {
      return interaction.reply({ content: invalidColor(), flags: MessageFlags.Ephemeral });
    }
    patch.color = color;
  }

  const updated = updateBadge(badge.id, patch);
  if (!updated) {
    return interaction.reply({
      content: 'Badge-ul nu a putut fi actualizat. Verifică datele introduse.',
      flags: MessageFlags.Ephemeral,
    });
  }
  flush();

  await interaction.reply({
    content: `Badge-ul **${updated.name}** (\`${updated.id}\`) a fost actualizat.`,
    flags: MessageFlags.Ephemeral,
  });

  await sendBadgeLog(interaction.guild, {
    action: 'actualizat',
    badge: updated,
    actor: interaction.user,
  });
}

async function remove(interaction) {
  const badge = resolveBadge(
    interaction.guild.id,
    interaction.options.getString('badge', true),
  );
  if (!badge) {
    return interaction.reply({
      content: 'Badge-ul nu există pe acest server. Folosește `/badge-admin lista`.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const result = deleteBadge(badge.id);
  flush();

  await interaction.reply({
    content: `Badge-ul **${result.badge.name}** a fost șters, împreună cu ${result.removedAwards} ${result.removedAwards === 1 ? 'acordare' : 'acordări'}.`,
    flags: MessageFlags.Ephemeral,
  });

  await sendBadgeLog(interaction.guild, {
    action: 'șters',
    badge: result.badge,
    actor: interaction.user,
    removedAwards: result.removedAwards,
  });
}

async function resolveMember(interaction) {
  const user = interaction.options.getUser('membru', true);

  if (user.bot) {
    return { error: 'Boții nu pot primi badge-uri.' };
  }

  const member = await interaction.guild.members.fetch(user.id).catch(() => null);
  if (!member) {
    return { error: 'Membrul selectat nu este pe acest server.' };
  }

  return { user, member };
}

async function award(interaction) {
  const badge = resolveBadge(
    interaction.guild.id,
    interaction.options.getString('badge', true),
  );
  if (!badge) {
    return interaction.reply({
      content: 'Badge-ul nu există pe acest server. Folosește `/badge-admin lista`.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const target = await resolveMember(interaction);
  if (target.error) {
    return interaction.reply({
      content: target.error,
      flags: MessageFlags.Ephemeral,
    });
  }

  const reason = normalizeReason(interaction.options.getString('motiv'));
  const result = awardBadge({
    guildId: interaction.guild.id,
    badgeId: badge.id,
    userId: target.user.id,
    userTag: target.user.tag,
    reason,
    awardedBy: interaction.user.id,
    awardedByTag: interaction.user.tag,
  });

  if (!result) {
    return interaction.reply({
      content: 'Badge-ul nu a putut fi acordat.',
      flags: MessageFlags.Ephemeral,
    });
  }

  if (result.duplicate) {
    return interaction.reply({
      content: `Membrul are deja badge-ul **${badge.name}**.`,
      flags: MessageFlags.Ephemeral,
    });
  }
  flush();

  await interaction.reply({
    content: `Badge-ul **${badge.name}** i-a fost acordat lui <@${target.user.id}>.`,
    flags: MessageFlags.Ephemeral,
  });

  await sendBadgeDm(target.user, interaction.guild, badge, reason);
  await sendBadgeLog(interaction.guild, {
    action: 'acordat',
    badge,
    member: target.user,
    actor: interaction.user,
    reason,
  });
}

async function revoke(interaction) {
  const badge = resolveBadge(
    interaction.guild.id,
    interaction.options.getString('badge', true),
  );
  if (!badge) {
    return interaction.reply({
      content: 'Badge-ul nu există pe acest server. Folosește `/badge-admin lista`.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const target = await resolveMember(interaction);
  if (target.error) {
    return interaction.reply({
      content: target.error,
      flags: MessageFlags.Ephemeral,
    });
  }

  const award = getAwards(interaction.guild.id, {
    badgeId: badge.id,
    userId: target.user.id,
  })[0];

  if (!award) {
    return interaction.reply({
      content: `Membrul nu are badge-ul **${badge.name}**.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  revokeAward(award.id);
  flush();

  await interaction.reply({
    content: `Badge-ul **${badge.name}** a fost retras de la <@${target.user.id}>.`,
    flags: MessageFlags.Ephemeral,
  });

  await sendBadgeLog(interaction.guild, {
    action: 'retras',
    badge,
    member: target.user,
    actor: interaction.user,
  });
}

async function list(interaction) {
  const badges = getBadges(interaction.guild.id);
  if (!badges.length) {
    return interaction.reply({
      content: 'Nu există badge-uri. Creează primul cu `/badge-admin creaza`.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const awards = getAwards(interaction.guild.id);
  const counts = new Map();
  for (const award of awards) {
    counts.set(award.badgeId, (counts.get(award.badgeId) ?? 0) + 1);
  }

  const embed = new EmbedBuilder()
    .setColor(0x8b5cf6)
    .setTitle('Badge-urile serverului')
    .setFooter({
      text: `${badges.length} badge-uri • ${awards.length} acordări`,
    })
    .setTimestamp();

  for (const badge of badges.slice(0, 20)) {
    embed.addFields({
      name: badge.name.slice(0, 256),
      value: [
        badge.description ?? 'Fără descriere',
        `Acordări: ${counts.get(badge.id) ?? 0}`,
        `Culoare: ${colorToHex(badge.color)}`,
        `ID: ${badge.id}`,
      ]
        .join('\n')
        .slice(0, 1024),
    });
  }

  if (badges.length > 20) {
    embed.setDescription(`Sunt afișate primele 20 din ${badges.length} badge-uri.`);
  }

  return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

module.exports = {
  category: 'Badge-uri',
  data: new SlashCommandBuilder()
    .setName('badge-admin')
    .setDescription('Administrează badge-urile serverului')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((subcommand) =>
      subcommand
        .setName('creaza')
        .setDescription('Creează un badge nou')
        .addStringOption((option) =>
          option
            .setName('nume')
            .setDescription('Numele badge-ului')
            .setRequired(true)
            .setMinLength(NAME_MIN)
            .setMaxLength(NAME_MAX),
        )
        .addStringOption((option) =>
          option
            .setName('descriere')
            .setDescription('Descrierea badge-ului')
            .setMaxLength(DESCRIPTION_MAX),
        )
        .addStringOption((option) =>
          option
            .setName('culoare')
            .setDescription('Culoarea hexazecimală (ex. #8b5cf6)')
            .setMinLength(4)
            .setMaxLength(7),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('editeaza')
        .setDescription('Modifică un badge existent')
        .addStringOption((option) =>
          option
            .setName('badge')
            .setDescription('Numele sau ID-ul badge-ului')
            .setRequired(true)
            .setMaxLength(NAME_MAX),
        )
        .addStringOption((option) =>
          option
            .setName('nume')
            .setDescription('Nume nou')
            .setMinLength(NAME_MIN)
            .setMaxLength(NAME_MAX),
        )
        .addStringOption((option) =>
          option
            .setName('descriere')
            .setDescription('Descriere nouă')
            .setMaxLength(DESCRIPTION_MAX),
        )
        .addStringOption((option) =>
          option
            .setName('culoare')
            .setDescription('Culoare nouă (ex. #8b5cf6)')
            .setMinLength(4)
            .setMaxLength(7),
        )
        .addBooleanOption((option) =>
          option.setName('fara_descriere').setDescription('Elimină descrierea'),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('sterge')
        .setDescription('Șterge un badge și toate acordările lui')
        .addStringOption((option) =>
          option
            .setName('badge')
            .setDescription('Numele sau ID-ul badge-ului')
            .setRequired(true)
            .setMaxLength(NAME_MAX),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('acorda')
        .setDescription('Acordă un badge unui membru')
        .addStringOption((option) =>
          option
            .setName('badge')
            .setDescription('Numele sau ID-ul badge-ului')
            .setRequired(true)
            .setMaxLength(NAME_MAX),
        )
        .addUserOption((option) =>
          option.setName('membru').setDescription('Membrul').setRequired(true),
        )
        .addStringOption((option) =>
          option.setName('motiv').setDescription('Motivul acordării').setMaxLength(REASON_MAX),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('retrage')
        .setDescription('Retrage un badge de la un membru')
        .addStringOption((option) =>
          option
            .setName('badge')
            .setDescription('Numele sau ID-ul badge-ului')
            .setRequired(true)
            .setMaxLength(NAME_MAX),
        )
        .addUserOption((option) =>
          option.setName('membru').setDescription('Membrul').setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand.setName('lista').setDescription('Listează badge-urile serverului'),
    ),

  async execute(interaction) {
    switch (interaction.options.getSubcommand()) {
      case 'creaza':
        return create(interaction);
      case 'editeaza':
        return edit(interaction);
      case 'sterge':
        return remove(interaction);
      case 'acorda':
        return award(interaction);
      case 'retrage':
        return revoke(interaction);
      case 'lista':
        return list(interaction);
      default:
        return undefined;
    }
  },
};
