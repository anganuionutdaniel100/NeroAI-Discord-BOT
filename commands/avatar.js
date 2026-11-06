const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  category: 'Utilitare',
  data: new SlashCommandBuilder()
    .setName('avatar')
    .setDescription('Arată avatarul unui utilizator')
    .addUserOption((option) =>
      option.setName('membru').setDescription('Utilizatorul (implicit: tu)'),
    ),

  async execute(interaction) {
    const user = interaction.options.getUser('membru') ?? interaction.user;

    const embed = new EmbedBuilder()
      .setColor(0x8b5cf6)
      .setTitle(`Avatarul lui ${user.username}`)
      .setImage(user.displayAvatarURL({ size: 1024 }))
      .setDescription(
        `[PNG](${user.displayAvatarURL({ size: 1024, extension: 'png' })}) • ` +
          `[JPG](${user.displayAvatarURL({ size: 1024, extension: 'jpg' })}) • ` +
          `[WEBP](${user.displayAvatarURL({ size: 1024, extension: 'webp' })})`,
      );

    await interaction.reply({ embeds: [embed] });
  },
};
