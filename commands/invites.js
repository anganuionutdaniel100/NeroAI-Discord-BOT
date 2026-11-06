const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { getMembership, getStats, getRank } = require('../utils/invites');

module.exports = {
  category: 'Invitații',
  data: new SlashCommandBuilder()
    .setName('invites')
    .setDescription('Vezi statisticile de invitații ale unui membru')
    .addUserOption((option) =>
      option.setName('membru').setDescription('Membrul (implicit tu)'),
    ),

  async execute(interaction) {
    const target = interaction.options.getUser('membru') ?? interaction.user;
    const stats = getStats(interaction.guild.id, target.id);
    const membership = getMembership(interaction.guild.id, target.id);
    const rank = getRank(interaction.guild.id, target.id);

    const embed = new EmbedBuilder()
      .setColor(0x8b5cf6)
      .setTitle(`Invitații — ${target.tag}`)
      .setThumbnail(target.displayAvatarURL({ size: 128 }))
      .addFields(
        { name: 'Valide', value: `${stats.valid}`, inline: true },
        { name: 'Total', value: `${stats.total}`, inline: true },
        { name: 'Plecați', value: `${stats.left}`, inline: true },
        { name: 'Loc în clasament', value: rank ? `#${rank}` : 'Neclasat', inline: true },
      )
      .setFooter({ text: target.id })
      .setTimestamp();

    if (membership) {
      embed.addFields(
        {
          name: 'A fost invitat de',
          value: membership.inviterId ? `<@${membership.inviterId}>` : 'Necunoscut',
          inline: true,
        },
        {
          name: 'Cod invitație',
          value: membership.code ? `\`${membership.code}\`` : 'Necunoscut',
          inline: true,
        },
        {
          name: 'Pe server din',
          value: membership.joinedAt
            ? `<t:${Math.floor(membership.joinedAt / 1000)}:D>`
            : 'Necunoscut',
          inline: true,
        },
      );
    } else {
      embed.addFields({
        name: 'Istoric',
        value: 'Nu există o intrare înregistrată pentru acest membru.',
      });
    }

    await interaction.reply({
      embeds: [embed],
      flags: MessageFlags.Ephemeral,
      allowedMentions: { parse: [] },
    });
  },
};
