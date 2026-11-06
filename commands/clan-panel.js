const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { buildClanListEmbed, panelRow } = require('../handlers/clans');

module.exports = {
  category: 'Clanuri',
  data: new SlashCommandBuilder()
    .setName('clan-panel')
    .setDescription('Publică panoul cu clanurile serverului')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const channel = interaction.channel;
    if (!channel?.isTextBased()) {
      return interaction.reply({
        content: 'Rulează comanda într-un canal text.',
        flags: MessageFlags.Ephemeral,
      });
    }

    await channel.send({
      embeds: [buildClanListEmbed(interaction.guild)],
      components: [panelRow()],
      allowedMentions: { parse: [] },
    });

    return interaction.reply({
      content: 'Panoul clanurilor a fost publicat.',
      flags: MessageFlags.Ephemeral,
    });
  },
};
