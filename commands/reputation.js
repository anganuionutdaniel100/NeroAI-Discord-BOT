const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../config');
const {
  getReputation,
  getRank,
  getCooldownRemaining,
  formatDuration,
} = require('../utils/reputation');

module.exports = {
  category: 'Reputație',
  data: new SlashCommandBuilder()
    .setName('reputation')
    .setDescription('Vezi reputația unui membru')
    .addUserOption((option) =>
      option.setName('membru').setDescription('Membrul (implicit: tu)'),
    ),

  async execute(interaction) {
    const user = interaction.options.getUser('membru') ?? interaction.user;
    const reputation = getReputation(interaction.guild.id, user.id);
    const rank = getRank(interaction.guild.id, user.id);

    const embed = new EmbedBuilder()
      .setColor(0x8b5cf6)
      .setTitle(`Reputația lui ${user.tag}`)
      .setThumbnail(user.displayAvatarURL({ size: 256 }))
      .addFields(
        { name: 'Reputație', value: `${reputation.points}`, inline: true },
        { name: 'Loc', value: rank ? `#${rank}` : 'Neclasat', inline: true },
        { name: 'Primit', value: `${reputation.received}`, inline: true },
        { name: 'Oferit', value: `${reputation.given}`, inline: true },
      )
      .setTimestamp();

    if (reputation.lastReceivedAt) {
      embed.addFields({
        name: 'Ultima reputație primită',
        value: `<t:${Math.floor(reputation.lastReceivedAt / 1000)}:R>`,
        inline: true,
      });
    } else {
      embed.setDescription(
        'Încă nu a primit reputație. Folosește `/rep` pentru a oferi primul punct.',
      );
    }

    const cooldownMs = config.reputation.cooldownHours * 60 * 60 * 1000;
    const remaining = getCooldownRemaining(interaction.guild.id, interaction.user.id, cooldownMs);
    const footer =
      cooldownMs <= 0
        ? 'Poți oferi reputație fără pauză.'
        : remaining > 0
          ? `Poți oferi următorul punct peste ${formatDuration(remaining)}.`
          : 'Poți oferi un punct de reputație acum.';

    embed.setFooter({ text: footer });

    await interaction.reply({ embeds: [embed] });
  },
};
