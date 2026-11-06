const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const {
  NAME_MIN,
  NAME_MAX,
  TAG_MIN,
  TAG_MAX,
  DESCRIPTION_MIN,
  DESCRIPTION_MAX,
  findClan,
  getClans,
  getClanForMember,
  getPendingInvites,
  createInvite,
  getInvitesForUser,
  acceptInvite,
  declineInvite,
  leaveClan,
  kickMember,
  transferOwnership,
  flush,
} = require('../utils/clans');
const {
  buildClanEmbed,
  buildClanListEmbed,
  buildClanStatsEmbed,
  disbandRow,
  sendClanLog,
  sendClanInvite,
  createClanForMember,
} = require('../handlers/clans');

function formatNumber(value) {
  return Number(value).toLocaleString('ro-RO');
}

function replyWithClan(interaction, clan, guild, extra = {}) {
  return interaction.reply({
    embeds: [buildClanEmbed(guild, clan)],
    flags: MessageFlags.Ephemeral,
    ...extra,
  });
}

function findInvite(invites, query) {
  const value = String(query ?? '').trim();
  if (!value) return null;

  const lower = value.toLowerCase();
  return (
    invites.find(
      ({ clan }) =>
        clan.id === value ||
        clan.tag.toLowerCase() === lower ||
        clan.name.toLowerCase() === lower,
    ) ?? null
  );
}

function inviteListText(invites) {
  return invites
    .map(
      ({ clan, invite }) =>
        `• **${clan.name}** (${clan.tag}) — expiră <t:${Math.floor(invite.expiresAt / 1000)}:R>`,
    )
    .join('\n');
}

