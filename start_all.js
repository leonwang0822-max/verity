// Verity Bot — Unified Master Launcher
// Starts Main Verity Bot and Second Companion Sub-Bot
// Starts the main bot and the music sub-bot.

require('dotenv').config();
const dns = require('dns');
try { dns.setDefaultResultOrder('ipv4first'); } catch (e) {}

// Global crash protection
process.on('unhandledRejection', (reason) => {
    console.error('[WARN] Unhandled Rejection:', reason?.message || reason);
});
process.on('uncaughtException', (err) => {
    console.error('[WARN] Uncaught Exception:', err?.message || err);
});

const logger = require('./src/utils/logger');
const { ensureBinaries } = require('./src/utils/binaries');
const { client, start } = require('./src/bot');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

async function launchSystem() {
    console.log('\x1b[36m\x1b[1m' +
`========================================================================
   ██╗   ██╗███████╗██████╗ ██╗████████╗██╗   ██╗
   ██║   ██║██╔════╝██╔══██╗██║╚══██╔══╝╚██╗ ██╔╝
   ██║   ██║█████╗  ██████╔╝██║   ██║    ╚████╔╝ 
   ╚██╗ ██╔╝██╔══╝  ██╔══██╗██║   ██║     ╚██╔╝  
    ╚████╔╝ ███████╗██║  ██║██║   ██║      ██║   
     ╚═══╝  ╚══════╝╚═╝  ╚═╝╚═╝   ╚═╝      ╚═╝   
========================================================================` + '\x1b[0m');

    logger.system(`🚀 Node.js Runtime: ${process.version} | Platform: ${process.platform} (${process.arch})`);
    logger.system(`📍 Working Directory: ${__dirname}`);
    logger.stats('STARTUP MEMORY');

    // Auto-verify or download yt-dlp & ffmpeg binaries for panel environment
    try {
        await ensureBinaries();
    } catch (e) {
        logger.error('Binary check failed', e);
    }

    // Verify critical environment variables
    const token = process.env.BOT_TOKEN || process.env.DISCORD_TOKEN;
    if (!token) {
        logger.warn('Missing bot token in environment! Please set BOT_TOKEN or DISCORD_TOKEN in .env');
    } else {
        logger.system(`🔐 Environment loaded: GUILD_ID=${process.env.GUILD_ID || '1529735375306883194'}, PREFIX=${process.env.PREFIX || '?'}`);
    }

    // 1. Start Main Bot
    try {
        logger.main('Initializing Main Discord Bot client & registering listeners...');
        await start();
        logger.main('✅ Main Verity Bot Online & Connected to Gateway!');
    } catch (e) {
        logger.error('Main Bot Launch Failed', e);
    }

    // 2. Start Music Sub-Bot as a SEPARATE child process
    const subBotPath = path.resolve(__dirname, 'sub-bots/bot-1/index.js');
    if (fs.existsSync(subBotPath)) {
        logger.music('🚀 Spawning Dedicated Music Sub-Bot (Process Isolation Mode)...');

        let child = null;
        let isShuttingDown = false;

        const cleanup = () => {
            isShuttingDown = true;
            if (child && !child.killed) {
                try { child.kill('SIGTERM'); } catch (e) {}
            }
        };

        process.on('SIGINT', () => { cleanup(); process.exit(); });
        process.on('SIGTERM', () => { cleanup(); process.exit(); });
        process.on('exit', () => { cleanup(); });

        const spawnSubBot = () => {
            if (isShuttingDown) return;
            child = spawn(process.execPath, [subBotPath], {
                stdio: 'inherit',
                env: { ...process.env },
                cwd: __dirname,
            });

            logger.music(`✅ Sub-Bot process active with PID: ${child.pid}`);

            child.on('exit', (code, signal) => {
                if (isShuttingDown) return;
                logger.warn(`[MUSIC BOT] Process exited (code=${code}, signal=${signal}). Auto-restarting in 5s...`);
                setTimeout(spawnSubBot, 5000);
            });

            child.on('error', (err) => {
                if (isShuttingDown) return;
                logger.error('[MUSIC BOT] Sub-Bot spawn error', err);
                setTimeout(spawnSubBot, 5000);
            });
        };

        spawnSubBot();
    } else {
        logger.warn(`Sub-bot entry file not found at: ${subBotPath}`);
    }

    // Periodic memory health check in panel (every 10 minutes)
    setInterval(() => {
        logger.stats('PERIODIC HEALTH CHECK');
    }, 600000);
}

launchSystem();
