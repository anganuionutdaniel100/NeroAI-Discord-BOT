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
    .setName('nick')
    .setDescription('Schimbă sau resetează porecla unui membru')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageNicknames)
    .addUserOption((option) =>
      option.setName('membru').setDescription('Membrul').setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName('nume')
        .setDescription('Porecla nouă (lasă gol pentru resetare)')
        .setMaxLength(32),
    )
    .addStringOption((option) =>
      option.setName('motiv').setDescription('Motivul').setMaxLength(500),
    ),

  async execute(interaction) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageNicknames)) {
      return interaction.reply({
        content: 'Nu ai permisiunea să schimbi porecle.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const user = interaction.options.getUser('membru', true);
    const nickname = interaction.options.getString('nume')?.trim() || null;
    const reason = interaction.options.getString('motiv') ?? 'Fără motiv';

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

    if (!member.manageable) {
      return interaction.reply({
        content: 'Nu pot modifica porecla acestui membru (permisiuni insuficiente).',
        flags: MessageFlags.Ephemeral,
      });
    }

    if ((member.nickname ?? null) === nickname) {
      return interaction.reply({
        content: nickname
          ? 'Membrul are deja această poreclă.'
          : 'Membrul nu are o poreclă setată.',
        flags: MessageFlags.Ephemeral,
      });
    }

    try {
      await member.setNickname(nickname, reason);
    } catch (nickError) {
      console.error('Nu am putut schimba porecla:', nickError);
      return interaction.reply({
        content: 'Nu am putut schimba porecla. Verifică permisiunile botului.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('Poreclă actualizată')
      .setDescription(
        nickname
          ? `Porecla lui **${user.tag}** este acum **${nickname}**.`
          : `Porecla lui **${user.tag}** a fost resetată.`,
      )
      .addFields({ name: 'Motiv', value: reason })
      .setFooter({ text: `Moderator: ${interaction.user.tag}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });

    await sendModLog(interaction.guild, {
      title: 'Nickname',
      description: `${user.tag} (${user.id})`,
      color: 0x5865f2,
      fields: [
        { name: 'Poreclă nouă', value: nickname ?? 'Resetată', inline: true },
        { name: 'Motiv', value: reason },
        { name: 'Moderator', value: `${interaction.user.tag} (${interaction.user.id})` },
      ],
    });
  },
};
