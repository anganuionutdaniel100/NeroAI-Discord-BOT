const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getEntry, getRank } = require('../utils/levels');

function progressBar(value, max, size = 12) {
  const filled = Math.min(size, Math.round((value / max) * size));
  return '█'.repeat(filled) + '░'.repeat(size - filled);
}

module.exports = {
  category: 'Niveluri',
  data: new SlashCommandBuilder()
    .setName('level')
    .setDescription('Vezi nivelul și XP-ul unui membru')
    .addUserOption((option) =>
      option.setName('membru').setDescription('Membrul (implicit: tu)'),
    ),

  async execute(interaction) {
    const user = interaction.options.getUser('membru') ?? interaction.user;
    const entry = getEntry(interaction.guild.id, user.id);
    const rank = getRank(interaction.guild.id, user.id);

    const embed = new EmbedBuilder()
      .setColor(0x8b5cf6)
      .setTitle(`Nivelul lui ${user.tag}`)
      .setThumbnail(user.displayAvatarURL({ size: 256 }))
      .addFields(
        { name: 'Nivel', value: `${entry.level}`, inline: true },
        { name: 'Loc', value: rank ? `#${rank}` : 'Neclasat', inline: true },
        { name: 'Mesaje', value: `${entry.messages}`, inline: true },
        {
          name: 'Progres',
          value: `${progressBar(entry.xpIntoLevel, entry.xpForNext)} ${entry.xpIntoLevel}/${entry.xpForNext} XP`,
        },
        { name: 'XP total', value: `${entry.totalXp}`, inline: true },
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
