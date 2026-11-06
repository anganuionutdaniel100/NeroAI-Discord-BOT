const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  MessageFlags,
} = require('discord.js');
const { sendModLog } = require('../utils/log');

module.exports = {
  category: 'Moderare',
  data: new SlashCommandBuilder()
    .setName('unlock')
    .setDescription('Deblochează trimiterea mesajelor într-un canal')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addChannelOption((option) =>
      option.setName('canal').setDescription('Canalul (implicit: canalul curent)'),
    )
    .addStringOption((option) =>
      option.setName('motiv').setDescription('Motivul').setMaxLength(500),
    ),

  async execute(interaction) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels)) {
      return interaction.reply({
        content: 'Nu ai permisiunea să deblochezi canale.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const channel = interaction.options.getChannel('canal') ?? interaction.channel;
    if (!channel || (!channel.isThread?.() && !channel.isTextBased?.())) {
      return interaction.reply({
        content: 'Canalul ales nu permite trimiterea de mesaje.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const reason = interaction.options.getString('motiv') ?? 'Fără motiv';
    const me = interaction.guild.members.me;

    try {
      if (channel.isThread?.()) {
        if (channel.permissionsFor?.(me)?.has(PermissionFlagsBits.ManageThreads) === false) {
          return interaction.reply({
            content: 'Nu am permisiunea Manage Threads pentru acest thread.',
            flags: MessageFlags.Ephemeral,
          });
        }
        await channel.setLocked(false, reason);
      } else {
        if (channel.permissionsFor?.(me)?.has(PermissionFlagsBits.ManageChannels) === false) {
          return interaction.reply({
            content: 'Nu am permisiunea Manage Channels pentru acest canal.',
            flags: MessageFlags.Ephemeral,
          });
        }
        await channel.permissionOverwrites.edit(
          interaction.guild.roles.everyone,
          { SendMessages: null },
          { reason },
        );
      }
    } catch (error) {
      console.error('Nu am putut debloca canalul:', error);
      return interaction.reply({
        content: 'Nu am putut debloca canalul. Verifică permisiunile botului.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const embed = new EmbedBuilder()
      .setColor(0x57f287)
      .setTitle('Canal deblocat')
      .setDescription(`<#${channel.id}> este din nou disponibil pentru membri.`)
      .addFields({ name: 'Motiv', value: reason })
      .setFooter({ text: `Moderator: ${interaction.user.tag}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });

    await sendModLog(interaction.guild, {
      title: 'Canal deblocat',
      description: `<#${channel.id}>`,
      color: 0x57f287,
      fields: [
        { name: 'Motiv', value: reason },
        { name: 'Moderator', value: `${interaction.user.tag} (${interaction.user.id})` },
      ],
    });
  },
};
