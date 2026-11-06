const {
  SlashCommandBuilder,
  MessageFlags,
  PermissionFlagsBits,
} = require('discord.js');
const {
  adminStatus,
  adminScan,
  adminStats,
} = require('../handlers/aiSecurity');

module.exports = {
  category: 'Securitate',
  data: new SlashCommandBuilder()
    .setName('security')
    .setDescription('Verifică starea și riscul membrilor cu AI Security')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((subcommand) =>
      subcommand.setName('status').setDescription('Afișează setările și starea securității'),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('scan')
        .setDescription('Evaluează riscul unui membru fără a aplica acțiuni')
        .addUserOption((option) =>
          option
            .setName('membru')
            .setDescription('Membrul de evaluat')
            .setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand.setName('statistici').setDescription('Afișează statisticile securității'),
    ),

  async execute(interaction) {
    switch (interaction.options.getSubcommand()) {
      case 'status':
        return adminStatus(interaction);
      case 'scan':
        return adminScan(interaction);
      case 'statistici':
        return adminStats(interaction);
      default:
        return interaction.reply({
          content: 'Subcomanda nu este disponibilă.',
          flags: MessageFlags.Ephemeral,
        });
    }
  },
};
