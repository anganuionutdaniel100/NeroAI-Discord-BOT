const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  MessageFlags,
  ChannelType,
} = require('discord.js');
const {
  LIMIT_MAX,
  getSettings,
  updateSettings,
  getTemporaryChannel,
  getTemporaryChannels,
  getVoiceTotals,
  flush,
} = require('../utils/voice');
const {
  closeVoiceChannel,
  cleanupVoiceChannels,
  sendVoiceLog,
} = require('../handlers/voice');

function settingsEmbed(guild, settings) {
  const totals = getVoiceTotals(guild.id);
  const channels = getTemporaryChannels(guild.id);

  return new EmbedBuilder()
    .setColor(0x8b5cf6)
    .setTitle('Voice Manager — setări')
    .addFields(
      {
        name: 'Canal hub',
        value: settings.hubChannelId ? `<#${settings.hubChannelId}>` : 'Neconfigurat',
        inline: true,
      },
      {
        name: 'Categorie',
        value: settings.categoryId
          ? `<#${settings.categoryId}>`
          : 'Categoria canalului hub',
        inline: true,
      },
      {
        name: 'Limită implicită',
        value: settings.defaultLimit ? `${settings.defaultLimit} membri` : 'Nelimitată',
        inline: true,
      },
      {
        name: 'Ștergere automată',
        value: settings.autoDelete ? 'Activă' : 'Dezactivată',
        inline: true,
      },
      {
        name: 'Canale active',
        value: String(channels.length),
        inline: true,
      },
      {
        name: 'Sesiuni create',
        value: String(totals.created),
        inline: true,
      },
    )
    .setFooter({
      text: 'Setările din dashboard au prioritate față de valorile din .env.',
    });
}

async function settingsCommand(interaction) {
  const guild = interaction.guild;
  const hub = interaction.options.getChannel('hub');
  const category = interaction.options.getChannel('categorie');
  const limit = interaction.options.getInteger('limita');
  const autoDelete = interaction.options.getBoolean('stergere_automata');
  const reset = interaction.options.getBoolean('reseteaza') ?? false;

  const patch = {};

  if (reset) {
    patch.hubChannelId = null;
    patch.categoryId = null;
    patch.defaultLimit = null;
    patch.autoDelete = null;
  } else {
    if (hub) {
      if (hub.type !== ChannelType.GuildVoice) {
        return interaction.reply({
          content: 'Canalul hub trebuie să fie un canal vocal.',
          flags: MessageFlags.Ephemeral,
        });
      }
      patch.hubChannelId = hub.id;
    }

    if (category) {
      if (category.type !== ChannelType.GuildCategory) {
        return interaction.reply({
          content: 'Categoria trebuie să fie o categorie de canale.',
          flags: MessageFlags.Ephemeral,
        });
      }
      patch.categoryId = category.id;
    }

    if (limit !== null) patch.defaultLimit = limit;
    if (autoDelete !== null) patch.autoDelete = autoDelete;
  }

  if (!Object.keys(patch).length) {
    return interaction.reply({
      embeds: [settingsEmbed(guild, getSettings(guild.id))],
      flags: MessageFlags.Ephemeral,
    });
  }

  const settings = updateSettings(guild.id, patch);
  flush();

  await sendVoiceLog(guild, {
    action: 'setări actualizate',
    actorTag: interaction.user.tag,
    fields: [
      {
        name: 'Canal hub',
        value: settings.hubChannelId ? `<#${settings.hubChannelId}>` : 'Neconfigurat',
        inline: true,
      },
      {
        name: 'Categorie',
        value: settings.categoryId ? `<#${settings.categoryId}>` : 'Implicită',
        inline: true,
      },
      {
        name: 'Limită implicită',
        value: settings.defaultLimit ? `${settings.defaultLimit} membri` : 'Nelimitată',
        inline: true,
      },
      {
        name: 'Ștergere automată',
        value: settings.autoDelete ? 'Activă' : 'Dezactivată',
        inline: true,
      },
    ],
  });

  return interaction.reply({
    content: 'Setările Voice Manager au fost actualizate.',
    embeds: [settingsEmbed(guild, settings)],
    flags: MessageFlags.Ephemeral,
  });
}

