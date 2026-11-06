require('dotenv').config();

const pkg = require('../package.json');

const parsedAutoClose = Number.parseInt(process.env.TICKET_AUTO_CLOSE_HOURS ?? '24', 10);
const parsedReputationCooldown = Number.parseInt(process.env.REPUTATION_COOLDOWN_HOURS ?? '24', 10);
const parsedVoiceLimit = Number.parseInt(process.env.VOICE_DEFAULT_LIMIT ?? '0', 10);
const parsedAdsDays = Number.parseInt(process.env.ADS_DEFAULT_DAYS ?? '7', 10);
const parsedClanMaxMembers = Number.parseInt(process.env.CLAN_MAX_MEMBERS ?? '20', 10);
const parsedClanInviteTtl = Number.parseInt(process.env.CLAN_INVITE_TTL_HOURS ?? '48', 10);
const parsedClanCost = Number.parseInt(process.env.CLAN_CREATE_COST ?? '0', 10);
const parsedMusicVolume = Number.parseInt(process.env.MUSIC_DEFAULT_VOLUME ?? '80', 10);
const parsedMusicMaxQueue = Number.parseInt(process.env.MUSIC_MAX_QUEUE ?? '100', 10);
const parsedMusicMaxDuration = Number.parseInt(process.env.MUSIC_MAX_DURATION_MINUTES ?? '30', 10);
const parsedQuestMaxActive = Number.parseInt(process.env.QUEST_MAX_ACTIVE ?? '3', 10);

