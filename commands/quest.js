const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const config = require('../config');
const { getEntry, grantXp, flush: flushLevels } = require('../utils/levels');
const { addBalance, getAccount, flush: flushEconomy } = require('../utils/economy');
const {
  TYPE_LABELS,
  getQuest,
  startQuest,
  abandonQuest,
  claimQuest,
  claimAll,
  flush,
} = require('../utils/quests');
const {
  buildQuestProgressEmbed,
  buildQuestCatalogEmbed,
  buildQuestDetailsEmbed,
  progressRow,
  sendQuestsLog,
} = require('../handlers/quests');

function formatNumber(value) {
  return Number(value).toLocaleString('ro-RO');
}

function rewardLabel(coins, xp) {
  const parts = [];
  if (coins > 0) parts.push(`${formatNumber(coins)} ${config.economy.currency}`);
  if (xp > 0) parts.push(`${formatNumber(xp)} XP`);
  return parts.length ? parts.join(' • ') : 'Fără recompensă';
}

async function listCommand(interaction) {
  const level = getEntry(interaction.guild.id, interaction.member.id);
  return interaction.reply({
    embeds: [buildQuestCatalogEmbed(interaction.guild, interaction.member, level.level)],
    flags: MessageFlags.Ephemeral,
  });
}

async function progressCommand(interaction) {
  const { embed, entries } = buildQuestProgressEmbed(interaction.guild, interaction.member);
  return interaction.reply({
    embeds: [embed],
    components: entries.length ? [progressRow(entries)] : [],
    flags: MessageFlags.Ephemeral,
  });
}

