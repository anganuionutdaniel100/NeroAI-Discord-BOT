const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { getSettings, getChannelByOwner } = require('../utils/voice');
const { buildPanelComponents } = require('../handlers/voice');

module.exports = {
  category: 'Voice Manager',
  data: new SlashCommandBuilder()
    .setName('voice')
    .setDescription('Vezi și administrează canalul tău vocal temporar'),

  async execute(interaction) {
    const guild = interaction.guild;
    const settings = getSettings(guild.id);

    if (!settings.hubChannelId) {
      return interaction.reply({
        content:
          'Voice Manager nu este configurat. Un administrator poate seta canalul hub cu `/voice-admin setari hub:#canal`.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const entry = getChannelByOwner(guild.id, interaction.user.id);
    if (!entry) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x8b5cf6)
            .setTitle('Canal vocal temporar')
            .setDescription(
              `Nu ai un canal vocal temporar. Intră în <#${settings.hubChannelId}> pentru a primi unul automat.`,
            )
            .setFooter({ text: 'Canalul dispare automat când rămâne gol.' }),
        ],
        flags: MessageFlags.Ephemeral,
      });
    }

    const channel =
      guild.channels.cache.get(entry.id) ??
      (await guild.channels.fetch(entry.id).catch(() => null));

    if (!channel) {
      return interaction.reply({
        content: 'Canalul tău vocal temporar nu mai există. Intră din nou în canalul hub.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const embed = new EmbedBuilder()
      .setColor(entry.locked ? 0xed4245 : 0x8b5cf6)
      .setTitle(`Canal vocal — ${channel.name}`)
      .setDescription('Folosește butoanele pentru a administra canalul sau panoul din canal.')
      .addFields(
        {
          name: 'Conectați',
          value: `${channel.members.size} membri`,
          inline: true,
        },
        {
          name: 'Limită',
          value: entry.limit ? `${entry.limit} membri` : 'Nelimitată',
          inline: true,
        },
        {
          name: 'Acces',
          value: entry.locked ? 'Blocat' : 'Deschis',
          inline: true,
        },
      )
      .setFooter({ text: `Canal temporar • ${entry.id}` })
      .setTimestamp(entry.createdAt);

    return interaction.reply({
      embeds: [embed],
      components: buildPanelComponents(entry),
      flags: MessageFlags.Ephemeral,
    });
  },
};
