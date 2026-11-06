const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { getBadge, getMemberBadges } = require('../utils/badges');
const { buildMemberBadgesEmbed } = require('../handlers/badges');

module.exports = {
  category: 'Badge-uri',
  data: new SlashCommandBuilder()
    .setName('badge')
    .setDescription('Vezi badge-urile tale sau ale unui membru')
    .addUserOption((option) =>
      option.setName('membru').setDescription('Membrul analizat (implicit: tu)'),
    ),

  async execute(interaction) {
    const target = interaction.options.getUser('membru') ?? interaction.user;
    const member = await interaction.guild.members.fetch(target.id).catch(() => null);

    if (!member) {
      return interaction.reply({
        content: 'Membrul selectat nu este pe acest server.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const entries = getMemberBadges(interaction.guild.id, target.id)
      .map((award) => ({ award, badge: getBadge(award.badgeId) }))
      .filter((entry) => entry.badge);

    await interaction.reply({
      embeds: [buildMemberBadgesEmbed(member, entries)],
      allowedMentions: { parse: [] },
    });
  },
};
