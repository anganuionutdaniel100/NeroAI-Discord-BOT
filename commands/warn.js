const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  MessageFlags,
} = require('discord.js');
const { hierarchyError } = require('../utils/moderation');
const { addWarning, getWarnings } = require('../utils/warnings');
const { sendModLog } = require('../utils/log');

module.exports = {
  category: 'Moderare',
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Avertizează un membru')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((option) =>
      option.setName('membru').setDescription('Membrul').setRequired(true),
    )
    .addStringOption((option) =>
      option.setName('motiv').setDescription('Motivul').setRequired(true).setMaxLength(500),
    ),

  async execute(interaction) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ModerateMembers)) {
      return interaction.reply({
        content: 'Nu ai permisiunea să avertizezi membri.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const user = interaction.options.getUser('membru', true);
    const reason = interaction.options.getString('motiv', true);

    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (member) {
      const error = await hierarchyError(interaction, member);
      if (error) {
        return interaction.reply({ content: error, flags: MessageFlags.Ephemeral });
      }
    }

    const warning = addWarning(interaction.guild.id, user.id, interaction.user.id, reason);
    const total = getWarnings(interaction.guild.id, user.id).length;

    const embed = new EmbedBuilder()
      .setColor(0xfaa61a)
      .setTitle('Avertisment')
      .setDescription(`**${user.tag}** a primit un avertisment.`)
      .addFields(
        { name: 'Motiv', value: reason },
        { name: 'Total avertismente', value: `${total}`, inline: true },
        { name: 'ID avertisment', value: warning.id, inline: true },
      )
      .setFooter({ text: `Moderator: ${interaction.user.tag}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });

    await user
      .send({
        embeds: [
          new EmbedBuilder()
            .setColor(0xfaa61a)
            .setTitle(`Ai primit un avertisment pe ${interaction.guild.name}`)
            .addFields({ name: 'Motiv', value: reason })
            .setTimestamp(),
        ],
      })
      .catch(() => {});

    await sendModLog(interaction.guild, {
      title: 'Warn',
      description: `${user.tag} (${user.id})`,
      fields: [
        { name: 'Motiv', value: reason },
        { name: 'Total', value: `${total}`, inline: true },
        { name: 'Moderator', value: `${interaction.user.tag} (${interaction.user.id})` },
      ],
    });
  },
};
