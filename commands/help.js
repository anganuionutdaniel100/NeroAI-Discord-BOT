const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');

module.exports = {
  category: 'Utilitare',
  data: new SlashCommandBuilder().setName('help').setDescription('Vezi comenzile disponibile'),

  async execute(interaction) {
    const categories = new Map();

    for (const command of interaction.client.commands.values()) {
      const category = command.category ?? 'Altele';
      if (!categories.has(category)) categories.set(category, []);
      categories.get(category).push(`\`/${command.data.name}\``);
    }

    const embed = new EmbedBuilder()
      .setColor(0x8b5cf6)
      .setTitle('Comenzile NeroAI Studios')
      .setDescription('Toate comenzile sunt slash commands.')
      .setTimestamp();

    for (const [category, commands] of [...categories].sort()) {
      embed.addFields({ name: category, value: commands.sort().join(', ') });
    }

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};
