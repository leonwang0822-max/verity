// Verity — Main Entry Point
// Starts the main bot and the music sub-bot.

require('dotenv').config();
const dns = require('dns');
try { dns.setDefaultResultOrder('ipv4first'); } catch (e) {}

// Global crash handlers to prevent process termination
process.on('unhandledRejection', (reason, promise) => {
    console.error('[WARN] Unhandled Rejection:', reason?.message || reason);
});

process.on('uncaughtException', (err, origin) => {
    console.error('[WARN] Uncaught Exception:', err?.message || err);
});

const { client, start } = require('./src/bot');

async function main() {
    // Start main bot
    await start();

    // Start sub-bot (Verity 2)
    try {
        const fs = require('fs');
        const path = require('path');
        const subBotPath = path.join(__dirname, 'sub-bots', 'bot-1', 'index.js');
        if (fs.existsSync(subBotPath)) {
            console.log('[SUB-BOT] Initializing Verity 2 sub-bot...');
            require('./sub-bots/bot-1/index');
        }
    } catch (e) {
        console.error('[SUB-BOT] Failed to initialize sub-bot:', e.message);
    }
}

main();
