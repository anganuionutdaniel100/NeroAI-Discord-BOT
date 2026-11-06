const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  MessageFlags,
} = require('discord.js');
const { getWarnings } = require('../utils/warnings');

module.exports = {
  category: 'Moderare',
  data: new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('Vezi avertismentele unui membru')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((option) =>
      option.setName('membru').setDescription('Membrul').setRequired(true),
    ),

  async execute(interaction) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ModerateMembers)) {
      return interaction.reply({
        content: 'Nu ai permisiunea să vezi avertismentele.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const user = interaction.options.getUser('membru', true);
    const warnings = getWarnings(interaction.guild.id, user.id);

    const embed = new EmbedBuilder()
      .setColor(warnings.length ? 0xfaa61a : 0x57f287)
      .setTitle(`Avertismente: ${user.tag}`)
      .setTimestamp();

    if (!warnings.length) {
      embed.setDescription('Acest membru nu are avertismente.');
      return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    const lines = warnings
      .slice(-8)
      .map((warning) => {
        const reason = warning.reason.length > 200 ? `${warning.reason.slice(0, 200)}...` : warning.reason;
        return `\`${warning.id}\` • <t:${Math.floor(warning.createdAt / 1000)}:R> • <@${warning.moderatorId}>\n> ${reason}`;
      });

    embed.setDescription(lines.join('\n\n'));

    if (warnings.length > 8) {
      embed.setFooter({ text: `Se afișează ultimele 8 din ${warnings.length}.` });
    }

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};
