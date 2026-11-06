const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  MessageFlags,
} = require('discord.js');
const { sendModLog } = require('../utils/log');

module.exports = {
  category: 'Moderare',
  data: new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Scoate un utilizator din ban')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addStringOption((option) =>
      option
        .setName('utilizator')
        .setDescription('ID-ul utilizatorului banat')
        .setRequired(true)
        .setMinLength(17)
        .setMaxLength(20),
    )
    .addStringOption((option) =>
      option.setName('motiv').setDescription('Motivul').setMaxLength(500),
    ),

  async execute(interaction) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.BanMembers)) {
      return interaction.reply({
        content: 'Nu ai permisiunea să scoți utilizatori din ban.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const userId = interaction.options.getString('utilizator', true).trim();
    if (!/^\d{17,20}$/.test(userId)) {
      return interaction.reply({
        content: 'ID-ul utilizatorului nu este valid.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const reason = interaction.options.getString('motiv') ?? 'Fără motiv';
    const ban = await interaction.guild.bans.fetch(userId).catch(() => null);
    if (!ban) {
      return interaction.reply({
        content: 'Utilizatorul nu este banat pe acest server.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const removed = await interaction.guild.bans
      .remove(userId, reason)
      .then(() => true)
      .catch((error) => {
        console.error('Nu am putut scoate utilizatorul din ban:', error);
        return false;
      });

    if (!removed) {
      return interaction.reply({
        content:
          'Nu am putut scoate utilizatorul din ban. Verifică permisiunea Ban Members a botului.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const embed = new EmbedBuilder()
      .setColor(0x57f287)
      .setTitle('Utilizator debanat')
      .setDescription(`**${ban.user.tag}** (${ban.user.id}) a fost scos din ban.`)
      .addFields({ name: 'Motiv', value: reason })
      .setFooter({ text: `Moderator: ${interaction.user.tag}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });

    await sendModLog(interaction.guild, {
      title: 'Unban',
      description: `${ban.user.tag} (${ban.user.id})`,
      color: 0x57f287,
      fields: [
        { name: 'Motiv', value: reason },
        { name: 'Moderator', value: `${interaction.user.tag} (${interaction.user.id})` },
      ],
    });
  },
};
