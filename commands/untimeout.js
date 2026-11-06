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
    .setName('untimeout')
    .setDescription('Scoate un membru din timeout')
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
        content: 'Nu ai permisiunea să scoți membri din timeout.',
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

    if (!member.isCommunicationDisabled()) {
      return interaction.reply({
        content: 'Acest membru nu este în timeout.',
        flags: MessageFlags.Ephemeral,
      });
    }

    if (!member.moderatable) {
      return interaction.reply({
        content: 'Nu pot scoate acest membru din timeout (permisiuni insuficiente).',
        flags: MessageFlags.Ephemeral,
      });
    }

    await member.timeout(null, reason);

    const embed = new EmbedBuilder()
      .setColor(0x57f287)
      .setTitle('Timeout retras')
      .setDescription(`**${user.tag}** (${user.id}) nu mai este în timeout.`)
      .addFields({ name: 'Motiv', value: reason })
      .setFooter({ text: `Moderator: ${interaction.user.tag}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });

    await sendModLog(interaction.guild, {
      title: 'Untimeout',
      description: `${user.tag} (${user.id})`,
      color: 0x57f287,
      fields: [
        { name: 'Motiv', value: reason },
        { name: 'Moderator', value: `${interaction.user.tag} (${interaction.user.id})` },
      ],
    });
  },
};
