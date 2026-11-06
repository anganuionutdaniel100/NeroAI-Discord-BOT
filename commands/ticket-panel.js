const {
  ActionRowBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  MessageFlags,
} = require('discord.js');
const { TICKET_TYPES } = require('../utils/ticketTypes');

module.exports = {
  category: 'Tickete',
  data: new SlashCommandBuilder()
    .setName('ticket-panel')
    .setDescription('Trimite panoul de tickete în acest canal')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({
        content: 'Ai nevoie de permisiunea Manage Server pentru asta.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const embed = new EmbedBuilder()
      .setColor(0x8b5cf6)
      .setTitle('Suport NeroAI Studios')
      .setDescription(
        'Ai nevoie de ajutor? Alege tipul tichetului din meniul de mai jos și îți deschidem un canal privat cu echipa.',
      )
      .setFooter({ text: 'Un singur tichet deschis per utilizator.' });

    const menu = new StringSelectMenuBuilder()
      .setCustomId('ticket:open')
      .setPlaceholder('Alege tipul tichetului')
      .addOptions(
        Object.entries(TICKET_TYPES).map(([value, info]) => ({
          label: info.label,
          description: info.description,
          value,
        })),
      );

    const row = new ActionRowBuilder().addComponents(menu);

    await interaction.channel.send({ embeds: [embed], components: [row] });

    await interaction.reply({
      content: 'Panoul de tickete a fost trimis.',
      flags: MessageFlags.Ephemeral,
    });
  },
};
