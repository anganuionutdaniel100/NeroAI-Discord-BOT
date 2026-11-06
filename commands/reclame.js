const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  MessageFlags,
} = require('discord.js');
const config = require('../config');
const { getAd, getAds, getAdsStats } = require('../utils/ads');
const { buildAdEmbed } = require('../handlers/ads');

const STATUS_LABELS = {
  pending: 'În așteptare',
  active: 'Activă',
  rejected: 'Respinsă',
  expired: 'Expirată',
};

function canReviewMember(member) {
  if (member?.permissions?.has(PermissionFlagsBits.ManageGuild)) return true;
  if (member?.permissions?.has(PermissionFlagsBits.ManageChannels)) return true;

  const roleId = config.ads.reviewRoleId;
  return Boolean(roleId && member?.roles?.cache?.has(roleId));
}

function listEmbed(ads, { guildId, ownerLabel = null } = {}) {
  const stats = getAdsStats(guildId);
  const embed = new EmbedBuilder()
    .setColor(0x8b5cf6)
    .setTitle('Reclame')
    .setFooter({
      text: `Total: ${stats.total} • Active: ${stats.active} • În așteptare: ${stats.pending}`,
    })
    .setTimestamp();

  if (ownerLabel) embed.setDescription(`Reclamele pentru ${ownerLabel}.`);

  if (!ads.length) {
    embed.setDescription(
      `${ownerLabel ? `Reclamele pentru ${ownerLabel}` : 'Nu există reclame'} — folosește \`/reclama\` pentru a trimite una.`,
    );
    return embed;
  }

  for (const ad of ads.slice(0, 25)) {
    const details = [`${ad.title}`, `Autor: <@${ad.userId}>`];
    if (ad.status === 'active' && ad.expiresAt) {
      details.push(`Expiră <t:${Math.floor(ad.expiresAt / 1000)}:R>`);
    }
    if (ad.durationDays) details.push(`${ad.durationDays} zile`);

    embed.addFields({
      name: `#${ad.id} • ${STATUS_LABELS[ad.status] ?? ad.status}`,
      value: details.join(' • ').slice(0, 1024),
    });
  }

  if (ads.length > 25) {
    embed.addFields({
      name: 'Listă trunchiată',
      value: `Sunt afișate primele 25 din ${ads.length} reclame. Folosește un ID pentru detalii.`,
    });
  }

  return embed;
}

module.exports = {
  category: 'Reclame',
  data: new SlashCommandBuilder()
    .setName('reclame')
    .setDescription('Vezi reclamele tale sau, pentru echipă, toate reclamele serverului')
    .addStringOption((option) =>
      option
        .setName('id')
        .setDescription('ID-ul unei reclame pentru detalii')
        .setMaxLength(32)
        .setRequired(false),
    )
    .addUserOption((option) =>
      option
        .setName('utilizator')
        .setDescription('Vezi reclamele altui membru (doar echipa)')
        .setRequired(false),
    )
    .addStringOption((option) =>
      option
        .setName('status')
        .setDescription('Filtrează după status (doar echipa)')
        .addChoices(
          { name: 'În așteptare', value: 'pending' },
          { name: 'Active', value: 'active' },
          { name: 'Respinse', value: 'rejected' },
          { name: 'Expirate', value: 'expired' },
        )
        .setRequired(false),
    ),

  async execute(interaction) {
    const guildId = interaction.guild.id;
    const id = interaction.options.getString('id');
    const targetUser = interaction.options.getUser('utilizator');
    const status = interaction.options.getString('status');
    const isStaff = canReviewMember(interaction.member);

    if (id) {
      const ad = getAd(id);
      if (!ad || ad.guildId !== guildId) {
        return interaction.reply({
          content: 'Reclama nu a fost găsită.',
          flags: MessageFlags.Ephemeral,
        });
      }

      if (ad.userId !== interaction.user.id && !isStaff) {
        return interaction.reply({
          content: 'Nu poți vedea reclamele altui membru.',
          flags: MessageFlags.Ephemeral,
        });
      }

      return interaction.reply({
        embeds: [buildAdEmbed(ad)],
        flags: MessageFlags.Ephemeral,
      });
    }

    if (!isStaff) {
      if (targetUser && targetUser.id !== interaction.user.id) {
        return interaction.reply({
          content: 'Nu poți vedea reclamele altui membru.',
          flags: MessageFlags.Ephemeral,
        });
      }

      const ads = getAds(guildId)
        .filter((ad) => ad.userId === interaction.user.id)
        .filter((ad) => !status || ad.status === status);

      return interaction.reply({
        embeds: [listEmbed(ads, { guildId, ownerLabel: `${interaction.user}` })],
        flags: MessageFlags.Ephemeral,
      });
    }

    let ads = getAds(guildId);
    if (targetUser) ads = ads.filter((ad) => ad.userId === targetUser.id);
    if (status) ads = ads.filter((ad) => ad.status === status);

    return interaction.reply({
      embeds: [
        listEmbed(ads, {
          guildId,
          ownerLabel: targetUser ? `${targetUser}` : null,
        }),
      ],
      flags: MessageFlags.Ephemeral,
    });
  },
};
