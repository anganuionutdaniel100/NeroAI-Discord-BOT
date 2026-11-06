const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const {
  LOOP_MODES,
  LOOP_LABELS,
  VOLUME_MIN,
  VOLUME_MAX,
  MAX_QUEUE_MAX,
  QUERY_MIN,
  QUERY_MAX,
} = require('../utils/music');
const {
  enqueueForMember,
  controlForGuild,
  buildNowPlayingEmbed,
  buildQueueEmbed,
  historyEmbed,
  musicErrorContent,
  trackEmbed,
} = require('../handlers/music');

function controlReply(interaction, action) {
  switch (action) {
    case 'pause':
      return 'Muzica a fost pusă pe pauză.';
    case 'resume':
      return 'Redarea a fost reluată.';
    case 'stop':
      return 'Redarea a fost oprită și coada a fost golită.';
    case 'leave':
      return 'Am părăsit canalul vocal.';
    case 'shuffle':
      return 'Coada a fost amestecată.';
    default:
      return 'Acțiunea a fost aplicată.';
  }
}

async function playCommand(interaction) {
  await interaction.deferReply();

  const query = interaction.options.getString('cautare', true);
  const result = await enqueueForMember(interaction.guild, interaction.member, query, {
    textChannel: interaction.channel,
  });

  if (result.error) {
    return interaction.editReply({ content: musicErrorContent(result) });
  }

  const inQueue = result.position > 0;
  return interaction.editReply({
    embeds: [
      trackEmbed(result.track, {
        title: inQueue ? 'Muzică — adăugat în coadă' : 'Muzică — redare pornită',
        footer: inQueue ? `Poziția ${result.position} în coadă` : 'Redarea a pornit',
      }),
    ],
  });
}

async function controlCommand(interaction, action, value = null) {
  const result = await controlForGuild(interaction.guild, {
    member: interaction.member,
    action,
    value,
  });

  if (result.error) {
    return interaction.reply({
      content: musicErrorContent(result),
      flags: MessageFlags.Ephemeral,
    });
  }

  if (action === 'skip') {
    return interaction.reply({
      embeds: [
        trackEmbed(result.track, {
          title: 'Muzică — piesă sărită',
          footer: result.view.current ? 'Redau piesa următoare' : 'Coada este goală',
        }),
      ],
    });
  }

  if (action === 'remove') {
    return interaction.reply({
      embeds: [
        trackEmbed(result.track, {
          title: 'Muzică — eliminat din coadă',
        }),
      ],
    });
  }

  if (action === 'volume') {
    return interaction.reply({
      content: `Volumul a fost setat la ${result.volume}%.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  if (action === 'loop') {
    return interaction.reply({
      content: `Repetarea este acum: ${LOOP_LABELS[result.loop]}.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  if (action === 'clear') {
    return interaction.reply({
      content: `Coada a fost golită (${result.count} piese).`,
      flags: MessageFlags.Ephemeral,
    });
  }

  return interaction.reply({
    content: controlReply(interaction, action),
    flags: MessageFlags.Ephemeral,
  });
}

module.exports = {
  category: 'Muzică',
  data: new SlashCommandBuilder()
    .setName('music')
    .setDescription('Redă muzică de pe YouTube în canalul vocal')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('reda')
        .setDescription('Caută pe YouTube sau redă un link')
        .addStringOption((option) =>
          option
            .setName('cautare')
            .setDescription('Numele piesei sau un link YouTube')
            .setRequired(true)
            .setMinLength(QUERY_MIN)
            .setMaxLength(QUERY_MAX),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('coada')
        .setDescription('Vezi coada de redare')
        .addIntegerOption((option) =>
          option
            .setName('pagina')
            .setDescription('Pagina cozii')
            .setMinValue(1)
            .setMaxValue(50),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand.setName('acum').setDescription('Vezi piesa care rulează acum'),
    )
    .addSubcommand((subcommand) =>
      subcommand.setName('pauza').setDescription('Pune muzica pe pauză'),
    )
    .addSubcommand((subcommand) =>
      subcommand.setName('reluare').setDescription('Reia muzica'),
    )
    .addSubcommand((subcommand) =>
      subcommand.setName('sari').setDescription('Sari la piesa următoare'),
    )
    .addSubcommand((subcommand) =>
      subcommand.setName('opreste').setDescription('Oprește redarea și golește coada'),
    )
    .addSubcommand((subcommand) =>
      subcommand.setName('pleaca').setDescription('Deconectează botul de la canalul vocal'),
    )
    .addSubcommand((subcommand) =>
      subcommand.setName('amesteca').setDescription('Amestecă piesele din coadă'),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('volum')
        .setDescription('Setează volumul redării')
        .addIntegerOption((option) =>
          option
            .setName('nivel')
            .setDescription('Volumul între 0 și 100')
            .setRequired(true)
            .setMinValue(VOLUME_MIN)
            .setMaxValue(VOLUME_MAX),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('repeta')
        .setDescription('Setează modul de repetare')
        .addStringOption((option) =>
          option
            .setName('mod')
            .setDescription('Modul de repetare')
            .setRequired(true)
            .addChoices(
              ...LOOP_MODES.map((mode) => ({ name: LOOP_LABELS[mode], value: mode })),
            ),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('elimina')
        .setDescription('Elimină o piesă din coadă')
        .addIntegerOption((option) =>
          option
            .setName('pozitie')
            .setDescription('Poziția piesei în coadă')
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(MAX_QUEUE_MAX),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand.setName('istoric').setDescription('Vezi istoricul pieselor redate'),
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'reda') return playCommand(interaction);

    if (subcommand === 'coada') {
      const embed = buildQueueEmbed(
        interaction.guild,
        interaction.options.getInteger('pagina') ?? 1,
      );
      if (!embed) {
        return interaction.reply({
          content: musicErrorContent({ error: 'idle' }),
          flags: MessageFlags.Ephemeral,
        });
      }
      return interaction.reply({ embeds: [embed] });
    }

    if (subcommand === 'acum') {
      const embed = buildNowPlayingEmbed(interaction.guild);
      if (!embed) {
        return interaction.reply({
          content: musicErrorContent({ error: 'idle' }),
          flags: MessageFlags.Ephemeral,
        });
      }
      return interaction.reply({ embeds: [embed] });
    }

    if (subcommand === 'istoric') {
      return interaction.reply({ embeds: [historyEmbed(interaction.guild)] });
    }

    if (subcommand === 'volum') {
      return controlCommand(
        interaction,
        'volume',
        interaction.options.getInteger('nivel', true),
      );
    }

    if (subcommand === 'repeta') {
      return controlCommand(
        interaction,
        'loop',
        interaction.options.getString('mod', true),
      );
    }

    if (subcommand === 'elimina') {
      return controlCommand(
        interaction,
        'remove',
        interaction.options.getInteger('pozitie', true),
      );
    }

    const actions = {
      pauza: 'pause',
      reluare: 'resume',
      sari: 'skip',
      opreste: 'stop',
      pleaca: 'leave',
      amesteca: 'shuffle',
    };

    const action = actions[subcommand];
    if (!action) return undefined;

    return controlCommand(interaction, action);
  },
};
