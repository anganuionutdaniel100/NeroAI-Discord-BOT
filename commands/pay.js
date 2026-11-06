const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const config = require('../config');
const { getAccount, transfer, formatAmount } = require('../utils/economy');

module.exports = {
  category: 'Economie',
  data: new SlashCommandBuilder()
    .setName('pay')
    .setDescription('Trimite monede altui membru')
    .addUserOption((option) =>
      option.setName('membru').setDescription('Cui îi trimiți').setRequired(true),
    )
    .addIntegerOption((option) =>
      option
        .setName('suma')
        .setDescription('Cât trimiți')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(1_000_000),
    ),

  async execute(interaction) {
    const target = interaction.options.getUser('membru', true);
    const amount = interaction.options.getInteger('suma', true);

    if (target.bot) {
      return interaction.reply({
        content: 'Nu poți trimite monede unui bot.',
        flags: MessageFlags.Ephemeral,
      });
    }

    if (target.id === interaction.user.id) {
      return interaction.reply({
        content: 'Nu îți poți trimite monede ție.',
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

    const sender = getAccount(interaction.guild.id, interaction.user.id);
    if (sender.balance < amount) {
      return interaction.reply({
        content: `Nu ai suficienți bani. Ai **${formatAmount(sender.balance)} ${config.economy.currency}**.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    if (!transfer(interaction.guild.id, interaction.user.id, target.id, amount)) {
      return interaction.reply({
        content: 'Transferul nu a putut fi efectuat. Încearcă din nou.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const balance = getAccount(interaction.guild.id, interaction.user.id).balance;

    const embed = new EmbedBuilder()
      .setColor(0xfee75c)
      .setTitle('Transfer efectuat')
      .setDescription(
        `${interaction.user} i-a trimis **${formatAmount(amount)} ${config.economy.currency}** lui ${target}.`,
      )
      .addFields({
        name: 'Balanța ta',
        value: `${formatAmount(balance)} ${config.economy.currency}`,
        inline: true,
      })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