async function infoCommand(interaction) {
  const guild = interaction.guild;
  const query = interaction.options.getString('clan');
  const clan = query
    ? findClan(guild.id, query)
    : getClanForMember(guild.id, interaction.user.id);

  if (!clan) {
    return interaction.reply({
      content: query
        ? 'Clanul nu a fost găsit. Verifică numele, tag-ul sau ID-ul.'
        : 'Nu faci parte din niciun clan. Poți crea unul cu /clan creeaza sau aștepta o invitație.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const embed = buildClanEmbed(guild, clan);

  if (clan.ownerId === interaction.user.id) {
    embed.addFields({
      name: 'Invitații în așteptare',
      value: formatNumber(getPendingInvites(guild.id, clan.id).length),
      inline: true,
    });
  }

  return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

async function createCommand(interaction) {
  const guild = interaction.guild;
  const result = createClanForMember(guild, interaction.member, {
    name: interaction.options.getString('nume', true),
    tag: interaction.options.getString('tag', true),
    description: interaction.options.getString('descriere', true),
  });

  if (!result.ok) {
    return interaction.reply({ content: result.error, flags: MessageFlags.Ephemeral });
  }

  await sendClanLog(guild, {
    action: 'clan creat',
    actorTag: interaction.user.tag,
    fields: [
      { name: 'Clan', value: `${result.clan.name} (${result.clan.tag})`, inline: false },
      { name: 'Conducător', value: `<@${result.clan.ownerId}>`, inline: true },
    ],
  });

  return replyWithClan(interaction, result.clan, guild, {
    content: 'Clanul a fost creat.',
  });
}

async function inviteCommand(interaction) {
  const guild = interaction.guild;
  const target = interaction.options.getMember('membru');

  if (!target) {
    return interaction.reply({
      content: 'Membrul nu este pe server.',
      flags: MessageFlags.Ephemeral,
    });
  }
  if (target.user.bot) {
    return interaction.reply({
      content: 'Nu poți invita un bot într-un clan.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const clan = getClanForMember(guild.id, interaction.user.id);
  if (!clan) {
    return interaction.reply({
      content: 'Nu faci parte din niciun clan. Creează unul cu /clan creeaza.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const result = createInvite(guild.id, clan.id, interaction.user.id, target.id);
  if (!result.ok) {
    return interaction.reply({ content: result.error, flags: MessageFlags.Ephemeral });
  }

  flush();

  const delivered = await sendClanInvite(
    interaction.client,
    guild,
    result.clan,
    target.user,
    result.invite,
    interaction.user.tag,
  );

  await sendClanLog(guild, {
    action: 'invitație trimisă',
    actorTag: interaction.user.tag,
    fields: [
      { name: 'Clan', value: `${result.clan.name} (${result.clan.tag})`, inline: false },
      { name: 'Membru', value: `<@${target.id}>`, inline: true },
      { name: 'Expiră', value: `<t:${Math.floor(result.expiresAt / 1000)}:f>`, inline: true },
    ],
  });

  return interaction.reply({
    content: delivered
      ? `Invitația a fost trimisă în mesajele private către ${target.user.tag}.`
      : `Invitația a fost creată, dar ${target.user.tag} nu poate primi mesaje private. Poate accepta cu /clan accepta.`,
    flags: MessageFlags.Ephemeral,
  });
}

async function acceptCommand(interaction) {
  const guild = interaction.guild;
  const invites = getInvitesForUser(guild.id, interaction.user.id);

  if (!invites.length) {
    return interaction.reply({
      content: 'Nu ai nicio invitație activă.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const query = interaction.options.getString('clan');
  const selected = query ? findInvite(invites, query) : invites.length === 1 ? invites[0] : null;

  if (!selected) {
    if (query) {
      return interaction.reply({
        content: 'Nu ai o invitație activă pentru acest clan.',
        flags: MessageFlags.Ephemeral,
      });
    }

    return interaction.reply({
      content: `Ai mai multe invitații. Alege clanul cu /clan accepta clan:<nume sau tag>.\n${inviteListText(invites)}`,
      flags: MessageFlags.Ephemeral,
    });
  }

  const result = acceptInvite(guild.id, selected.clan.id, interaction.user.id);
  if (!result.ok) {
    return interaction.reply({ content: result.error, flags: MessageFlags.Ephemeral });
  }

  flush();

  await sendClanLog(guild, {
    action: 'membru adăugat',
    actorTag: interaction.user.tag,
    fields: [
      { name: 'Clan', value: `${result.clan.name} (${result.clan.tag})`, inline: false },
      { name: 'Membru', value: `<@${interaction.user.id}>`, inline: true },
    ],
  });

  return interaction.reply({
    content: `Ai intrat în clanul **${result.clan.name}**.`,
    embeds: [buildClanEmbed(guild, result.clan)],
    flags: MessageFlags.Ephemeral,
  });
}

async function declineCommand(interaction) {
  const guild = interaction.guild;
  const invites = getInvitesForUser(guild.id, interaction.user.id);

  if (!invites.length) {
    return interaction.reply({
      content: 'Nu ai nicio invitație activă.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const query = interaction.options.getString('clan');
  const selected = query ? findInvite(invites, query) : invites.length === 1 ? invites[0] : null;

  if (!selected) {
    if (query) {
      return interaction.reply({
        content: 'Nu ai o invitație activă pentru acest clan.',
        flags: MessageFlags.Ephemeral,
      });
    }

    return interaction.reply({
      content: `Ai mai multe invitații. Alege clanul cu /clan refuza clan:<nume sau tag>.\n${inviteListText(invites)}`,
      flags: MessageFlags.Ephemeral,
    });
  }

  const result = declineInvite(guild.id, selected.clan.id, interaction.user.id);
  if (!result.ok) {
    return interaction.reply({ content: result.error, flags: MessageFlags.Ephemeral });
  }

  flush();

  return interaction.reply({
    content: `Ai refuzat invitația în clanul **${result.clan.name}**.`,
    flags: MessageFlags.Ephemeral,
  });
}

async function leaveCommand(interaction) {
  const guild = interaction.guild;
  const result = leaveClan(guild.id, interaction.user.id);

  if (!result.ok) {
    return interaction.reply({ content: result.error, flags: MessageFlags.Ephemeral });
  }

  flush();

  await sendClanLog(guild, {
    action: 'membru ieșit',
    actorTag: interaction.user.tag,
    fields: [
      { name: 'Clan', value: `${result.clan.name} (${result.clan.tag})`, inline: false },
      { name: 'Membru', value: `<@${interaction.user.id}>`, inline: true },
    ],
  });

  return interaction.reply({
    content: `Ai părăsit clanul **${result.clan.name}**.`,
    flags: MessageFlags.Ephemeral,
  });
}

async function kickCommand(interaction) {
  const guild = interaction.guild;
  const target = interaction.options.getMember('membru');

  if (!target) {
    return interaction.reply({
      content: 'Membrul nu este pe server.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const clan = getClanForMember(guild.id, interaction.user.id);
  if (!clan) {
    return interaction.reply({
      content: 'Nu faci parte din niciun clan.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const result = kickMember(guild.id, clan.id, interaction.user.id, target.id);
  if (!result.ok) {
    return interaction.reply({ content: result.error, flags: MessageFlags.Ephemeral });
  }

  flush();

  await sendClanLog(guild, {
    action: 'membru eliminat',
    actorTag: interaction.user.tag,
    fields: [
      { name: 'Clan', value: `${result.clan.name} (${result.clan.tag})`, inline: false },
      { name: 'Membru', value: `<@${target.id}>`, inline: true },
    ],
  });

  await target
    .send({
      content: `Ai fost eliminat din clanul **${result.clan.name}** pe serverul **${guild.name}**.`,
    })
    .catch(() => {});

  return interaction.reply({
    content: `${target.user.tag} a fost eliminat din clanul **${result.clan.name}**.`,
    flags: MessageFlags.Ephemeral,
  });
}

async function transferCommand(interaction) {
  const guild = interaction.guild;
  const target = interaction.options.getMember('membru');

  if (!target) {
    return interaction.reply({
      content: 'Membrul nu este pe server.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const clan = getClanForMember(guild.id, interaction.user.id);
  if (!clan) {
    return interaction.reply({
      content: 'Nu faci parte din niciun clan.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const result = transferOwnership(guild.id, clan.id, interaction.user.id, target.id);
  if (!result.ok) {
    return interaction.reply({ content: result.error, flags: MessageFlags.Ephemeral });
  }

  flush();

  await sendClanLog(guild, {
    action: 'conducere transferată',
    actorTag: interaction.user.tag,
    fields: [
      { name: 'Clan', value: `${result.clan.name} (${result.clan.tag})`, inline: false },
      { name: 'Noul conducător', value: `<@${target.id}>`, inline: true },
    ],
  });

  return interaction.reply({
    content: `Conducerea clanului **${result.clan.name}** a trecut la ${target.user.tag}.`,
    flags: MessageFlags.Ephemeral,
  });
}

async function disbandCommand(interaction) {
  const guild = interaction.guild;
  const clan = getClanForMember(guild.id, interaction.user.id);

  if (!clan) {
    return interaction.reply({
      content: 'Nu faci parte din niciun clan.',
      flags: MessageFlags.Ephemeral,
    });
  }

  if (clan.ownerId !== interaction.user.id) {
    return interaction.reply({
      content: 'Doar conducătorul clanului îl poate dizolva.',
      flags: MessageFlags.Ephemeral,
    });
  }

  return interaction.reply({
    content: `Sigur vrei să dizolvi clanul **${clan.name}**? Acțiunea este ireversibilă.`,
    embeds: [buildClanEmbed(guild, clan)],
    components: [disbandRow(guild.id, clan.id)],
    flags: MessageFlags.Ephemeral,
  });
}

function listCommand(interaction) {
  return interaction.reply({
    embeds: [buildClanListEmbed(interaction.guild)],
    flags: MessageFlags.Ephemeral,
  });
}

function statsCommand(interaction) {
  const guild = interaction.guild;
  const embed = buildClanStatsEmbed(guild);
  const top = getClans(guild.id).slice(0, 5);

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

  return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

const CLAN_QUERY_OPTION = (option) =>
  option
    .setName('clan')
    .setDescription('Numele, tag-ul sau ID-ul clanului')
    .setRequired(true)
    .setMaxLength(64);

const MEMBER_OPTION = (option) =>
  option.setName('membru').setDescription('Membrul vizat').setRequired(true);

module.exports = {
  category: 'Clanuri',
  data: new SlashCommandBuilder()
    .setName('clan')
    .setDescription('Gestionează clanul tău')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('info')
        .setDescription('Vezi detaliile unui clan')
        .addStringOption((option) =>
          option
            .setName('clan')
            .setDescription('Numele, tag-ul sau ID-ul clanului (implicit clanul tău)')
            .setMaxLength(64),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('creeaza')
        .setDescription('Creează un clan nou')
        .addStringOption((option) =>
          option
            .setName('nume')
            .setDescription('Numele clanului')
            .setRequired(true)
            .setMinLength(NAME_MIN)
            .setMaxLength(NAME_MAX),
        )
        .addStringOption((option) =>
          option
            .setName('tag')
            .setDescription('Tag-ul clanului, 2-5 litere sau cifre')
            .setRequired(true)
            .setMinLength(TAG_MIN)
            .setMaxLength(TAG_MAX),
        )
        .addStringOption((option) =>
          option
            .setName('descriere')
            .setDescription('Descrierea clanului')
            .setRequired(true)
            .setMinLength(DESCRIPTION_MIN)
            .setMaxLength(DESCRIPTION_MAX),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('invita')
        .setDescription('Invită un membru în clanul tău')
        .addUserOption(MEMBER_OPTION),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('accepta')
        .setDescription('Acceptă o invitație într-un clan')
        .addStringOption((option) =>
          option
            .setName('clan')
            .setDescription('Numele sau tag-ul clanului')
            .setMaxLength(64),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('refuza')
        .setDescription('Refuză o invitație într-un clan')
        .addStringOption((option) =>
          option
            .setName('clan')
            .setDescription('Numele sau tag-ul clanului')
            .setMaxLength(64),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand.setName('pleaca').setDescription('Părăsește clanul din care faci parte'),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('da-afara')
        .setDescription('Elimină un membru din clanul tău')
        .addUserOption(MEMBER_OPTION),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('transfera')
        .setDescription('Transferă conducerea clanului')
        .addUserOption(MEMBER_OPTION),
    )
    .addSubcommand((subcommand) =>
      subcommand.setName('dizolva').setDescription('Dizolvă clanul pe care îl conduci'),
    )
    .addSubcommand((subcommand) =>
      subcommand.setName('lista').setDescription('Vezi clasamentul clanurilor'),
    )
    .addSubcommand((subcommand) =>
      subcommand.setName('statistici').setDescription('Vezi statisticile clanurilor'),
    ),

  async execute(interaction) {
    switch (interaction.options.getSubcommand()) {
      case 'info':
        return infoCommand(interaction);
      case 'creeaza':
        return createCommand(interaction);
      case 'invita':
        return inviteCommand(interaction);
      case 'accepta':
        return acceptCommand(interaction);
      case 'refuza':
        return declineCommand(interaction);
      case 'pleaca':
        return leaveCommand(interaction);
      case 'da-afara':
        return kickCommand(interaction);
      case 'transfera':
        return transferCommand(interaction);
      case 'dizolva':
        return disbandCommand(interaction);
      case 'lista':
        return listCommand(interaction);
      case 'statistici':
        return statsCommand(interaction);
      default:
        return undefined;
    }
  },
};
