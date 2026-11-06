const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  MessageFlags,
} = require('discord.js');
const { hierarchyError } = require('../utils/moderation');
const { sendModLog } = require('../utils/log');

module.exports = {
  category: 'Moderare',
  data: new SlashCommandBuilder()
    .setName('addrole')
    .setDescription('Adaugă un rol unui membru')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addUserOption((option) =>
      option.setName('membru').setDescription('Membrul').setRequired(true),
    )
    .addRoleOption((option) =>
      option.setName('rol').setDescription('Rolul de adăugat').setRequired(true),
    )
    .addStringOption((option) =>
      option.setName('motiv').setDescription('Motivul').setMaxLength(500),
    ),

  async execute(interaction) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageRoles)) {
      return interaction.reply({
        content: 'Nu ai permisiunea să gestionezi roluri.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const user = interaction.options.getUser('membru', true);
    const role = interaction.options.getRole('rol', true);
    const reason = interaction.options.getString('motiv') ?? 'Fără motiv';
    const me = interaction.guild.members.me;

    if (!me.permissions.has(PermissionFlagsBits.ManageRoles)) {
      return interaction.reply({
        content: 'Nu am permisiunea Manage Roles pe acest server.',
        flags: MessageFlags.Ephemeral,
      });
    }

    if (role.id === interaction.guild.id) {
      return interaction.reply({
        content: 'Rolul @everyone nu poate fi atribuit sau eliminat.',
        flags: MessageFlags.Ephemeral,
      });
    }

    if (role.managed) {
      return interaction.reply({
        content: 'Acest rol este gestionat de o integrare și nu poate fi atribuit manual.',
        flags: MessageFlags.Ephemeral,
      });
    }

    if (role.comparePositionTo(me.roles.highest) >= 0) {
      return interaction.reply({
        content: 'Rolul ales este egal sau mai sus decât rolul botului. Mută rolul botului mai sus.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (!member) {
      return interaction.reply({
        content: 'Utilizatorul nu este pe acest server.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const error = await hierarchyError(interaction, member);
    if (error) {
      return interaction.reply({ content: error, flags: MessageFlags.Ephemeral });
    }

    if (member.roles.cache.has(role.id)) {
      return interaction.reply({
        content: 'Membrul are deja acest rol.',
        flags: MessageFlags.Ephemeral,
      });
    }

    try {
      await member.roles.add(role, reason);
    } catch (roleError) {
      console.error('Nu am putut adăuga rolul:', roleError);
      return interaction.reply({
        content: 'Nu am putut adăuga rolul. Verifică permisiunile și poziția rolului botului.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const embed = new EmbedBuilder()
      .setColor(0x57f287)
      .setTitle('Rol adăugat')
      .setDescription(`Rolul **${role.name}** a fost adăugat lui **${user.tag}**.`)
      .addFields({ name: 'Motiv', value: reason })
      .setFooter({ text: `Moderator: ${interaction.user.tag}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });

    await sendModLog(interaction.guild, {
      title: 'Rol adăugat',
      description: `${user.tag} (${user.id})`,
      color: 0x57f287,
      fields: [
        { name: 'Rol', value: `${role.name} (${role.id})`, inline: true },
        { name: 'Motiv', value: reason },
        { name: 'Moderator', value: `${interaction.user.tag} (${interaction.user.id})` },
      ],
    });
  },
};
