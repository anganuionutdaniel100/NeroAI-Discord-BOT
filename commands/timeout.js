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
    .setName('timeout')
    .setDescription('Pune un membru în timeout')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((option) =>
      option.setName('membru').setDescription('Membrul').setRequired(true),
    )
    .addIntegerOption((option) =>
      option
        .setName('minute')
        .setDescription('Durata în minute (1-40320)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(40320),
    )
    .addStringOption((option) =>
      option.setName('motiv').setDescription('Motivul').setMaxLength(500),
    ),

  async execute(interaction) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ModerateMembers)) {
      return interaction.reply({
        content: 'Nu ai permisiunea să aplici timeout.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const user = interaction.options.getUser('membru', true);
    const minutes = interaction.options.getInteger('minute', true);
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

    if (!member.moderatable) {
      return interaction.reply({
        content: 'Nu pot aplica timeout acestui membru (permisiuni insuficiente).',
        flags: MessageFlags.Ephemeral,
      });
    }

    await member.timeout(minutes * 60_000, reason);

    const embed = new EmbedBuilder()
      .setColor(0xfaa61a)
      .setTitle('Timeout aplicat')
      .setDescription(`**${user.tag}** (${user.id}) este în timeout pentru **${minutes} minute**.`)
      .addFields({ name: 'Motiv', value: reason })
      .setFooter({ text: `Moderator: ${interaction.user.tag}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });

    await sendModLog(interaction.guild, {
      title: 'Timeout',
      description: `${user.tag} (${user.id})`,
      fields: [
        { name: 'Durată', value: `${minutes} minute`, inline: true },
        { name: 'Motiv', value: reason },
        { name: 'Moderator', value: `${interaction.user.tag} (${interaction.user.id})` },
      ],
    });
  },
};
