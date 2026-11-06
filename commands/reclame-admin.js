const {
  SlashCommandBuilder,
  ChannelType,
  EmbedBuilder,
  PermissionFlagsBits,
  MessageFlags,
} = require('discord.js');
const config = require('../config');
const {
  DAYS_MAX,
  getAd,
  getSettings,
  updateSettings,
  getAdsStats,
  flush,
} = require('../utils/ads');
const {
  publishAd,
  rejectAdFlow,
  deleteAdFlow,
  expireAdFlow,
} = require('../handlers/ads');

const TEXT_CHANNEL_TYPES = [ChannelType.GuildText, ChannelType.GuildAnnouncement];

function channelLabel(id) {
  return id ? `<#${id}>` : 'Neconfigurat';
}

function settingsEmbed(guild, settings) {
  const stats = getAdsStats(guild.id);

  return new EmbedBuilder()
    .setColor(0x8b5cf6)
    .setTitle('Reclame — setări')
    .addFields(
      {
        name: 'Canal publicare',
        value: channelLabel(settings.channelId),
        inline: true,
      },
      {
        name: 'Canal verificare',
        value: settings.reviewChannelId
          ? channelLabel(settings.reviewChannelId)
          : settings.channelId
            ? `${channelLabel(settings.channelId)} (implicit)`
            : 'Neconfigurat',
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
        name: 'Durată implicită',
        value: settings.defaultDays ? `${settings.defaultDays} zile` : 'Permanentă',
        inline: true,
      },
      {
        name: 'Ștergere la expirare',
        value: settings.autoDeleteExpired ? 'Activă' : 'Doar marcare',
        inline: true,
      },
      {
        name: 'Reclame active',
        value: `${stats.active} active, ${stats.pending} în așteptare`,
        inline: true,
      },
    )
    .setFooter({
      text: 'Setările din dashboard au prioritate față de valorile din .env.',
    });
}

async function settingsCommand(interaction) {
  const guild = interaction.guild;
  const channel = interaction.options.getChannel('canal');
  const reviewChannel = interaction.options.getChannel('canal_verificare');
  const logChannel = interaction.options.getChannel('canal_log');
  const defaultDays = interaction.options.getInteger('zile_implicite');
  const autoDeleteExpired = interaction.options.getBoolean('stergere_expirate');
  const reset = interaction.options.getBoolean('reseteaza') ?? false;

  const patch = {};

  if (reset) {
    patch.channelId = null;
    patch.reviewChannelId = null;
    patch.logChannelId = null;
    patch.defaultDays = null;
    patch.autoDeleteExpired = null;
  } else {
    if (channel) patch.channelId = channel.id;
    if (reviewChannel) patch.reviewChannelId = reviewChannel.id;
    if (logChannel) patch.logChannelId = logChannel.id;
    if (defaultDays !== null) patch.defaultDays = defaultDays;
    if (autoDeleteExpired !== null) patch.autoDeleteExpired = autoDeleteExpired;
  }

  if (!Object.keys(patch).length) {
    return interaction.reply({
      embeds: [settingsEmbed(guild, getSettings(guild.id))],
      flags: MessageFlags.Ephemeral,
    });
  }

  const settings = updateSettings(guild.id, patch);
  flush();

  return interaction.reply({
    content: reset
      ? 'Setările reclamelor au fost resetate la valorile din .env.'
      : 'Setările reclamelor au fost actualizate.',
    embeds: [settingsEmbed(guild, settings)],
    flags: MessageFlags.Ephemeral,
  });
}

