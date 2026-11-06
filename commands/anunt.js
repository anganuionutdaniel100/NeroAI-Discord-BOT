const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  MessageFlags,
} = require('discord.js');
const config = require('../config');
const {
  publishAnnouncement,
  editAnnouncement,
  removeAnnouncement,
} = require('../handlers/announcements');
const { getAnnouncement, getAnnouncements } = require('../utils/announcements');

function truncate(text, length) {
  return text.length > length ? `${text.slice(0, length - 3)}...` : text;
}

function normalizeId(value) {
  return String(value ?? '').trim().toLowerCase();
}

function hasManageGuild(interaction) {
  return interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild);
}

function resolveTarget(interaction) {
  const entry = getAnnouncement(normalizeId(interaction.options.getString('id', true)));

  if (!entry || entry.guildId !== interaction.guild.id) {
    return null;
  }

  return entry;
}

async function publish(interaction) {
  if (!hasManageGuild(interaction)) {
    return interaction.reply({
      content: 'Ai nevoie de permisiunea Manage Server pentru a publica anunțuri.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const title = interaction.options.getString('titlu')?.trim() || null;
  const message = interaction.options.getString('mesaj', true).trim();
  const ping = interaction.options.getBoolean('ping') ?? false;
  const selectedRole = interaction.options.getRole('rol');
  if (selectedRole?.id === interaction.guild.id) {
    return interaction.reply({
      content: 'Rolul @everyone nu poate fi folosit pentru ping.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const pingRoleId = ping ? selectedRole?.id ?? config.announcements.pingRoleId : null;
  const channelId = config.announcements.channelId ?? interaction.channelId;

  if (!message) {
    return interaction.reply({
      content: 'Mesajul anunțului nu poate fi gol.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const result = await publishAnnouncement(interaction.client, {
    channelId,
    title,
    message,
    authorId: interaction.user.id,
    authorTag: interaction.user.tag,
    pingRoleId,
  });

  if (!result) {
    return interaction.reply({
      content:
        'Anunțul nu a putut fi publicat. Verifică `ANNOUNCEMENT_CHANNEL_ID` și permisiunile botului (Send Messages, Embed Links).',
      flags: MessageFlags.Ephemeral,
    });
  }

  return interaction.reply({
    content: `Anunț publicat: ${result.message.url}\nID: \`${result.entry.id}\``,
    flags: MessageFlags.Ephemeral,
  });
}

async function list(interaction) {
  if (!hasManageGuild(interaction)) {
    return interaction.reply({
      content: 'Ai nevoie de permisiunea Manage Server pentru a vedea anunțurile.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const limit = interaction.options.getInteger('limita') ?? 10;
  const entries = getAnnouncements(interaction.guild.id, { limit });

  if (!entries.length) {
    return interaction.reply({
      content: 'Nu există anunțuri publicate încă.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const active = entries.filter((entry) => !entry.deletedAt).length;
  const description = entries
    .map((entry) => {
      const channel = interaction.guild.channels.cache.get(entry.channelId);
      const date = `<t:${Math.floor(entry.createdAt / 1000)}:d>`;
      const status = entry.deletedAt ? 'șters' : 'activ';
      const ping = entry.pingRoleId ? ` • ping <@&${entry.pingRoleId}>` : '';
      const channelLabel = channel ? `<#${channel.id}>` : 'canal indisponibil';

      return `**${entry.title ?? 'Fără titlu'}** — \`${entry.id}\`\n${date} • ${channelLabel} • ${status}${ping}\n${truncate(entry.message, 120)}`;
    })
    .join('\n\n');

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle('Anunțuri recente')
    .setDescription(description)
    .setFooter({ text: `${active} active din ${entries.length} afișate` })
    .setTimestamp();

  return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

async function edit(interaction) {
  if (!hasManageGuild(interaction)) {
    return interaction.reply({
      content: 'Ai nevoie de permisiunea Manage Server pentru a edita anunțuri.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const entry = resolveTarget(interaction);
  if (!entry) {
    return interaction.reply({
      content: 'Anunțul nu există pe acest server.',
      flags: MessageFlags.Ephemeral,
    });
  }
  if (entry.deletedAt) {
    return interaction.reply({
      content: 'Anunțul a fost șters și nu mai poate fi editat.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const titleOption = interaction.options.getString('titlu');
  const messageOption = interaction.options.getString('mesaj');

  if (titleOption === null && messageOption === null) {
    return interaction.reply({
      content: 'Completează cel puțin un câmp: titlu sau mesaj.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const title = titleOption === null ? entry.title : titleOption.trim() || null;
  const message = messageOption === null ? entry.message : messageOption.trim();

  if (!message) {
    return interaction.reply({
      content: 'Mesajul anunțului nu poate fi gol.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const result = await editAnnouncement(interaction.client, entry, {
    title,
    message,
    editorId: interaction.user.id,
    editorTag: interaction.user.tag,
  });

  return interaction.reply({
    content: result.messageUpdated
      ? `Anunțul \`${entry.id}\` a fost actualizat, inclusiv mesajul din Discord.`
      : `Anunțul \`${entry.id}\` a fost actualizat, dar mesajul original nu a mai putut fi modificat.`,
    flags: MessageFlags.Ephemeral,
  });
}

async function remove(interaction) {
  if (!hasManageGuild(interaction)) {
    return interaction.reply({
      content: 'Ai nevoie de permisiunea Manage Server pentru a șterge anunțuri.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const entry = resolveTarget(interaction);
  if (!entry) {
    return interaction.reply({
      content: 'Anunțul nu există pe acest server.',
      flags: MessageFlags.Ephemeral,
    });
  }
  if (entry.deletedAt) {
    return interaction.reply({
      content: 'Anunțul este deja șters.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const result = await removeAnnouncement(interaction.client, entry, {
    actorId: interaction.user.id,
    actorTag: interaction.user.tag,
  });

  return interaction.reply({
    content: result.messageDeleted
      ? `Anunțul \`${entry.id}\` a fost șters din Discord și marcat ca șters în istoric.`
      : `Anunțul \`${entry.id}\` a fost marcat ca șters, dar mesajul din Discord nu a mai fost găsit.`,
    flags: MessageFlags.Ephemeral,
  });
}

module.exports = {
  category: 'Anunțuri',
  data: new SlashCommandBuilder()
    .setName('anunt')
    .setDescription('Publică și administrează anunțurile serverului')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((subcommand) =>
      subcommand
        .setName('publica')
        .setDescription('Publică un anunț în canalul configurat')
        .addStringOption((option) =>
          option.setName('mesaj').setDescription('Textul anunțului').setRequired(true).setMaxLength(3800),
        )
        .addStringOption((option) =>
          option.setName('titlu').setDescription('Titlul anunțului').setMaxLength(150),
        )
        .addBooleanOption((option) =>
          option
            .setName('ping')
            .setDescription('Ping-uiește un rol (implicit: ANNOUNCEMENT_PING_ROLE_ID)'),
        )
        .addRoleOption((option) =>
          option.setName('rol').setDescription('Rolul ping-uit când ping este true'),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('lista')
        .setDescription('Ultimele anunțuri publicate')
        .addIntegerOption((option) =>
          option
            .setName('limita')
            .setDescription('Câte anunțuri să afișeze (implicit 10)')
            .setMinValue(1)
            .setMaxValue(20),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('editeaza')
        .setDescription('Editează un anunț existent')
        .addStringOption((option) =>
          option.setName('id').setDescription('ID-ul anunțului').setRequired(true).setMaxLength(16),
        )
        .addStringOption((option) =>
          option.setName('titlu').setDescription('Titlul nou').setMaxLength(150),
        )
        .addStringOption((option) =>
          option.setName('mesaj').setDescription('Textul nou').setMaxLength(3800),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('sterge')
        .setDescription('Șterge un anunț din Discord și marchează intrarea ca șters')
        .addStringOption((option) =>
          option.setName('id').setDescription('ID-ul anunțului').setRequired(true).setMaxLength(16),
        ),
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'publica') return publish(interaction);
    if (subcommand === 'lista') return list(interaction);
    if (subcommand === 'editeaza') return edit(interaction);
    return remove(interaction);
  },
};
