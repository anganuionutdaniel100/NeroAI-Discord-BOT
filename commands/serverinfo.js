const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const VERIFICATION_LEVELS = ['Niciunul', 'Scăzut', 'Mediu', 'Ridicat', 'Foarte ridicat'];

module.exports = {
  category: 'Utilitare',
  data: new SlashCommandBuilder().setName('serverinfo').setDescription('Informații despre server'),

  async execute(interaction) {
    const { guild } = interaction;
    const owner = await guild.fetchOwner().catch(() => null);

    const embed = new EmbedBuilder()
      .setColor(0x8b5cf6)
      .setTitle(guild.name)
      .setThumbnail(guild.iconURL({ size: 256 }))
      .addFields(
        { name: 'ID', value: guild.id, inline: true },
        { name: 'Proprietar', value: owner ? owner.user.tag : 'Necunoscut', inline: true },
        { name: 'Membri', value: `${guild.memberCount}`, inline: true },
        { name: 'Canale', value: `${guild.channels.cache.size}`, inline: true },
        { name: 'Roluri', value: `${guild.roles.cache.size}`, inline: true },
        {
          name: 'Boost-uri',
          value: `${guild.premiumSubscriptionCount ?? 0} (nivel ${guild.premiumTier})`,
          inline: true,
        },
        {
          name: 'Nivel de verificare',
          value: VERIFICATION_LEVELS[guild.verificationLevel] ?? 'Necunoscut',
          inline: true,
        },
        {
          name: 'Creat la',
          value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>`,
          inline: false,
        },
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
