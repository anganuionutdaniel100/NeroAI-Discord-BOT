const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
  MessageFlags,
} = require('discord.js');
const config = require('../config');

module.exports = {
  category: 'Verificare',
  data: new SlashCommandBuilder()
    .setName('verify-panel')
    .setDescription('Trimite panoul de verificare în acest canal')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({
        content: 'Ai nevoie de permisiunea Manage Server pentru asta.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const role = config.verify.roleId
      ? interaction.guild.roles.cache.get(config.verify.roleId)
      : null;

    if (!role) {
      return interaction.reply({
        content: 'Setează `VERIFIED_ROLE_ID` în `.env` cu ID-ul unui rol existent, apoi repornește botul.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const embed = new EmbedBuilder()
      .setColor(0x57f287)
      .setTitle('Verificare')
      .setDescription(
        config.verify.captcha
          ? 'Apasă butonul de mai jos și răspunde corect la întrebarea simplă pentru a primi acces.'
          : 'Apasă butonul de mai jos pentru a primi rolul de membru verificat.',
      )
      .setFooter({ text: `Rol: ${role.name}` });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('verify:start')
        .setLabel('Verifică-te')
        .setStyle(ButtonStyle.Success),
    );

    await interaction.channel.send({ embeds: [embed], components: [row] });

    await interaction.reply({
      content: 'Panoul de verificare a fost trimis.',
      flags: MessageFlags.Ephemeral,
    });
  },
};
