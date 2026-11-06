const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../config');
const { formatAmount } = require('../utils/economy');
const { getInventory } = require('../utils/shop');

const MAX_LINES = 20;

module.exports = {
  category: 'Economie',
  data: new SlashCommandBuilder()
    .setName('inventory')
    .setDescription('Vezi achizițiile unui membru')
    .addUserOption((option) =>
      option.setName('membru').setDescription('Membrul (implicit: tu)'),
    ),

  async execute(interaction) {
    const user = interaction.options.getUser('membru') ?? interaction.user;
    const purchases = getInventory(interaction.guild.id, user.id);
    const sorted = [...purchases].sort((a, b) => b.purchasedAt - a.purchasedAt);

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(`Inventarul lui ${user.tag}`)
      .setThumbnail(user.displayAvatarURL({ size: 256 }))
      .setFooter({
        text: `${purchases.length} achiziții • Moneda: ${config.economy.currency}`,
      })
      .setTimestamp();

    if (!sorted.length) {
      embed.setDescription('Nu există achiziții înregistrate.');
      return interaction.reply({ embeds: [embed] });
    }

    const lines = sorted.slice(0, MAX_LINES).map((purchase) => {
      const date = `<t:${Math.floor(purchase.purchasedAt / 1000)}:d>`;
      const role = purchase.roleId ? ` • <@&${purchase.roleId}>` : '';
      return `• **${purchase.name}** — ${formatAmount(purchase.price)} ${config.economy.currency} • ${date}${role}`;
    });

    if (sorted.length > MAX_LINES) {
      lines.push(`...și încă ${sorted.length - MAX_LINES} achiziții.`);
    }

    const total = purchases.reduce((sum, purchase) => sum + purchase.price, 0);

    embed
      .setDescription(lines.join('\n'))
      .addFields({
        name: 'Total cheltuit',
        value: `${formatAmount(total)} ${config.economy.currency}`,
        inline: true,
      });

    await interaction.reply({ embeds: [embed], allowedMentions: { parse: [] } });
  },
};
