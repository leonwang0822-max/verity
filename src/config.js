// Verity — Configuration & Settings
require('dotenv').config();

module.exports = {
    // Bot Credentials
    TOKEN: process.env.BOT_TOKEN || process.env.DISCORD_TOKEN,
    CLIENT_ID: process.env.CLIENT_ID,
    GUILD_ID: '1544153685523955804', // Single Server Lock

    // Default Settings
    PREFIX: '?',
    BOT_NAME: 'Verity',
    BOT_FOOTER: 'Verity • Powered by AI',

    // Essential Guild Roles
    MANAGER_ROLE_ID: '1544153686022951005', // Manager
    ADMIN_ROLE_ID: '1544153686022951003',   // Access / Admin
    MUTED_ROLE_ID: '1544153685985071105',   // Muted
    DEV_USER_ID: '1488316093964746872',     // Developer / Owner ID

    // Essential Channels
    LOG_CHANNEL_ID: '1531896115052417115',
    APPEALS_CHANNEL_ID: '1544153688774410367',
    AUTO_VC_CHANNEL_ID: '1544153689302896701',

    // Embed Color Palette
    COLORS: {
        PRIMARY: '#5865F2',
        SUCCESS: '#57F287',
        WARNING: '#FEE75C',
        DANGER: '#ED4245',
        INFO: '#5865F2',
        PURPLE: '#9B59B6',
        MUTE: '#E67E22',
        BAN: '#992D22',
        TICKET: '#3498DB',
        LEVEL: '#F1C40F',
    },

    // XP & Leveling Config
    XP: {
        MIN_PER_MESSAGE: 15,
        MAX_PER_MESSAGE: 25,
        COOLDOWN_SECONDS: 60,
    },

    // Level Role Rewards (Level -> Role ID)
    LEVEL_ROLES: {
        1: '1544153685985071109',
        5: '1544153685985071110',
        10: '1544153685985071111',
        30: '1544153685985071112',
        50: '1544153685985071113',
        100: '1544153686010363914',
    },
};
