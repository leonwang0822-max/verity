// Sub-Bot Entry Point (Lightweight Chat & Music Bot)
const dns = require('dns');
if (dns.setDefaultResultOrder) dns.setDefaultResultOrder('ipv4first');
require('dotenv').config();
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const config = require('./config');
const handleMessageCreate = require('../template/events/messageCreate');
const { joinVC } = require('../template/systems/voice');

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
    console.log(`[SUB-BOT 1] Logged in as ${client.user.tag}! Prefix: "${config.prefix}"`);

    const { ensureVC } = require('../template/systems/voice');
    const autoJoinVC = async () => {
        try {
            const vc = await client.channels.fetch('1544153689302896702').catch(() => null);
            if (vc && vc.isVoiceBased()) {
                await ensureVC(vc.guild.id, client);
            }
        } catch (e) {
            console.error('[SUB-BOT 1 VC JOIN ERROR]', e.message);
        }
    };

    // Auto-join on startup
    await autoJoinVC();

    // 24/7 Watchdog: verify voice channel connection every 30 seconds
    setInterval(autoJoinVC, 30_000);
});

client.on('messageCreate', (message) => {
    // STRICT SCOPING: Only process messages inside channel 1544153689302896702 or DMs
    if (message.guild && message.channel.id !== '1544153689302896702') return;
    handleMessageCreate(message, client);
});

const token = config.token;
if (!token) {
    console.error('[SUB-BOT 1 ERROR] No token provided in config.js');
    process.exit(1);
}

client.login(token);
