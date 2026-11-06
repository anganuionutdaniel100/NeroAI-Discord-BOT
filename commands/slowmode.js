const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  MessageFlags,
} = require('discord.js');
const { sendModLog } = require('../utils/log');

function formatSeconds(seconds) {
  return `${seconds} ${seconds === 1 ? 'secundă' : 'secunde'}`;
}

module.exports = {
  category: 'Moderare',
  data: new SlashCommandBuilder()
    .setName('slowmode')
    .setDescription('Setează slowmode în canalul curent sau într-un canal ales')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addIntegerOption((option) =>
      option
        .setName('secunde')
        .setDescription('Secunde între mesaje (0 dezactivează, maximum 21600)')
        .setRequired(true)
        .setMinValue(0)
        .setMaxValue(21600),
    )
    .addChannelOption((option) =>
      option.setName('canal').setDescription('Canalul (implicit: canalul curent)'),
    ),

  async execute(interaction) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels)) {
      return interaction.reply({
        content: 'Nu ai permisiunea să modifici slowmode-ul.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const seconds = interaction.options.getInteger('secunde', true);
    const channel = interaction.options.getChannel('canal') ?? interaction.channel;

    if (!channel || typeof channel.setRateLimitPerUser !== 'function') {
      return interaction.reply({
        content: 'Slowmode poate fi setat doar într-un canal text sau un thread.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const me = interaction.guild.members.me;
    const permissions = channel.permissionsFor?.(me);
    const needed = channel.isThread?.()
      ? PermissionFlagsBits.ManageThreads
      : PermissionFlagsBits.ManageChannels;

    if (permissions && !permissions.has(needed)) {
      return interaction.reply({
        content: 'Nu am permisiunea necesară pentru a modifica slowmode-ul acolo.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const reason = `Slowmode setat de ${interaction.user.tag}`;
    try {
      await channel.setRateLimitPerUser(seconds, reason);
    } catch (error) {
      console.error('Nu am putut seta slowmode-ul:', error);
      return interaction.reply({
        content: 'Nu am putut seta slowmode-ul. Verifică permisiunile botului.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const embed = new EmbedBuilder()
      .setColor(seconds === 0 ? 0x57f287 : 0xfaa61a)
      .setTitle(seconds === 0 ? 'Slowmode dezactivat' : 'Slowmode setat')
      .setDescription(
        seconds === 0
          ? `Slowmode a fost dezactivat în <#${channel.id}>.`
          : `Membrii pot trimite un mesaj la fiecare **${formatSeconds(seconds)}** în <#${channel.id}>.`,
      )
      .setFooter({ text: `Moderator: ${interaction.user.tag}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });

    await sendModLog(interaction.guild, {
      title: seconds === 0 ? 'Slowmode dezactivat' : 'Slowmode',
      description: `<#${channel.id}>`,
      color: seconds === 0 ? 0x57f287 : 0xfaa61a,
      fields: [
        { name: 'Durată', value: seconds === 0 ? 'Dezactivat' : formatSeconds(seconds), inline: true },
        { name: 'Moderator', value: `${interaction.user.tag} (${interaction.user.id})` },
      ],
    });
  },
};
