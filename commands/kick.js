const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  MessageFlags,
} = require('discord.js');
const { hierarchyError } = require('../utils/moderation');
const { sendModLog } = require('../utils/log');

module.exports = {
  category: 'Moderare',
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Dai afară un membru de pe server')
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addUserOption((option) =>
      option.setName('membru').setDescription('Membrul de dat afară').setRequired(true),
    )
    .addStringOption((option) =>
      option.setName('motiv').setDescription('Motivul').setMaxLength(500),
    ),

  async execute(interaction) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.KickMembers)) {
      return interaction.reply({
        content: 'Nu ai permisiunea să dai afară membri.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const user = interaction.options.getUser('membru', true);
    const reason = interaction.options.getString('motiv') ?? 'Fără motiv';

    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (!member) {
      return interaction.reply({
        content: 'Utilizatorul nu este pe acest server.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const error = await hierarchyError(interaction, member);
    if (error) {
      return interaction.reply({ content: error, flags: MessageFlags.Ephemeral });
    }

    if (!member.kickable) {
      return interaction.reply({
        content: 'Nu pot da afară acest membru (permisiuni insuficiente).',
        flags: MessageFlags.Ephemeral,
      });
    }

    await member.kick(reason);

    const embed = new EmbedBuilder()
      .setColor(0xed4245)
      .setTitle('Membru dat afară')
      .setDescription(`**${user.tag}** (${user.id}) a fost dat afară.`)
      .addFields({ name: 'Motiv', value: reason })
      .setFooter({ text: `Moderator: ${interaction.user.tag}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });

    await sendModLog(interaction.guild, {
      title: 'Kick',
      description: `${user.tag} (${user.id})`,
      fields: [
        { name: 'Motiv', value: reason },
        { name: 'Moderator', value: `${interaction.user.tag} (${interaction.user.id})` },
      ],
    });
  },
};