async function detailsCommand(interaction) {
  const quest = getQuest(interaction.guild.id, interaction.options.getString('quest', true));
  if (!quest) {
    return interaction.reply({
      content: 'Questul nu a fost găsit. Folosește /quest lista pentru cele disponibile.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const level = getEntry(interaction.guild.id, interaction.member.id);
  return interaction.reply({
    embeds: [buildQuestDetailsEmbed(interaction.guild, interaction.member, quest, level.level)],
    flags: MessageFlags.Ephemeral,
  });
}

async function startCommand(interaction) {
  const guild = interaction.guild;
  const quest = getQuest(guild.id, interaction.options.getString('quest', true));
  if (!quest) {
    return interaction.reply({
      content: 'Questul nu a fost găsit.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const level = getEntry(guild.id, interaction.member.id);
  const result = startQuest(guild.id, interaction.member.id, quest.id, level.level);

  if (!result.ok) {
    return interaction.reply({ content: result.error, flags: MessageFlags.Ephemeral });
  }

  flush();

  await sendQuestsLog(guild, {
    action: 'quest început',
    actorTag: interaction.user.tag,
    fields: [
      { name: 'Membru', value: `<@${interaction.user.id}>`, inline: true },
      { name: 'Quest', value: `${quest.name} (${quest.id})`, inline: false },
      { name: 'Pași', value: String(quest.steps.length), inline: true },
      { name: 'Recompensă', value: rewardLabel(quest.rewardCoins, quest.rewardXp), inline: true },
    ],
  });

  return interaction.reply({
    content: `Ai început questul **${quest.name}**. Primul pas: **${TYPE_LABELS[quest.steps[0].type]}** — ${formatNumber(quest.steps[0].target)}.`,
    embeds: [buildQuestDetailsEmbed(guild, interaction.member, quest, level.level)],
    flags: MessageFlags.Ephemeral,
  });
}

async function claimCommand(interaction) {
  const guild = interaction.guild;
  const questId = interaction.options.getString('quest');
  let result;

  if (questId) {
    result = claimQuest(guild.id, interaction.member.id, questId);
    if (!result.ok) {
      return interaction.reply({ content: result.error, flags: MessageFlags.Ephemeral });
    }
    result = {
      claims: [result],
      coins: result.coins,
      xp: result.xp,
    };
  } else {
    result = claimAll(guild.id, interaction.member.id);
    if (!result.claims.length) {
      return interaction.reply({
        content: 'Nu ai nicio recompensă de quest de revendicat momentan.',
        flags: MessageFlags.Ephemeral,
      });
    }
  }

  if (result.coins > 0) addBalance(guild.id, interaction.member.id, result.coins);
  if (result.xp > 0) grantXp(guild.id, interaction.member.id, result.xp);

  flush();
  flushEconomy();
  flushLevels();

  const account = getAccount(guild.id, interaction.member.id);
  const level = getEntry(guild.id, interaction.member.id);

  const embed = new EmbedBuilder()
    .setColor(0x57f287)
    .setTitle('Recompense de quest revendicate')
    .setDescription(
      `Ai revendicat **${result.claims.length}** ${result.claims.length === 1 ? 'recompensă' : 'recompense'}.`,
    )
    .addFields(
      ...result.claims.slice(0, 10).map((claim) => ({
        name: claim.quest.name,
        value: rewardLabel(claim.coins, claim.xp),
        inline: true,
      })),
      { name: 'Total', value: rewardLabel(result.coins, result.xp), inline: false },
      {
        name: 'Portofel',
        value: `${formatNumber(account.balance)} ${config.economy.currency}`,
        inline: true,
      },
      { name: 'Nivel', value: `${level.level} • ${formatNumber(level.totalXp)} XP`, inline: true },
    )
    .setTimestamp();

  await sendQuestsLog(guild, {
    action: 'recompense revendicate',
    actorTag: interaction.user.tag,
    fields: [
      { name: 'Membru', value: `<@${interaction.user.id}>`, inline: true },
      { name: 'Quest-uri', value: String(result.claims.length), inline: true },
      { name: 'Recompense', value: rewardLabel(result.coins, result.xp), inline: true },
    ],
  });

  return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

async function abandonCommand(interaction) {
  const guild = interaction.guild;
  const quest = getQuest(guild.id, interaction.options.getString('quest', true));

  if (!quest) {
    return interaction.reply({
      content: 'Questul nu a fost găsit.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const result = abandonQuest(guild.id, interaction.member.id, quest.id);
  if (!result.ok) {
    return interaction.reply({ content: result.error, flags: MessageFlags.Ephemeral });
  }

  flush();

  await sendQuestsLog(guild, {
    action: 'quest abandonat',
    actorTag: interaction.user.tag,
    fields: [
      { name: 'Membru', value: `<@${interaction.user.id}>`, inline: true },
      { name: 'Quest', value: `${quest.name} (${quest.id})`, inline: false },
    ],
  });

  return interaction.reply({
    content: `Ai abandonat questul **${quest.name}**. Progresul lui a fost șters.`,
    flags: MessageFlags.Ephemeral,
  });
}

module.exports = {
  category: 'Quest-uri',
  data: new SlashCommandBuilder()
    .setName('quest')
    .setDescription('Quest-uri: catalog, progres, începere și revendicare')
    .addSubcommand((subcommand) =>
      subcommand.setName('lista').setDescription('Vezi quest-urile disponibile'),
    )
    .addSubcommand((subcommand) =>
      subcommand.setName('progres').setDescription('Vezi progresul quest-urilor tale'),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('detalii')
        .setDescription('Vezi pașii unui quest')
        .addStringOption((option) =>
          option
            .setName('quest')
            .setDescription('Numele sau ID-ul questului')
            .setRequired(true)
            .setAutocomplete(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('incepe')
        .setDescription('Începe un quest')
        .addStringOption((option) =>
          option
            .setName('quest')
            .setDescription('Numele sau ID-ul questului')
            .setRequired(true)
            .setAutocomplete(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('revendica')
        .setDescription('Revendică recompensele quest-urilor finalizate')
        .addStringOption((option) =>
          option
            .setName('quest')
            .setDescription('Un quest anume; lasă gol pentru toate')
            .setAutocomplete(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('abandoneaza')
        .setDescription('Abandonează un quest început')
        .addStringOption((option) =>
          option
            .setName('quest')
            .setDescription('Numele sau ID-ul questului')
            .setRequired(true)
            .setAutocomplete(true),
        ),
    ),

  async execute(interaction) {
    switch (interaction.options.getSubcommand()) {
      case 'lista':
        return listCommand(interaction);
      case 'progres':
        return progressCommand(interaction);
      case 'detalii':
        return detailsCommand(interaction);
      case 'incepe':
        return startCommand(interaction);
      case 'revendica':
        return claimCommand(interaction);
      case 'abandoneaza':
        return abandonCommand(interaction);
      default:
        return undefined;
    }
  },
};
