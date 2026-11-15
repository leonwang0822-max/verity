// Sub-Bot Entry Point (Lightweight Chat & Music Bot)
const dns = require('dns');
if (dns.setDefaultResultOrder) dns.setDefaultResultOrder('ipv4first');
require('dotenv').config();
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const config = require('./config');
const handleMessageCreate = require('./events/messageCreate');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.DirectMessages,
    ],
    partials: [Partials.Channel, Partials.Message]
});

client.once('ready', async () => {
    console.log(`[SUB-BOT] Logged in as ${client.user.tag}! Prefix: "${config.prefix}"`);

    const { ensureVC } = require('./systems/voice');
    const autoJoinVC = async () => {
        try {
            const guild = client.guilds.cache.first();
            if (guild) {
                await ensureVC(guild.id, client);
            }
        } catch (e) {
            console.warn('[SUB-BOT] Auto-join VC error:', e.message);
        }
    };

    // Auto-join on startup
    await autoJoinVC();

    // 24/7 Watchdog: verify connection every 30s
    setInterval(autoJoinVC, 30_000);
});

client.on('messageCreate', (message) => handleMessageCreate(message, client));

const token = config.token || process.env.DISCORD_TOKEN;
if (!token) {
    console.error('[SUB-BOT ERROR] No Discord token provided! Please set token in config.js or env.');
    process.exit(1);
}

client.login(token);