const config = {
  token: process.env.DISCORD_TOKEN,
  guildId: process.env.GUILD_ID || null,
  version: pkg.version,
  general: {
    language: (process.env.BOT_LANGUAGE || 'ro').trim().toLowerCase() === 'en' ? 'en' : 'ro',
    timezone: process.env.BOT_TIMEZONE || 'Europe/Bucharest',
    prefix: (process.env.BOT_PREFIX || '').trim(),
    embedColor: (process.env.EMBED_COLOR || '').trim().toLowerCase(),
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY || null,
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    moderationModel: process.env.OPENAI_MODERATION_MODEL || 'omni-moderation-latest',
    systemPrompt:
      process.env.AI_SYSTEM_PROMPT ||
      'Ești NeroAI, asistentul oficial al comunității NeroAI Studios. Răspunde clar, prietenos și concis, în limba în care ți se vorbește.',
  },
  channels: {
    welcome: process.env.WELCOME_CHANNEL_ID || null,
    goodbye: process.env.GOODBYE_CHANNEL_ID || null,
    modLog: process.env.MOD_LOG_CHANNEL_ID || null,
    inviteLog: process.env.INVITE_LOG_CHANNEL_ID || null,
    customCommands: process.env.CUSTOM_COMMANDS_LOG_CHANNEL_ID || null,
    aiModerator: process.env.AI_MODERATOR_LOG_CHANNEL_ID || null,
    aiSecurity: process.env.AI_SECURITY_LOG_CHANNEL_ID || null,
    serverBuilder: process.env.SERVER_BUILDER_LOG_CHANNEL_ID || null,
  },
  ticket: {
    categoryId: process.env.TICKET_CATEGORY_ID || null,
    staffRoleId: process.env.STAFF_ROLE_ID || null,
    logChannelId: process.env.TICKET_LOG_CHANNEL_ID || null,
    autoCloseHours: Number.isFinite(parsedAutoClose) ? parsedAutoClose : 24,
  },
  levels: {
    levelUpChannelId: process.env.LEVEL_UP_CHANNEL_ID || null,
  },
  verify: {
    roleId: process.env.VERIFIED_ROLE_ID || null,
    channelId: process.env.VERIFY_CHANNEL_ID || null,
    captcha: (process.env.VERIFY_CAPTCHA ?? 'true').toLowerCase() !== 'false',
  },
  economy: {
    currency: process.env.CURRENCY_NAME || 'NeroCoins',
  },
  reputation: {
    cooldownHours:
      Number.isFinite(parsedReputationCooldown) && parsedReputationCooldown >= 0
        ? parsedReputationCooldown
        : 24,
  },
  shop: {
    logChannelId: process.env.SHOP_LOG_CHANNEL_ID || null,
  },
  dashboard: {
    enabled: (process.env.DASHBOARD_ENABLED ?? 'true').toLowerCase() !== 'false',
    port: Number.parseInt(process.env.DASHBOARD_PORT ?? '3000', 10),
    host: process.env.DASHBOARD_HOST || '127.0.0.1',
    baseUrl: (process.env.DASHBOARD_BASE_URL || '').replace(/\/+$/, '') || null,
    clientId: process.env.DASHBOARD_CLIENT_ID || null,
    clientSecret: process.env.DASHBOARD_CLIENT_SECRET || null,
    googleClientId: process.env.GOOGLE_CLIENT_ID || null,
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || null,
    sessionSecret: process.env.DASHBOARD_SESSION_SECRET || null,
    guildId: process.env.DASHBOARD_GUILD_ID || process.env.GUILD_ID || null,
    adminRoleId: process.env.DASHBOARD_ADMIN_ROLE_ID || null,
    trustProxy: (process.env.DASHBOARD_TRUST_PROXY ?? 'false').toLowerCase() === 'true',
  },
  updates: {
    channelId: process.env.UPDATE_CHANNEL_ID || null,
    pingRoleId: process.env.UPDATE_PING_ROLE_ID || null,
    autoAnnounce: (process.env.UPDATE_AUTO_ANNOUNCE ?? 'true').toLowerCase() !== 'false',
  },
  announcements: {
    channelId: process.env.ANNOUNCEMENT_CHANNEL_ID || null,
    pingRoleId: process.env.ANNOUNCEMENT_PING_ROLE_ID || null,
  },
  maintenance: {
    channelId: process.env.MAINTENANCE_CHANNEL_ID || null,
    pingRoleId: process.env.MAINTENANCE_PING_ROLE_ID || null,
  },
  application: {
    categoryId: process.env.APPLICATION_CATEGORY_ID || null,
    reviewRoleId: process.env.APPLICATION_REVIEW_ROLE_ID || process.env.STAFF_ROLE_ID || null,
    logChannelId: process.env.APPLICATION_LOG_CHANNEL_ID || null,
  },
  suggestions: {
    channelId: process.env.SUGGESTION_CHANNEL_ID || null,
    reviewRoleId: process.env.SUGGESTION_REVIEW_ROLE_ID || process.env.STAFF_ROLE_ID || null,
    logChannelId: process.env.SUGGESTION_LOG_CHANNEL_ID || null,
  },
  feedback: {
    channelId: process.env.FEEDBACK_CHANNEL_ID || null,
    reviewRoleId: process.env.FEEDBACK_REVIEW_ROLE_ID || process.env.STAFF_ROLE_ID || null,
    logChannelId: process.env.FEEDBACK_LOG_CHANNEL_ID || null,
  },
  badges: {
    logChannelId: process.env.BADGE_LOG_CHANNEL_ID || null,
  },
  ads: {
    channelId: process.env.ADS_CHANNEL_ID || null,
    reviewChannelId: process.env.ADS_REVIEW_CHANNEL_ID || null,
    reviewRoleId: process.env.ADS_REVIEW_ROLE_ID || process.env.STAFF_ROLE_ID || null,
    logChannelId: process.env.ADS_LOG_CHANNEL_ID || null,
    defaultDays:
      Number.isFinite(parsedAdsDays) && parsedAdsDays >= 0 && parsedAdsDays <= 30
        ? parsedAdsDays
        : 7,
    autoDeleteExpired: (process.env.ADS_AUTO_DELETE_EXPIRED ?? 'true').toLowerCase() !== 'false',
  },
  voice: {
    hubChannelId: process.env.VOICE_HUB_CHANNEL_ID || null,
    categoryId: process.env.VOICE_CATEGORY_ID || null,
    logChannelId: process.env.VOICE_LOG_CHANNEL_ID || null,
    defaultLimit:
      Number.isFinite(parsedVoiceLimit) && parsedVoiceLimit >= 0 && parsedVoiceLimit <= 99
        ? parsedVoiceLimit
        : 0,
    autoDelete: (process.env.VOICE_AUTO_DELETE ?? 'true').toLowerCase() !== 'false',
  },
  missions: {
    logChannelId: process.env.MISSIONS_LOG_CHANNEL_ID || null,
  },
  quests: {
    logChannelId: process.env.QUEST_LOG_CHANNEL_ID || null,
    maxActive:
      Number.isFinite(parsedQuestMaxActive) &&
      parsedQuestMaxActive >= 1 &&
      parsedQuestMaxActive <= 10
        ? parsedQuestMaxActive
        : 3,
  },
  clans: {
    logChannelId: process.env.CLAN_LOG_CHANNEL_ID || null,
    maxMembers:
      Number.isFinite(parsedClanMaxMembers) &&
      parsedClanMaxMembers >= 2 &&
      parsedClanMaxMembers <= 100
        ? parsedClanMaxMembers
        : 20,
    inviteTtlHours:
      Number.isFinite(parsedClanInviteTtl) &&
      parsedClanInviteTtl >= 1 &&
      parsedClanInviteTtl <= 168
        ? parsedClanInviteTtl
        : 48,
    createCost:
      Number.isFinite(parsedClanCost) && parsedClanCost >= 0 && parsedClanCost <= 1_000_000
        ? parsedClanCost
        : 0,
  },
  minigames: {
    logChannelId: process.env.MINIGAMES_LOG_CHANNEL_ID || null,
  },
  music: {
    logChannelId: process.env.MUSIC_LOG_CHANNEL_ID || null,
    ytdlpPath: process.env.YTDLP_PATH || null,
    defaultVolume:
      Number.isFinite(parsedMusicVolume) && parsedMusicVolume >= 0 && parsedMusicVolume <= 100
        ? parsedMusicVolume
        : 80,
    maxQueue:
      Number.isFinite(parsedMusicMaxQueue) &&
      parsedMusicMaxQueue >= 10 &&
      parsedMusicMaxQueue <= 500
        ? parsedMusicMaxQueue
        : 100,
    maxDurationSeconds:
      (Number.isFinite(parsedMusicMaxDuration) &&
      parsedMusicMaxDuration >= 1 &&
      parsedMusicMaxDuration <= 240
        ? parsedMusicMaxDuration
        : 30) * 60,
  },
};

if (!config.token) {
  console.error('Lipsește DISCORD_TOKEN. Copiază .env.example în .env și completează tokenul botului.');
  process.exit(1);
}

module.exports = config;
