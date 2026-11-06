const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  MessageFlags,
} = require('discord.js');
const { hierarchyError } = require('../utils/moderation');
const { clearWarnings } = require('../utils/warnings');
const { sendModLog } = require('../utils/log');

module.exports = {
  category: 'Moderare',
  data: new SlashCommandBuilder()
    .setName('clearwarnings')
    .setDescription('Șterge toate avertismentele unui membru')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((option) =>
      option.setName('membru').setDescription('Membrul').setRequired(true),
    )
    .addStringOption((option) =>
      option.setName('motiv').setDescription('Motivul').setMaxLength(500),
    ),

  async execute(interaction) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ModerateMembers)) {
      return interaction.reply({
        content: 'Nu ai permisiunea să ștergi avertismente.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const user = interaction.options.getUser('membru', true);
    const reason = interaction.options.getString('motiv') ?? 'Fără motiv';

    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (member) {
      const error = await hierarchyError(interaction, member);
      if (error) {
        return interaction.reply({ content: error, flags: MessageFlags.Ephemeral });
      }
    }

    const total = clearWarnings(interaction.guild.id, user.id);
    if (!total) {
      return interaction.reply({
        content: 'Acest membru nu are avertismente.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const embed = new EmbedBuilder()
      .setColor(0x57f287)
      .setTitle('Avertismente șterse')
      .setDescription(
        `Au fost șterse **${total}** avertismente pentru **${user.tag}**.`,
      )
      .addFields({ name: 'Motiv', value: reason })
      .setFooter({ text: `Moderator: ${interaction.user.tag}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });

    await sendModLog(interaction.guild, {
      title: 'Warn-uri șterse',
      description: `${user.tag} (${user.id})`,
      color: 0x57f287,
      fields: [
        { name: 'Avertismente șterse', value: `${total}`, inline: true },
        { name: 'Motiv', value: reason },
        { name: 'Moderator', value: `${interaction.user.tag} (${interaction.user.id})` },
      ],
    });
  },
};
