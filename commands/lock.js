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
    .setName('lock')
    .setDescription('Blochează trimiterea mesajelor într-un canal')
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
        content: 'Nu ai permisiunea să blochezi canale.',
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
        await channel.setLocked(true, reason);
      } else {
        if (channel.permissionsFor?.(me)?.has(PermissionFlagsBits.ManageChannels) === false) {
          return interaction.reply({
            content: 'Nu am permisiunea Manage Channels pentru acest canal.',
            flags: MessageFlags.Ephemeral,
          });
        }
        await channel.permissionOverwrites.edit(
          interaction.guild.roles.everyone,
          { SendMessages: false },
          { reason },
        );
      }
    } catch (error) {
      console.error('Nu am putut bloca canalul:', error);
      return interaction.reply({
        content: 'Nu am putut bloca canalul. Verifică permisiunile botului.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const embed = new EmbedBuilder()
      .setColor(0xed4245)
      .setTitle('Canal blocat')
      .setDescription(`<#${channel.id}> este acum blocat pentru membri.`)
      .addFields({ name: 'Motiv', value: reason })
      .setFooter({ text: `Moderator: ${interaction.user.tag}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });

    await sendModLog(interaction.guild, {
      title: 'Canal blocat',
      description: `<#${channel.id}>`,
      fields: [
        { name: 'Motiv', value: reason },
        { name: 'Moderator', value: `${interaction.user.tag} (${interaction.user.id})` },
      ],
    });
  },
};
