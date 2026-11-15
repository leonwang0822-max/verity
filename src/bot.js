// Verity — Core Bot Initializer
const dns = require('dns');
if (dns.setDefaultResultOrder) dns.setDefaultResultOrder('ipv4first');
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const config = require('./config');
const { loadCommands } = require('./handlers/commandHandler');
const { loadEvents } = require('./handlers/eventHandler');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessageReactions,
    ],
});

client.commands = new Collection();
client.config = config;



async function loginWithRetry(token, maxRetries = 10) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            await client.login(token);
            return;
        } catch (err) {
            console.error(`[BOT LOGIN] Attempt ${attempt}/${maxRetries} failed: ${err.message}. Retrying in 5 seconds...`);
            if (attempt === maxRetries) throw err;
            await new Promise(r => setTimeout(r, 5000));
        }
    }
}

async function start() {
    console.log('╔══════════════════════════════════════╗');
    console.log('║           🌟 Verity v1.0            ║');
    console.log('║  Made by realleonw for Lume\'s Realm  ║');
    console.log('╚══════════════════════════════════════╝');

    // Load handlers
    await loadCommands(client);
    await loadEvents(client);

    // Login with auto-retry
    await loginWithRetry(config.TOKEN);

}

module.exports = { client, start };
