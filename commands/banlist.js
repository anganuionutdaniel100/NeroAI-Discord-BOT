const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  MessageFlags,
} = require('discord.js');

module.exports = {
  category: 'Moderare',
  data: new SlashCommandBuilder()
    .setName('banlist')
    .setDescription('Vezi utilizatorii banați pe server')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addIntegerOption((option) =>
      option
        .setName('limita')
        .setDescription('Câți utilizatori să afișezi (1-20, implicit 10)')
        .setMinValue(1)
        .setMaxValue(20),
    ),

  async execute(interaction) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.BanMembers)) {
      return interaction.reply({
        content: 'Nu ai permisiunea să vezi lista de banuri.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const limit = interaction.options.getInteger('limita') ?? 10;
    const bans = await interaction.guild.bans.fetch({ limit }).catch((error) => {
      console.error('Nu am putut prelua lista de banuri:', error);
      return null;
    });

    if (!bans) {
      return interaction.reply({
        content: 'Nu am putut prelua lista de banuri. Verifică permisiunea Ban Members a botului.',
        flags: MessageFlags.Ephemeral,
      });
    }

    if (!bans.size) {
      return interaction.reply({
        content: 'Nu există utilizatori banați pe acest server.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const lines = [...bans.values()].map((ban) => {
      const reason = (ban.reason ?? 'Fără motiv').replace(/\s+/g, ' ').trim().slice(0, 120);
      return `**${ban.user.tag}** (${ban.user.id})\n> ${reason}`;
    });

    const embed = new EmbedBuilder()
      .setColor(0xed4245)
      .setTitle('Utilizatori banați')
      .setDescription(lines.join('\n\n'))
      .setTimestamp();

    if (bans.size === limit) {
      embed.setFooter({ text: `Se afișează primii ${limit} utilizatori.` });
    }

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};
