const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../config');
const { getAccount, getRank, formatAmount } = require('../utils/economy');

module.exports = {
  category: 'Economie',
  data: new SlashCommandBuilder()
    .setName('balance')
    .setDescription('Vezi balanța unui membru')
    .addUserOption((option) =>
      option.setName('membru').setDescription('Membrul (implicit: tu)'),
    ),

  async execute(interaction) {
    const user = interaction.options.getUser('membru') ?? interaction.user;
    const account = getAccount(interaction.guild.id, user.id);
    const rank = getRank(interaction.guild.id, user.id);

    const embed = new EmbedBuilder()
      .setColor(0xfee75c)
      .setTitle(`Balanța lui ${user.tag}`)
      .setThumbnail(user.displayAvatarURL({ size: 256 }))
      .addFields(
        {
          name: 'Portofel',
          value: `${formatAmount(account.balance)} ${config.economy.currency}`,
          inline: true,
        },
        { name: 'Loc', value: rank ? `#${rank}` : 'Neclasat', inline: true },
      )
      .setFooter({ text: 'Câștigă monede cu /daily și /work.' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
