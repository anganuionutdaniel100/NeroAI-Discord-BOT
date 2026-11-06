const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, GatewayIntentBits, Events } = require('discord.js');
const config = require('./config');
require('./utils/serverSettings');
const { startTicketAutoClose } = require('./handlers/tickets');
const { startGiveawayScheduler } = require('./handlers/giveaways');
const { startInviteTracker } = require('./handlers/invites');
const { announceVersionUpdate } = require('./handlers/updates');
const { checkMaintenanceExpiry } = require('./handlers/maintenance');
const { startVoiceManager } = require('./handlers/voice');
const { startAdsManager } = require('./handlers/ads');
const { startDashboard } = require('./dashboard/server');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildInvites,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

client.commands = new Collection();

const commandsDir = path.join(__dirname, 'commands');
for (const file of fs.readdirSync(commandsDir).filter((name) => name.endsWith('.js'))) {
  const command = require(path.join(commandsDir, file));
  if (!command?.data || !command?.execute) {
    console.warn(`Comanda ${file} este ignorată: lipsește data sau execute.`);
    continue;
  }
  client.commands.set(command.data.name, command);
}

const eventsDir = path.join(__dirname, 'events');
for (const file of fs.readdirSync(eventsDir).filter((name) => name.endsWith('.js'))) {
  const event = require(path.join(eventsDir, file));
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args, client));
  } else {
    client.on(event.name, (...args) => event.execute(...args, client));
  }
}

client.once(Events.ClientReady, async (readyClient) => {
  console.log(`Conectat ca ${readyClient.user.tag} (${readyClient.user.id})`);
  console.log(`Comenzi încărcate: ${client.commands.size}`);

  startDashboard(client);

  await startInviteTracker(client);
  await announceVersionUpdate(client);

  try {
    const body = [...client.commands.values()].map((command) => command.data.toJSON());
    if (config.guildId) {
      await readyClient.application.commands.set(body, config.guildId);
      console.log(`Comenzi înregistrate pe serverul ${config.guildId} (disponibile imediat).`);
    } else {
      await readyClient.application.commands.set(body);
      console.log('Comenzi înregistrate global (pot dura până la ~1 oră să apară).');
    }
  } catch (error) {
    console.error('Înregistrarea comenzilor a eșuat:', error);
  }

  startTicketAutoClose(client);
  startGiveawayScheduler(client);
  startVoiceManager(client);
  startAdsManager(client);

  await checkMaintenanceExpiry(client).catch((error) => {
    console.error('Verificarea mentenanței a eșuat:', error.message);
  });

  setInterval(() => {
    checkMaintenanceExpiry(client).catch((error) => {
      console.error('Verificarea mentenanței a eșuat:', error.message);
    });
  }, 30_000).unref();
});

client.login(config.token).catch((error) => {
  console.error('Autentificarea a eșuat. Verifică DISCORD_TOKEN:', error.message);
  client.destroy();
  process.exitCode = 1;
});
