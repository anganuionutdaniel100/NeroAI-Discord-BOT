const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  MessageFlags,
} = require('discord.js');
const { hierarchyError } = require('../utils/moderation');
const { getWarnings, removeWarning } = require('../utils/warnings');
const { sendModLog } = require('../utils/log');

module.exports = {
  category: 'Moderare',
  data: new SlashCommandBuilder()
    .setName('unwarn')
    .setDescription('Elimină un avertisment după ID')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((option) =>
      option.setName('membru').setDescription('Membrul').setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName('id')
        .setDescription('ID-ul avertismentului (apare în /warnings)')
        .setRequired(true)
        .setMinLength(1)
        .setMaxLength(20),
    ),

  async execute(interaction) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ModerateMembers)) {
      return interaction.reply({
        content: 'Nu ai permisiunea să elimini avertismente.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const user = interaction.options.getUser('membru', true);
    const warningId = interaction.options.getString('id', true).trim();

    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (member) {
      const error = await hierarchyError(interaction, member);
      if (error) {
        return interaction.reply({ content: error, flags: MessageFlags.Ephemeral });
      }
    }

    const removed = removeWarning(interaction.guild.id, user.id, warningId);
    if (!removed) {
      return interaction.reply({
        content: 'Avertismentul nu a fost găsit. Verifică ID-ul cu `/warnings`.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const total = getWarnings(interaction.guild.id, user.id).length;

    const embed = new EmbedBuilder()
      .setColor(0x57f287)
      .setTitle('Avertisment eliminat')
      .setDescription(`Un avertisment a fost eliminat pentru **${user.tag}**.`)
      .addFields(
        { name: 'Motivul avertismentului', value: removed.reason },
        { name: 'Total rămas', value: `${total}`, inline: true },
        { name: 'ID', value: removed.id, inline: true },
      )
      .setFooter({ text: `Moderator: ${interaction.user.tag}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });

    await sendModLog(interaction.guild, {
      title: 'Warn eliminat',
      description: `${user.tag} (${user.id})`,
      color: 0x57f287,
      fields: [
        { name: 'ID', value: removed.id, inline: true },
        { name: 'Motiv', value: removed.reason },
        { name: 'Total rămas', value: `${total}`, inline: true },
        { name: 'Moderator', value: `${interaction.user.tag} (${interaction.user.id})` },
      ],
    });
  },
};
