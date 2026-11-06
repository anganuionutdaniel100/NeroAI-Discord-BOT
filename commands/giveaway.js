const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  MessageFlags,
} = require('discord.js');
const {
  createGiveaway,
  setMessageId,
  getGiveaway,
  getActiveGiveaways,
  flush,
} = require('../utils/giveaways');
const {
  buildGiveawayEmbed,
  joinRow,
  scheduleGiveaway,
  endAndAnnounce,
  rerollAndAnnounce,
} = require('../handlers/giveaways');

function winnerList(winners) {
  return winners.length ? winners.map((userId) => `<@${userId}>`).join(', ') : 'niciunul';
}

async function startGiveaway(interaction) {
  if (!interaction.channel?.isTextBased()) {
    return interaction.reply({
      content: 'Giveaway-ul poate fi pornit doar într-un canal text.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const prize = interaction.options.getString('premiu', true).trim();
  if (!prize) {
    return interaction.reply({
      content: 'Premiul nu poate fi gol.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const minutes = interaction.options.getInteger('minute', true);
  const winnersCount = interaction.options.getInteger('castigatori') ?? 1;
  const role = interaction.options.getRole('rol');

  const giveaway = createGiveaway({
    guildId: interaction.guild.id,
    channelId: interaction.channel.id,
    hostId: interaction.user.id,
    hostTag: interaction.user.tag,
    prize,
    winnersCount,
    requiredRoleId: role?.id ?? null,
    endsAt: Date.now() + minutes * 60_000,
  });

  const message = await interaction.channel.send({
    embeds: [buildGiveawayEmbed(giveaway)],
    components: [joinRow(giveaway.id)],
  });

  setMessageId(giveaway.id, message.id);
  flush();
  scheduleGiveaway(interaction.client, giveaway);

  return interaction.reply({
    content: `Giveaway pornit: ${message.url}\nSe încheie <t:${Math.floor(giveaway.endsAt / 1000)}:R>. ID: \`${giveaway.id}\``,
    flags: MessageFlags.Ephemeral,
  });
}

async function endGiveaway(interaction) {
  const id = interaction.options.getString('id', true);
  const giveaway = getGiveaway(id);

  if (!giveaway || giveaway.guildId !== interaction.guild.id) {
    return interaction.reply({
      content: 'Nu am găsit un giveaway cu acest ID pe server.',
      flags: MessageFlags.Ephemeral,
    });
  }

  if (giveaway.endedAt) {
    return interaction.reply({
      content: 'Giveaway-ul este deja încheiat. Folosește `/giveaway reroll` pentru alți câștigători.',
      flags: MessageFlags.Ephemeral,
    });
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const ended = await endAndAnnounce(interaction.client, giveaway.id);

  if (!ended) {
    return interaction.editReply('Giveaway-ul nu a putut fi încheiat.');
  }

  return interaction.editReply(
    `Giveaway încheiat. Câștigători: ${winnerList(ended.winners)}.`,
  );
}

async function rerollGiveaway(interaction) {
  const id = interaction.options.getString('id', true);
  const giveaway = getGiveaway(id);

  if (!giveaway || giveaway.guildId !== interaction.guild.id) {
    return interaction.reply({
      content: 'Nu am găsit un giveaway cu acest ID pe server.',
      flags: MessageFlags.Ephemeral,
    });
  }

  if (!giveaway.endedAt) {
    return interaction.reply({
      content: 'Giveaway-ul nu s-a încheiat încă. Folosește `/giveaway end` mai întâi.',
      flags: MessageFlags.Ephemeral,
    });
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const rerolled = await rerollAndAnnounce(interaction.client, giveaway.id);

  if (!rerolled) {
    return interaction.editReply('Giveaway-ul nu a putut fi reluat.');
  }

  return interaction.editReply(
    `Câștigători noi: ${winnerList(rerolled.winners)}.`,
  );
}

async function listGiveaways(interaction) {
  const active = getActiveGiveaways(interaction.guild.id);

  if (!active.length) {
    return interaction.reply({
      content: 'Nu există giveaway-uri active pe acest server.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const shown = active.slice(0, 10);
  const description = shown
    .map(
      (giveaway) =>
        `**${giveaway.prize}** — <#${giveaway.channelId}>\nSe încheie <t:${Math.floor(giveaway.endsAt / 1000)}:R> • Participanți: ${giveaway.participants.length} • ID: \`${giveaway.id}\``,
    )
    .join('\n\n');

  const embed = new EmbedBuilder()
    .setColor(0xfee75c)
    .setTitle('Giveaway-uri active')
    .setDescription(description)
    .setFooter({ text: `${active.length} active • maximum 10 afișate` })
    .setTimestamp();

  return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

module.exports = {
  category: 'Giveaway',
  data: new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('Gestionează giveaway-urile serverului')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((subcommand) =>
      subcommand
        .setName('start')
        .setDescription('Pornește un giveaway în acest canal')
        .addStringOption((option) =>
          option
            .setName('premiu')
            .setDescription('Ce se câștigă')
            .setRequired(true)
            .setMaxLength(200),
        )
        .addIntegerOption((option) =>
          option
            .setName('minute')
            .setDescription('Durata în minute')
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(10_080),
        )
        .addIntegerOption((option) =>
          option
            .setName('castigatori')
            .setDescription('Numărul de câștigători (implicit 1)')
            .setMinValue(1)
            .setMaxValue(20),
        )
        .addRoleOption((option) =>
          option.setName('rol').setDescription('Rol necesar pentru a participa'),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('end')
        .setDescription('Încheie un giveaway acum')
        .addStringOption((option) =>
          option.setName('id').setDescription('ID-ul giveaway-ului').setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('reroll')
        .setDescription('Alege din nou câștigătorii unui giveaway încheiat')
        .addStringOption((option) =>
          option.setName('id').setDescription('ID-ul giveaway-ului').setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand.setName('list').setDescription('Listează giveaway-urile active'),
    ),

  async execute(interaction) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({
        content: 'Ai nevoie de permisiunea Manage Server pentru asta.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case 'start':
        return startGiveaway(interaction);
      case 'end':
        return endGiveaway(interaction);
      case 'reroll':
        return rerollGiveaway(interaction);
      case 'list':
        return listGiveaways(interaction);
      default:
        return undefined;
    }
  },
};
