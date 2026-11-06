const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  MessageFlags,
} = require('discord.js');
const {
  adjustReputation,
  resetReputation,
  flush,
} = require('../utils/reputation');
const { sendModLog } = require('../utils/log');

async function resolveTarget(interaction) {
  const target = interaction.options.getUser('membru', true);

  if (target.bot) {
    await interaction.reply({
      content: 'Nu poți ajusta reputația unui bot.',
      flags: MessageFlags.Ephemeral,
    });
    return null;
  }

  const member = await interaction.guild.members.fetch(target.id).catch(() => null);
  if (!member) {
    await interaction.reply({
      content: 'Utilizatorul nu este pe acest server.',
      flags: MessageFlags.Ephemeral,
    });
    return null;
  }

  return target;
}

async function finish(interaction, { target, before, after, effective, action, reason }) {
  flush();

  const embed = new EmbedBuilder()
    .setColor(effective >= 0 ? 0x57f287 : 0xed4245)
    .setTitle('Reputație ajustată')
    .addFields(
      { name: 'Membru', value: `${target} (${target.id})` },
      { name: 'Acțiune', value: action, inline: true },
      {
        name: 'Modificare',
        value: `${effective > 0 ? '+' : ''}${effective}`,
        inline: true,
      },
      { name: 'Reputație nouă', value: `${after}`, inline: true },
      { name: 'Reputație anterioară', value: `${before}`, inline: true },
      { name: 'Motiv', value: reason ?? 'Fără motiv' },
    )
    .setFooter({ text: `Admin: ${interaction.user.tag}` })
    .setTimestamp();

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });

  await sendModLog(interaction.guild, {
    title: 'Reputație — ajustare',
    description: `${target.tag} (${target.id})`,
    color: effective >= 0 ? 0x57f287 : 0xed4245,
    fields: [
      { name: 'Acțiune', value: action, inline: true },
      {
        name: 'Modificare',
        value: `${effective > 0 ? '+' : ''}${effective}`,
        inline: true,
      },
      { name: 'Reputație nouă', value: `${after}`, inline: true },
      { name: 'Motiv', value: reason ?? 'Fără motiv' },
      { name: 'Admin', value: `${interaction.user.tag} (${interaction.user.id})` },
    ],
  });
}

module.exports = {
  category: 'Reputație',
  data: new SlashCommandBuilder()
    .setName('reputation-admin')
    .setDescription('Adaugă, scade sau resetează reputația unui membru')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((subcommand) =>
      subcommand
        .setName('adauga')
        .setDescription('Adaugă puncte de reputație')
        .addUserOption((option) =>
          option.setName('membru').setDescription('Membrul').setRequired(true),
        )
        .addIntegerOption((option) =>
          option
            .setName('puncte')
            .setDescription('Câte puncte adaugi')
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(10_000),
        )
        .addStringOption((option) =>
          option.setName('motiv').setDescription('Motivul').setMaxLength(200),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('scade')
        .setDescription('Scade puncte de reputație')
        .addUserOption((option) =>
          option.setName('membru').setDescription('Membrul').setRequired(true),
        )
        .addIntegerOption((option) =>
          option
            .setName('puncte')
            .setDescription('Câte puncte scazi')
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(10_000),
        )
        .addStringOption((option) =>
          option.setName('motiv').setDescription('Motivul').setMaxLength(200),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('reseteaza')
        .setDescription('Resetează reputația unui membru la 0')
        .addUserOption((option) =>
          option.setName('membru').setDescription('Membrul').setRequired(true),
        )
        .addStringOption((option) =>
          option.setName('motiv').setDescription('Motivul').setMaxLength(200),
        ),
    ),

  async execute(interaction) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({
        content: 'Ai nevoie de permisiunea Manage Server pentru asta.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const subcommand = interaction.options.getSubcommand();
    const reason = interaction.options.getString('motiv')?.trim() || null;
    const target = await resolveTarget(interaction);
    if (!target) return undefined;

    if (subcommand === 'reseteaza') {
      const result = resetReputation(interaction.guild.id, target.id, {
        reason,
        adminId: interaction.user.id,
      });

      if (result.before === 0) {
        return interaction.reply({
          content: 'Reputația este deja 0; nu a fost modificată.',
          flags: MessageFlags.Ephemeral,
        });
      }

      return finish(interaction, {
        target,
        ...result,
        action: 'Resetare la 0',
        reason: reason ?? 'Resetare din comanda de administrare',
      });
    }

    const points = interaction.options.getInteger('puncte', true);
    const amount = subcommand === 'scade' ? -points : points;
    const result = adjustReputation(interaction.guild.id, target.id, amount, {
      reason,
      adminId: interaction.user.id,
    });

    if (result.effective === 0) {
      return interaction.reply({
        content: 'Reputația este deja 0; nu a fost modificată.',
        flags: MessageFlags.Ephemeral,
      });
    }

    return finish(interaction, {
      target,
      ...result,
      action: amount > 0 ? `Adăugare +${points}` : `Scădere -${points}`,
      reason: reason ?? 'Ajustare din comanda de administrare',
    });
  },
};
