const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const config = require('../config');
const { giveReputation, formatDuration, flush } = require('../utils/reputation');

module.exports = {
  category: 'Reputație',
  data: new SlashCommandBuilder()
    .setName('rep')
    .setDescription('Oferă un punct de reputație unui membru')
    .addUserOption((option) =>
      option.setName('membru').setDescription('Cui îi oferi reputație').setRequired(true),
    )
    .addStringOption((option) =>
      option.setName('motiv').setDescription('Motivul (opțional)').setMaxLength(200),
    ),

  async execute(interaction) {
    const target = interaction.options.getUser('membru', true);
    const reason = interaction.options.getString('motiv');

    if (target.bot) {
      return interaction.reply({
        content: 'Nu poți oferi reputație unui bot.',
        flags: MessageFlags.Ephemeral,
      });
    }

    if (target.id === interaction.user.id) {
      return interaction.reply({
        content: 'Nu îți poți oferi reputație ție.',
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

    const cooldownMs = config.reputation.cooldownHours * 60 * 60 * 1000;
    const result = giveReputation(interaction.guild.id, interaction.user.id, target.id, {
      reason,
      cooldownMs,
    });

    if (!result.ok && result.code === 'cooldown') {
      return interaction.reply({
        content: `Ai oferit deja reputație recent. Poți oferi din nou peste ${formatDuration(result.remainingMs)}.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    if (!result.ok) {
      return interaction.reply({
        content: 'Reputația nu a putut fi oferită. Încearcă din nou.',
        flags: MessageFlags.Ephemeral,
      });
    }

    flush();

    const embed = new EmbedBuilder()
      .setColor(0x57f287)
      .setTitle('Reputație oferită')
      .setDescription(
        `${interaction.user} i-a oferit un punct de reputație lui ${target}.`,
      )
      .addFields({
        name: 'Reputație totală',
        value: `${result.points}`,
        inline: true,
      })
      .setTimestamp();

    if (reason) embed.addFields({ name: 'Motiv', value: reason });

    embed.setFooter({
      text:
        cooldownMs > 0
          ? `Următorul punct disponibil peste ${formatDuration(cooldownMs)}.`
          : 'Poți oferi reputație fără pauză.',
    });

    await interaction.reply({ embeds: [embed] });
  },
};