async function statusCommand(interaction) {
  const guild = interaction.guild;
  const settings = getSettings(guild.id);
  const channels = getTemporaryChannels(guild.id);
  const totals = getVoiceTotals(guild.id);
  const embed = settingsEmbed(guild, settings);

  if (!channels.length) {
    embed.setDescription('Nu există canale vocale temporare active.');
    return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  }

  const lines = channels.slice(0, 15).map((entry) => {
    const channel = guild.channels.cache.get(entry.id);
    const members = channel?.members?.size ?? 0;
    const status = entry.locked ? 'blocat' : 'deschis';
    return `• **${entry.name}** — ${members} membri, ${entry.limit || 'fără'} limită, ${status}`;
  });

  if (channels.length > 15) {
    lines.push(`…și încă ${channels.length - 15} canale.`);
  }

  embed.setDescription(lines.join('\n').slice(0, 4096));

  if (totals.lastCreatedAt) {
    embed.setFooter({
      text: `Ultimul canal creat: ${new Date(totals.lastCreatedAt).toLocaleString('ro-RO')}`,
    });
  }

  return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

async function cleanupCommand(interaction) {
  const result = await cleanupVoiceChannels(interaction.guild);

  return interaction.reply({
    content: `Curățenie finalizată: **${result.deleted}** canale goale șterse, **${result.stale}** intrări expirate eliminate.`,
    flags: MessageFlags.Ephemeral,
  });
}

async function closeCommand(interaction) {
  const channel = interaction.options.getChannel('canal', true);
  const entry = getTemporaryChannel(channel.id);

  if (!entry || entry.guildId !== interaction.guild.id) {
    return interaction.reply({
      content: 'Canalul selectat nu este un canal vocal temporar gestionat de Voice Manager.',
      flags: MessageFlags.Ephemeral,
    });
  }

  try {
    await closeVoiceChannel(interaction.guild, entry, interaction.user.tag);
  } catch (error) {
    return interaction.reply({
      content: error.message || 'Canalul vocal nu a putut fi închis.',
      flags: MessageFlags.Ephemeral,
    });
  }

  return interaction.reply({
    content: `Canalul vocal **${entry.name}** a fost închis.`,
    flags: MessageFlags.Ephemeral,
  });
}

module.exports = {
  category: 'Voice Manager',
  data: new SlashCommandBuilder()
    .setName('voice-admin')
    .setDescription('Administrează Voice Manager')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((subcommand) =>
      subcommand
        .setName('setari')
        .setDescription('Configurează canalul hub, categoria și limitele')
        .addChannelOption((option) =>
          option
            .setName('hub')
            .setDescription('Canalul vocal în care membrii intră pentru a primi un canal')
            .addChannelTypes(ChannelType.GuildVoice),
        )
        .addChannelOption((option) =>
          option
            .setName('categorie')
            .setDescription('Categoria în care sunt create canalele temporare')
            .addChannelTypes(ChannelType.GuildCategory),
        )
        .addIntegerOption((option) =>
          option
            .setName('limita')
            .setDescription('Limita implicită de membri (0 = nelimitat)')
            .setMinValue(0)
            .setMaxValue(LIMIT_MAX),
        )
        .addBooleanOption((option) =>
          option
            .setName('stergere_automata')
            .setDescription('Șterge canalul când rămâne gol'),
        )
        .addBooleanOption((option) =>
          option
            .setName('reseteaza')
            .setDescription('Revine la valorile din .env'),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand.setName('status').setDescription('Vezi configurarea și canalele active'),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('curata')
        .setDescription('Șterge canalele temporare goale și intrările expirate'),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('inchide')
        .setDescription('Închide un canal vocal temporar')
        .addChannelOption((option) =>
          option
            .setName('canal')
            .setDescription('Canalul vocal temporar')
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildVoice),
        ),
    ),

  async execute(interaction) {
    switch (interaction.options.getSubcommand()) {
      case 'setari':
        return settingsCommand(interaction);
      case 'status':
        return statusCommand(interaction);
      case 'curata':
        return cleanupCommand(interaction);
      case 'inchide':
        return closeCommand(interaction);
      default:
        return undefined;
    }
  },
};
