const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  category: 'Utilitare',
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Informații despre un utilizator')
    .addUserOption((option) =>
      option.setName('membru').setDescription('Utilizatorul (implicit: tu)'),
    ),

  async execute(interaction) {
    const user = interaction.options.getUser('membru') ?? interaction.user;

    const member =
      interaction.options.getMember('membru') ??
      (await interaction.guild.members.fetch(user.id).catch(() => null));

    const roles = member
      ? member.roles.cache
          .filter((role) => role.id !== interaction.guild.id)
          .sort((a, b) => b.position - a.position)
          .map((role) => `<@&${role.id}>`)
          .slice(0, 15)
          .join(', ') || 'Niciunul'
      : 'Nu este pe server';

    const embed = new EmbedBuilder()
      .setColor(0x8b5cf6)
      .setTitle(user.tag)
      .setThumbnail(user.displayAvatarURL({ size: 256 }))
      .addFields(
        { name: 'ID', value: user.id, inline: true },
        {
          name: 'Cont creat',
          value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`,
          inline: true,
        },
      )
      .setTimestamp();

    if (member) {
      embed.addFields(
        {
          name: 'Pe server din',
          value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`,
          inline: true,
        },
        {
          name: 'Rol de top',
          value: member.roles.highest.id === interaction.guild.id ? 'Niciunul' : `${member.roles.highest}`,
          inline: true,
        },
        { name: 'Roluri', value: roles, inline: false },
      );
    }

    await interaction.reply({ embeds: [embed] });
  },
};
