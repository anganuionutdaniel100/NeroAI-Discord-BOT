const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  category: 'Utilitare',
  data: new SlashCommandBuilder().setName('ping').setDescription('Verifică latența botului'),

  async execute(interaction) {
    const sent = await interaction.reply({ content: 'Măsor latența...', fetchReply: true });
    const roundtrip = sent.createdTimestamp - interaction.createdTimestamp;
    const websocket = Math.round(interaction.client.ws.ping);

    await interaction.editReply(
      `Pong! Roundtrip: **${roundtrip}ms** • WebSocket: **${websocket}ms**`,
    );
  },
};
