const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { getLeaderboard } = require('../utils/invites');

module.exports = {
  category: 'Invitații',
  data: new SlashCommandBuilder()
    .setName('invite-leaderboard')
    .setDescription('Clasamentul membrilor după invitații'),

  async execute(interaction) {
    const entries = getLeaderboard(interaction.guild.id, 10);

    if (!entries.length) {
      return interaction.reply({
        content: 'Nu există încă invitații înregistrate pe acest server.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const description = entries
      .map(
        (entry, index) =>
          `${index + 1}. <@${entry.userId}> — **${entry.valid}** valide (${entry.total} total)`,
      )
      .join('\n');

    const embed = new EmbedBuilder()
      .setColor(0x8b5cf6)
      .setTitle('Clasament invitații')
      .setDescription(description)
      .setFooter({ text: 'Valide = membrii invitați care sunt încă pe server' })
      .setTimestamp();

    await interaction.reply({
      embeds: [embed],
      allowedMentions: { parse: [] },
    });
  },
};
