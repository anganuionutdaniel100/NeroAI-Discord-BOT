const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  MessageFlags,
} = require('discord.js');
const config = require('../config');
const { getAccount, addBalance, formatAmount } = require('../utils/economy');
const { sendModLog } = require('../utils/log');

module.exports = {
  category: 'Economie',
  data: new SlashCommandBuilder()
    .setName('economy-admin')
    .setDescription('Adaugă sau scade monede dintr-un cont')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addUserOption((option) =>
      option.setName('membru').setDescription('Membrul').setRequired(true),
    )
    .addIntegerOption((option) =>
      option
        .setName('suma')
        .setDescription('Suma (negativă pentru a scădea)')
        .setRequired(true)
        .setMinValue(-1_000_000)
        .setMaxValue(1_000_000),
    )
    .addStringOption((option) =>
      option.setName('motiv').setDescription('Motivul').setMaxLength(200),
    ),

  async execute(interaction) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({
        content: 'Ai nevoie de permisiunea Manage Server pentru asta.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const target = interaction.options.getUser('membru', true);
    const amount = interaction.options.getInteger('suma', true);
    const reason = interaction.options.getString('motiv') ?? 'Fără motiv';

    if (amount === 0) {
      return interaction.reply({
        content: 'Suma trebuie să fie diferită de 0.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const targetMember = await interaction.guild.members.fetch(target.id).catch(() => null);
    if (!targetMember) {
      return interaction.reply({
        content: 'Utilizatorul nu este pe acest server.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const before = getAccount(interaction.guild.id, target.id).balance;
    const after = addBalance(interaction.guild.id, target.id, amount);
    const effective = after - before;

    const embed = new EmbedBuilder()
      .setColor(effective >= 0 ? 0x57f287 : 0xed4245)
      .setTitle('Ajustare economie')
      .addFields(
        { name: 'Membru', value: `${target} (${target.id})` },
        {
          name: 'Sumă',
          value: `${amount > 0 ? '+' : ''}${formatAmount(amount)} ${config.economy.currency}`,
          inline: true,
        },
        {
          name: 'Balanță nouă',
          value: `${formatAmount(after)} ${config.economy.currency}`,
          inline: true,
        },
        { name: 'Motiv', value: reason },
      )
      .setFooter({ text: `Admin: ${interaction.user.tag}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });

    await sendModLog(interaction.guild, {
      title: 'Economie — ajustare',
      description: `${target.tag} (${target.id})`,
      color: effective >= 0 ? 0x57f287 : 0xed4245,
      fields: [
        { name: 'Sumă efectivă', value: `${effective > 0 ? '+' : ''}${formatAmount(effective)}`, inline: true },
        { name: 'Balanță nouă', value: formatAmount(after), inline: true },
        { name: 'Motiv', value: reason },
        { name: 'Admin', value: `${interaction.user.tag} (${interaction.user.id})` },
      ],
    });
  },
};
