const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { buildShopPanel } = require('../handlers/shop');

module.exports = {
  category: 'Economie',
  data: new SlashCommandBuilder()
    .setName('shop')
    .setDescription('Deschide magazinul serverului'),

  async execute(interaction) {
    const panel = buildShopPanel(interaction.guild);
    if (!panel) {
      return interaction.reply({
        content: 'Magazinul este gol momentan.',
        flags: MessageFlags.Ephemeral,
      });
    }

    await interaction.reply({
      embeds: [panel.embed],
      components: [panel.row],
      allowedMentions: { parse: [] },
    });
  },
};
