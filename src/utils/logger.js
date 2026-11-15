// Verity — Super Detailed Panel Logger
// Provides formatted, color-coded, timestamped console logging for Pterodactyl/Cybrancee panels

const chalkColors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    
    // Foreground
    black: '\x1b[30m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    gray: '\x1b[90m',
    
    // Background
    bgBlue: '\x1b[44m',
    bgMagenta: '\x1b[45m',
    bgCyan: '\x1b[46m',
};

function getTimestamp() {
    const d = new Date();
    return `${d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' })} ${d.toLocaleTimeString('en-US', { hour12: false })}`;
}

const logger = {
    system: (msg, ...args) => {
        console.log(`${chalkColors.gray}[${getTimestamp()}]${chalkColors.reset} ${chalkColors.cyan}${chalkColors.bright}[SYSTEM]${chalkColors.reset} ${msg}`, ...args);
    },
    main: (msg, ...args) => {
        console.log(`${chalkColors.gray}[${getTimestamp()}]${chalkColors.reset} ${chalkColors.green}${chalkColors.bright}[MAIN BOT]${chalkColors.reset} ${msg}`, ...args);
    },
    music: (msg, ...args) => {
        console.log(`${chalkColors.gray}[${getTimestamp()}]${chalkColors.reset} ${chalkColors.magenta}${chalkColors.bright}[MUSIC BOT]${chalkColors.reset} ${msg}`, ...args);
    },
    command: (userTag, channelName, cmdText, durationMs = null) => {
        const timeStr = durationMs !== null ? ` ${chalkColors.dim}(${durationMs}ms)${chalkColors.reset}` : '';
        console.log(`${chalkColors.gray}[${getTimestamp()}]${chalkColors.reset} ${chalkColors.yellow}${chalkColors.bright}[CMD]${chalkColors.reset} ${chalkColors.bright}${userTag}${chalkColors.reset} in ${chalkColors.cyan}#${channelName}${chalkColors.reset}: "${chalkColors.yellow}${cmdText}${chalkColors.reset}"${timeStr}`);
    },
    voice: (botName, msg, ...args) => {
        console.log(`${chalkColors.gray}[${getTimestamp()}]${chalkColors.reset} ${chalkColors.blue}${chalkColors.bright}[VOICE ${botName.toUpperCase()}]${chalkColors.reset} ${msg}`, ...args);
    },
    stream: (botName, msg, ...args) => {
        console.log(`${chalkColors.gray}[${getTimestamp()}]${chalkColors.reset} ${chalkColors.cyan}${chalkColors.bright}[STREAM ${botName.toUpperCase()}]${chalkColors.reset} ${msg}`, ...args);
    },
    event: (eventName, details = '') => {
        console.log(`${chalkColors.gray}[${getTimestamp()}]${chalkColors.reset} ${chalkColors.gray}[EVENT:${eventName}]${chalkColors.reset} ${details}`);
    },
    db: (msg, ...args) => {
        console.log(`${chalkColors.gray}[${getTimestamp()}]${chalkColors.reset} ${chalkColors.white}${chalkColors.dim}[DATABASE]${chalkColors.reset} ${msg}`, ...args);
    },
    warn: (msg, ...args) => {
        console.log(`${chalkColors.gray}[${getTimestamp()}]${chalkColors.reset} ${chalkColors.yellow}${chalkColors.bright}[WARN]${chalkColors.reset} ⚠️ ${msg}`, ...args);
    },
    error: (msg, err = null) => {
        console.error(`${chalkColors.gray}[${getTimestamp()}]${chalkColors.reset} ${chalkColors.red}${chalkColors.bright}[ERROR]${chalkColors.reset} ❌ ${msg}`);
        if (err && err.stack) {
            console.error(`${chalkColors.red}${err.stack}${chalkColors.reset}`);
        } else if (err) {
            console.error(`${chalkColors.red}${err}${chalkColors.reset}`);
        }
    },
    stats: (label = 'MEMORY STATS') => {
        const mem = process.memoryUsage();
        const rssMB = (mem.rss / (1024 * 1024)).toFixed(1);
        const heapMB = (mem.heapUsed / (1024 * 1024)).toFixed(1);
        const totalHeapMB = (mem.heapTotal / (1024 * 1024)).toFixed(1);
        console.log(`${chalkColors.gray}[${getTimestamp()}]${chalkColors.reset} ${chalkColors.blue}${chalkColors.bright}[STATS]${chalkColors.reset} ${label} → RSS: ${rssMB} MB | Heap: ${heapMB}/${totalHeapMB} MB`);
    }
};

module.exports = logger;
