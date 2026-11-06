const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
} = require('discord.js');
const { sendModLog } = require('../utils/log');

module.exports = {
  category: 'Moderare',
  data: new SlashCommandBuilder()
    .setName('purge')
    .setDescription('Șterge mesaje din canal')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addIntegerOption((option) =>
      option
        .setName('cantitate')
        .setDescription('Câte mesaje să ștergi (1-100)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100),
    ),

  async execute(interaction) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageMessages)) {
      return interaction.reply({
        content: 'Nu ai permisiunea să ștergi mesaje.',
        flags: MessageFlags.Ephemeral,
      });
    }

    if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageMessages)) {
      return interaction.reply({
        content: 'Nu am permisiunea Manage Messages pe acest server.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const amount = interaction.options.getInteger('cantitate', true);
    const deleted = await interaction.channel.bulkDelete(amount, true);

    await interaction.reply({
      content: `Am șters ${deleted.size} mesaje.`,
      flags: MessageFlags.Ephemeral,
    });

    await sendModLog(interaction.guild, {
      title: 'Purge',
      description: `${deleted.size} mesaje șterse în <#${interaction.channel.id}>`,
      fields: [
        { name: 'Moderator', value: `${interaction.user.tag} (${interaction.user.id})` },
      ],
    });
  },
};
