const {
  SlashCommandBuilder,
  ChannelType,
  EmbedBuilder,
  PermissionFlagsBits,
  MessageFlags,
} = require('discord.js');
const config = require('../config');
const {
  MIN_BET_MIN,
  MIN_BET_MAX,
  MAX_BET_MIN,
  MAX_BET_MAX,
  COOLDOWN_MIN,
  COOLDOWN_MAX,
  getSettings,
  updateSettings,
  resetSettings,
  getStats,
  getLeaderboard,
  flush,
} = require('../utils/minigames');
const { sendMinigamesLog, formatAmount } = require('../handlers/minigames');

const TEXT_CHANNEL_TYPES = [ChannelType.GuildText, ChannelType.GuildAnnouncement];

function channelLabel(id) {
  return id ? `<#${id}>` : 'Neconfigurat';
}

function settingsEmbed(guild, settings) {
  const stats = getStats(guild.id);
  const currency = config.economy.currency;

  return new EmbedBuilder()
    .setColor(0x8b5cf6)
    .setTitle('Mini-game-uri — setări')
    .addFields(
      {
        name: 'Stare',
        value: settings.enabled ? 'Active' : 'Dezactivate',
        inline: true,
      },
      {
        name: 'Miză',
        value: `${formatAmount(settings.minBet)} - ${formatAmount(settings.maxBet)} ${currency}`,
        inline: true,
      },
      {
        name: 'Cooldown',
        value: settings.cooldownSeconds ? `${settings.cooldownSeconds} secunde` : 'Dezactivat',
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
        name: 'Jocuri jucate',
        value: formatAmount(stats.plays),
        inline: true,
      },
      {
        name: 'Membri jucători',
        value: formatAmount(stats.players),
        inline: true,
      },
    )
    .setFooter({
      text: 'Setările din dashboard au prioritate față de valorile din .env.',
    });
}

function statsEmbed(guild) {
  const stats = getStats(guild.id);
  const currency = config.economy.currency;
  const leaderboard = getLeaderboard(guild.id, 5);
  const winRate = stats.plays ? Math.round((stats.wins / stats.plays) * 100) : 0;

  const embed = new EmbedBuilder()
    .setColor(0x8b5cf6)
    .setTitle('Mini-game-uri — statistici')
    .addFields(
      { name: 'Jocuri jucate', value: formatAmount(stats.plays), inline: true },
      { name: 'Victorii', value: formatAmount(stats.wins), inline: true },
      { name: 'Înfrângeri', value: formatAmount(stats.losses), inline: true },
      { name: 'Egaluri', value: formatAmount(stats.ties), inline: true },
      { name: 'Rată de câștig', value: `${winRate}%`, inline: true },
      { name: 'Membri jucători', value: formatAmount(stats.players), inline: true },
      {
        name: 'Total mizat',
        value: `${formatAmount(stats.wagered)} ${currency}`,
        inline: true,
      },
      {
        name: 'Total plătit',
        value: `${formatAmount(stats.payouts)} ${currency}`,
        inline: true,
      },
      {
        name: 'Rezultat net',
        value: `${stats.net > 0 ? '+' : ''}${formatAmount(stats.net)} ${currency}`,
        inline: true,
      },
    )
    .setTimestamp();

  if (leaderboard.length) {
    embed.addFields({
      name: 'Top membri',
      value: leaderboard
        .map(
          (entry, index) =>
            `${index + 1}. <@${entry.userId}> — ${entry.net > 0 ? '+' : ''}${formatAmount(entry.net)} ${currency} • ${formatAmount(entry.wins)}/${formatAmount(entry.plays)}`,
        )
        .join('\n'),
      inline: false,
    });
  }

  return embed;
}

async function settingsCommand(interaction) {
  const guild = interaction.guild;
  const reset = interaction.options.getBoolean('reseteaza') ?? false;
  const logChannel = interaction.options.getChannel('canal_log');
  const enabled = interaction.options.getBoolean('activ');
  const minBet = interaction.options.getInteger('miza_min');
  const maxBet = interaction.options.getInteger('miza_max');
  const cooldownSeconds = interaction.options.getInteger('cooldown');

  if (!reset) {
    const patch = {};
    if (logChannel) patch.logChannelId = logChannel.id;
    if (enabled !== null) patch.enabled = enabled;
    if (minBet !== null) patch.minBet = minBet;
    if (maxBet !== null) patch.maxBet = maxBet;
    if (cooldownSeconds !== null) patch.cooldownSeconds = cooldownSeconds;

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

    await sendMinigamesLog(guild, {
      action: 'setări actualizate',
      actorTag: interaction.user.tag,
      fields: [
        { name: 'Stare', value: result.settings.enabled ? 'Activ' : 'Inactiv', inline: true },
        {
          name: 'Miză',
          value: `${formatAmount(result.settings.minBet)} - ${formatAmount(result.settings.maxBet)} ${config.economy.currency}`,
          inline: true,
        },
        {
          name: 'Cooldown',
          value: `${result.settings.cooldownSeconds} secunde`,
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
      content: 'Setările mini-game-urilor au fost actualizate.',
      embeds: [settingsEmbed(guild, result.settings)],
      flags: MessageFlags.Ephemeral,
    });
  }

  const result = resetSettings(guild.id);
  if (result.error) {
    return interaction.reply({ content: result.error, flags: MessageFlags.Ephemeral });
  }

  flush();

  await sendMinigamesLog(guild, {
    action: 'setări resetate',
    actorTag: interaction.user.tag,
    fields: [{ name: 'Valori', value: 'Implicite / .env', inline: true }],
  });

  return interaction.reply({
    content: 'Setările mini-game-urilor au fost resetate la valorile implicite.',
    embeds: [settingsEmbed(guild, result.settings)],
    flags: MessageFlags.Ephemeral,
  });
}

module.exports = {
  category: 'Mini-game-uri',
  data: new SlashCommandBuilder()
    .setName('joc-admin')
    .setDescription('Administrează mini-game-urile')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((subcommand) =>
      subcommand
        .setName('setari')
        .setDescription('Configurează mini-game-urile')
        .addChannelOption((option) =>
          option
            .setName('canal_log')
            .setDescription('Canalul pentru logurile de administrare')
            .addChannelTypes(...TEXT_CHANNEL_TYPES),
        )
        .addBooleanOption((option) =>
          option.setName('activ').setDescription('Activează sau dezactivează mini-game-urile'),
        )
        .addIntegerOption((option) =>
          option
            .setName('miza_min')
            .setDescription('Miza minimă')
            .setMinValue(MIN_BET_MIN)
            .setMaxValue(MIN_BET_MAX),
        )
        .addIntegerOption((option) =>
          option
            .setName('miza_max')
            .setDescription('Miza maximă')
            .setMinValue(MAX_BET_MIN)
            .setMaxValue(MAX_BET_MAX),
        )
        .addIntegerOption((option) =>
          option
            .setName('cooldown')
            .setDescription('Secunde între două jocuri')
            .setMinValue(COOLDOWN_MIN)
            .setMaxValue(COOLDOWN_MAX),
        )
        .addBooleanOption((option) =>
          option.setName('reseteaza').setDescription('Revine la valorile implicite'),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand.setName('status').setDescription('Vezi setările curente'),
    )
    .addSubcommand((subcommand) =>
      subcommand.setName('statistici').setDescription('Vezi statisticile mini-game-urilor'),
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
