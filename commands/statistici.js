const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const {
  getStatistics,
  getSummary,
  getTopCommands,
} = require('../utils/statistics');

const PERIODS = {
  azi: { days: 1, label: 'Azi' },
  '7zile': { days: 7, label: 'Ultimele 7 zile' },
  '30zile': { days: 30, label: 'Ultimele 30 zile' },
  total: { days: null, label: 'Total' },
};

function formatTracker(startedAt) {
  if (!startedAt) return 'Colectarea începe acum.';
  return `Date colectate din <t:${Math.floor(startedAt / 1000)}:d>.`;
}

module.exports = {
  category: 'Statistici',
  data: new SlashCommandBuilder()
    .setName('statistici')
    .setDescription('Vezi statisticile serverului')
    .addStringOption((option) =>
      option
        .setName('perioada')
        .setDescription('Perioada analizată')
        .addChoices(
          { name: 'Azi', value: 'azi' },
          { name: 'Ultimele 7 zile', value: '7zile' },
          { name: 'Ultimele 30 zile', value: '30zile' },
          { name: 'Total', value: 'total' },
        ),
    ),

  async execute(interaction) {
    const key = interaction.options.getString('perioada') ?? '7zile';
    const period = PERIODS[key] ?? PERIODS['7zile'];
    const { guild } = interaction;
    const summary = getSummary(guild.id, period.days);
    const counters = summary.counters;
    const tracked = getStatistics(guild.id);
    const top = getTopCommands(guild.id, { days: period.days, limit: 8 });

    const embed = new EmbedBuilder()
      .setColor(0x8b5cf6)
      .setTitle(`Statistici — ${guild.name}`)
      .setThumbnail(guild.iconURL({ size: 256 }))
      .addFields(
        {
          name: 'Server',
          value: [
            `Membri: **${guild.memberCount}**`,
            `Canale: **${guild.channels.cache.size}**`,
            `Roluri: **${guild.roles.cache.size}**`,
            `Boost-uri: **${guild.premiumSubscriptionCount ?? 0}**`,
          ].join('\n'),
          inline: true,
        },
        {
          name: 'Activitate',
          value: [
            `Mesaje: **${counters.messages}**`,
            `Comenzi: **${counters.commands}**`,
            `Intrări: **${counters.joins}**`,
            `Plecări: **${counters.leaves}**`,
          ].join('\n'),
          inline: true,
        },
        {
          name: 'Tickete',
          value: [
            `Deschise: **${counters.ticketsOpened}**`,
            `Închise: **${counters.ticketsClosed}**`,
            `Verificări: **${counters.verifications}**`,
          ].join('\n'),
          inline: true,
        },
        {
          name: 'Comunitate',
          value: [
            `Sugestii: **${counters.suggestions}**`,
            `Feedback: **${counters.feedback}**`,
            `Cereri: **${counters.applications}**`,
            `Cumpărături: **${counters.purchases}**`,
            `Giveaway-uri: **${counters.giveaways}**`,
            `Badge-uri: **${counters.badges}**`,
            `Sesiuni vocale: **${counters.voiceSessions}**`,
            `Reclame trimise: **${counters.ads}**`,
            `Reclame publicate: **${counters.adsPublished}**`,
            `Misiuni finalizate: **${counters.missionsCompleted}**`,
            `Recompense revendicate: **${counters.missionsClaimed}**`,
            `Clanuri create: **${counters.clansCreated}**`,
            `Membri intrați în clanuri: **${counters.clanJoins}**`,
            `Mesaje de bun venit: **${counters.welcomes}**`,
            `Mesaje la revedere: **${counters.goodbyes}**`,
            `Comenzi personalizate: **${counters.customCommands}**`,
          ].join('\n'),
          inline: true,
        },
        {
          name: 'AI și mini-game-uri',
          value: [
            `AI Moderator — mesaje analizate: **${counters.aiModeratorChecks}**`,
            `AI Moderator — semnalări: **${counters.aiModeratorFlags}**`,
            `AI Moderator — acțiuni: **${counters.aiModeratorActions}**`,
            `AI Security — verificări: **${counters.securityScans}**`,
            `AI Security — amenințări: **${counters.securityFlags}**`,
            `AI Security — acțiuni: **${counters.securityActions}**`,
            `AI Security — lockdown-uri: **${counters.securityLockdowns}**`,
            `AI Server Builder — planuri generate: **${counters.serverPlansGenerated}**`,
            `AI Server Builder — planuri aplicate: **${counters.serverPlansApplied}**`,
            `AI Server Builder — elemente create: **${counters.serverItemsCreated}**`,
            `Mini-game-uri jucate: **${counters.minigamePlays}**`,
            `Mini-game-uri câștigate: **${counters.minigameWins}**`,
            `Mini-game-uri — monede mizate: **${counters.minigameWagered}**`,
          ].join('\n'),
          inline: true,
        },
        {
          name: 'Muzică',
          value: [
            `Sesiuni: **${counters.musicSessions}**`,
            `Piese adăugate: **${counters.musicTracksQueued}**`,
            `Piese redate: **${counters.musicTracksPlayed}**`,
            `Piese sărite: **${counters.musicSkipped}**`,
          ].join('\n'),
          inline: true,
        },
        {
          name: 'Publicare',
          value: [
            `Anunțuri: **${counters.announcements}**`,
            `Update-uri: **${counters.updates}**`,
            `Reputație oferită: **${counters.reputation}**`,
          ].join('\n'),
          inline: true,
        },
        {
          name: 'Top comenzi',
          value: top.length
            ? top.map((entry, index) => `${index + 1}. \`/${entry.name}\` — ${entry.count}`).join('\n')
            : 'Nicio comandă în perioada selectată.',
          inline: false,
        },
      )
      .setFooter({
        text: `Perioada: ${period.label} • ${formatTracker(tracked.startedAt)}`,
      })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
