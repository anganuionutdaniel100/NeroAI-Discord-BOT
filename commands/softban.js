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
    .setName('softban')
    .setDescription('Banează și debanează imediat un membru, ștergându-i mesajele')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption((option) =>
      option.setName('membru').setDescription('Membrul').setRequired(true),
    )
    .addStringOption((option) =>
      option.setName('motiv').setDescription('Motivul').setMaxLength(500),
    )
    .addIntegerOption((option) =>
      option
        .setName('zile_mesaje')
        .setDescription('Șterge mesajele din ultimele N zile (0-7, implicit 1)')
        .setMinValue(0)
        .setMaxValue(7),
    ),

  async execute(interaction) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.BanMembers)) {
      return interaction.reply({
        content: 'Nu ai permisiunea să aplici softban.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const user = interaction.options.getUser('membru', true);
    const reason = interaction.options.getString('motiv') ?? 'Fără motiv';
    const days = interaction.options.getInteger('zile_mesaje') ?? 1;

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

    if (!member.bannable) {
      return interaction.reply({
        content: 'Nu pot aplica softban acestui membru (permisiuni insuficiente).',
        flags: MessageFlags.Ephemeral,
      });
    }

    const banned = await interaction.guild.bans
      .create(user.id, { reason, deleteMessageSeconds: days * 86400 })
      .then(() => true)
      .catch((banError) => {
        console.error('Softban: banarea a eșuat:', banError);
        return false;
      });

    if (!banned) {
      return interaction.reply({
        content: 'Nu am putut aplica softban-ul. Verifică permisiunea Ban Members a botului.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const unbanned = await interaction.guild.bans
      .remove(user.id, reason)
      .then(() => true)
      .catch((unbanError) => {
        console.error('Softban: debanarea a eșuat:', unbanError);
        return false;
      });

    if (!unbanned) {
      return interaction.reply({
        content:
          'Membrul a fost banat, dar nu am putut ridica banul. Folosește `/unban` cu ID-ul lui.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const embed = new EmbedBuilder()
      .setColor(0xed4245)
      .setTitle('Softban aplicat')
      .setDescription(
        `**${user.tag}** (${user.id}) a fost banat și debanat imediat. Mesajele din ultimele **${days} zile** au fost șterse.`,
      )
      .addFields({ name: 'Motiv', value: reason })
      .setFooter({ text: `Moderator: ${interaction.user.tag}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });

    await sendModLog(interaction.guild, {
      title: 'Softban',
      description: `${user.tag} (${user.id})`,
      fields: [
        { name: 'Motiv', value: reason },
        { name: 'Mesaje șterse', value: `${days} zile`, inline: true },
        { name: 'Moderator', value: `${interaction.user.tag} (${interaction.user.id})` },
      ],
    });
  },
};