async function publishCommand(interaction) {
  const ad = getAd(interaction.options.getString('id', true));

  if (!ad || ad.guildId !== interaction.guild.id) {
    return interaction.reply({
      content: 'Reclama nu a fost găsită.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const result = await publishAd(interaction.guild, ad, {
    reviewedBy: interaction.user.id,
    reviewedByTag: interaction.user.tag,
  });

  if (!result.ok) {
    return interaction.reply({ content: result.error, flags: MessageFlags.Ephemeral });
  }

  return interaction.reply({
    content: `Reclama **${result.ad.title}** a fost publicată.`,
    flags: MessageFlags.Ephemeral,
  });
}

async function rejectCommand(interaction) {
  const ad = getAd(interaction.options.getString('id', true));

  if (!ad || ad.guildId !== interaction.guild.id) {
    return interaction.reply({
      content: 'Reclama nu a fost găsită.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const result = await rejectAdFlow(interaction.guild, ad, {
    reviewedBy: interaction.user.id,
    reviewedByTag: interaction.user.tag,
    reason: interaction.options.getString('motiv', true),
  });

  if (!result.ok) {
    return interaction.reply({ content: result.error, flags: MessageFlags.Ephemeral });
  }

  return interaction.reply({
    content: `Reclama **${result.ad.title}** a fost respinsă, iar autorul a fost anunțat.`,
    flags: MessageFlags.Ephemeral,
  });
}

async function deleteCommand(interaction) {
  const ad = getAd(interaction.options.getString('id', true));

  if (!ad || ad.guildId !== interaction.guild.id) {
    return interaction.reply({
      content: 'Reclama nu a fost găsită.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const result = await deleteAdFlow(interaction.guild, ad, {
    actorTag: interaction.user.tag,
    updateReview: true,
  });

  if (!result.ok) {
    return interaction.reply({ content: result.error, flags: MessageFlags.Ephemeral });
  }

  return interaction.reply({
    content: `Reclama **${result.ad.title}** a fost ștearsă.`,
    flags: MessageFlags.Ephemeral,
  });
}

async function expireCommand(interaction) {
  const ad = getAd(interaction.options.getString('id', true));

  if (!ad || ad.guildId !== interaction.guild.id) {
    return interaction.reply({
      content: 'Reclama nu a fost găsită.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const result = await expireAdFlow(interaction.guild, ad);

  if (!result.ok) {
    return interaction.reply({ content: result.error, flags: MessageFlags.Ephemeral });
  }

  return interaction.reply({
    content: `Reclama **${result.ad.title}** a fost marcată ca expirată.`,
    flags: MessageFlags.Ephemeral,
  });
}

function statsCommand(interaction) {
  const stats = getAdsStats(interaction.guild.id);
  const settings = getSettings(interaction.guild.id);

  const embed = new EmbedBuilder()
    .setColor(0x8b5cf6)
    .setTitle('Reclame — statistici')
    .addFields(
      { name: 'Total', value: String(stats.total), inline: true },
      { name: 'Active', value: String(stats.active), inline: true },
      { name: 'În așteptare', value: String(stats.pending), inline: true },
      { name: 'Respinse', value: String(stats.rejected), inline: true },
      { name: 'Expirate', value: String(stats.expired), inline: true },
      { name: 'Trimise', value: String(stats.submitted), inline: true },
      { name: 'Publicate', value: String(stats.published), inline: true },
      {
        name: 'Următoarea expirare',
        value: stats.nextExpiry
          ? `<t:${Math.floor(stats.nextExpiry / 1000)}:R>`
          : 'Nicio reclamă activă cu expirare',
        inline: true,
      },
    )
    .setFooter({
      text: `Canal publicare: ${settings.channelId ? settings.channelId : 'neconfigurat'}`,
    })
    .setTimestamp();

  return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

module.exports = {
  category: 'Reclame',
  data: new SlashCommandBuilder()
    .setName('reclame-admin')
    .setDescription('Administrează sistemul de reclame')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((subcommand) =>
      subcommand
        .setName('setari')
        .setDescription('Configurează canalele, durata implicită și expirarea')
        .addChannelOption((option) =>
          option
            .setName('canal')
            .setDescription('Canalul în care sunt publicate reclamele')
            .addChannelTypes(...TEXT_CHANNEL_TYPES),
        )
        .addChannelOption((option) =>
          option
            .setName('canal_verificare')
            .setDescription('Canalul în care ajung reclamele spre verificare')
            .addChannelTypes(...TEXT_CHANNEL_TYPES),
        )
        .addChannelOption((option) =>
          option
            .setName('canal_log')
            .setDescription('Canalul pentru logurile reclamelor')
            .addChannelTypes(...TEXT_CHANNEL_TYPES),
        )
        .addIntegerOption((option) =>
          option
            .setName('zile_implicite')
            .setDescription('Durata implicită în zile (0 = permanentă)')
            .setMinValue(0)
            .setMaxValue(DAYS_MAX),
        )
        .addBooleanOption((option) =>
          option
            .setName('stergere_expirate')
            .setDescription('Șterge mesajul publicat când reclama expiră'),
        )
        .addBooleanOption((option) =>
          option
            .setName('reseteaza')
            .setDescription('Revine la valorile din .env'),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('publica')
        .setDescription('Publică o reclamă în așteptare')
        .addStringOption((option) =>
          option
            .setName('id')
            .setDescription('ID-ul reclamei')
            .setRequired(true)
            .setMaxLength(32),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('respinge')
        .setDescription('Respinge o reclamă în așteptare')
        .addStringOption((option) =>
          option
            .setName('id')
            .setDescription('ID-ul reclamei')
            .setRequired(true)
            .setMaxLength(32),
        )
        .addStringOption((option) =>
          option
            .setName('motiv')
            .setDescription('Motivul respingerii')
            .setRequired(true)
            .setMaxLength(500),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('sterge')
        .setDescription('Șterge o reclamă și mesajele ei')
        .addStringOption((option) =>
          option
            .setName('id')
            .setDescription('ID-ul reclamei')
            .setRequired(true)
            .setMaxLength(32),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('expira')
        .setDescription('Marchează manual o reclamă activă ca expirată')
        .addStringOption((option) =>
          option
            .setName('id')
            .setDescription('ID-ul reclamei')
            .setRequired(true)
            .setMaxLength(32),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand.setName('statistici').setDescription('Vezi statisticile reclamelor'),
    ),

  async execute(interaction) {
    switch (interaction.options.getSubcommand()) {
      case 'setari':
        return settingsCommand(interaction);
      case 'publica':
        return publishCommand(interaction);
      case 'respinge':
        return rejectCommand(interaction);
      case 'sterge':
        return deleteCommand(interaction);
      case 'expira':
        return expireCommand(interaction);
      case 'statistici':
        return statsCommand(interaction);
      default:
        return undefined;
    }
  },
};
