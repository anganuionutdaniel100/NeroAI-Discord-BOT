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
    .setName('ban')
    .setDescription('Banează un utilizator')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption((option) =>
      option.setName('membru').setDescription('Utilizatorul de banat').setRequired(true),
    )
    .addStringOption((option) =>
      option.setName('motiv').setDescription('Motivul').setMaxLength(500),
    )
    .addIntegerOption((option) =>
      option
        .setName('zile_mesaje')
        .setDescription('Șterge mesajele din ultimele N zile (0-7)')
        .setMinValue(0)
        .setMaxValue(7),
    ),

  async execute(interaction) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.BanMembers)) {
      return interaction.reply({
        content: 'Nu ai permisiunea să banezi utilizatori.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const user = interaction.options.getUser('membru', true);
    const reason = interaction.options.getString('motiv') ?? 'Fără motiv';
    const days = interaction.options.getInteger('zile_mesaje') ?? 0;

    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (member) {
      const error = await hierarchyError(interaction, member);
      if (error) {
        return interaction.reply({ content: error, flags: MessageFlags.Ephemeral });
      }

      if (!member.bannable) {
        return interaction.reply({
          content: 'Nu pot bana acest membru (permisiuni insuficiente).',
          flags: MessageFlags.Ephemeral,
        });
      }
    }

    await interaction.guild.bans.create(user.id, {
      reason,
      deleteMessageSeconds: days * 86400,
    });

    const embed = new EmbedBuilder()
      .setColor(0xed4245)
      .setTitle('Utilizator banat')
      .setDescription(`**${user.tag}** (${user.id}) a fost banat.`)
      .addFields({ name: 'Motiv', value: reason })
      .setFooter({ text: `Moderator: ${interaction.user.tag}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });

    await sendModLog(interaction.guild, {
      title: 'Ban',
      description: `${user.tag} (${user.id})`,
      fields: [
        { name: 'Motiv', value: reason },
        { name: 'Mesaje șterse', value: `${days} zile`, inline: true },
        { name: 'Moderator', value: `${interaction.user.tag} (${interaction.user.id})` },
      ],
    });
  },
};
