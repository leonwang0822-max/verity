// Verity — Database Manager (Single Server Lock: 1544153685523955804)
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../../data');
const SINGLE_GUILD_ID = '1544153685523955804';

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// In-Memory Data Stores
let settings = {};
let users = {};
let warnings = {};
let tickets = {};
let modlogs = [];
let sticky = {};
let mutes = {};

// Helper: Safe JSON read
function readJSON(filename, defaultValue) {
    const filePath = path.join(DATA_DIR, filename);
    try {
        if (fs.existsSync(filePath)) {
            const data = fs.readFileSync(filePath, 'utf8');
            return JSON.parse(data);
        }
    } catch (err) {
        console.error(`[DB] Error reading ${filename}:`, err.message);
    }
    return defaultValue;
}

// Helper: Safe JSON write
function writeJSON(filename, data) {
    const filePath = path.join(DATA_DIR, filename);
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
        console.error(`[DB] Error writing ${filename}:`, err.message);
    }
}

// Helper: Un-nest multi-guild structure if present
function unwrapGuildData(rawData) {
    if (rawData && rawData[SINGLE_GUILD_ID]) {
        return rawData[SINGLE_GUILD_ID];
    }
    if (rawData && rawData['1529735375306883194']) {
        return rawData['1529735375306883194'];
    }
    return rawData || {};
}

// Clean corrupted numeric/meta keys from users object
function cleanUserStore(raw) {
    const cleaned = {};
    for (const [key, val] of Object.entries(raw || {})) {
        // Discord Snowflake IDs are long numeric strings (17-19 digits)
        if (typeof key === 'string' && /^\d{16,20}$/.test(key) && typeof val === 'object' && val !== null) {
            cleaned[key] = val;
        }
    }
    return cleaned;
}

// Clean and normalize mutes store
function cleanMuteStore(raw) {
    const cleaned = {};
    for (const [key, val] of Object.entries(raw || {})) {
        if (!val) {
            cleaned[key] = { expiresAt: null, reason: 'Permanent Mute', mutedAt: Date.now() };
        } else if (typeof val === 'number') {
            cleaned[key] = { expiresAt: val, reason: 'Temporary Mute', mutedAt: Date.now() };
        } else if (typeof val === 'object') {
            cleaned[key] = {
                expiresAt: val.expiresAt || null,
                reason: val.reason || 'No reason provided',
                moderatorId: val.moderatorId || null,
                mutedAt: val.mutedAt || Date.now()
            };
        }
    }
    return cleaned;
}

// Initialize & Load All Data
function init() {
    const rawSettings = readJSON('settings.json', {});
    settings = unwrapGuildData(rawSettings);
    if (!settings.prefix) settings.prefix = '?';
    if (settings.levelingEnabled === undefined) settings.levelingEnabled = true;
    if (!settings.autoBanChannelId || settings.autoBanChannelId === '1532038037557743820') settings.autoBanChannelId = '1544154446542409838';

    const rawUsers = readJSON('users.json', {});
    users = cleanUserStore(unwrapGuildData(rawUsers));

    const rawWarnings = readJSON('warnings.json', {});
    warnings = unwrapGuildData(rawWarnings);

    const rawTickets = readJSON('tickets.json', {});
    tickets = unwrapGuildData(rawTickets);

    const rawModlogs = readJSON('modlogs.json', []);
    modlogs = Array.isArray(rawModlogs) ? rawModlogs : (rawModlogs[SINGLE_GUILD_ID] || rawModlogs['1529735375306883194'] || []);

    const rawSticky = readJSON('sticky.json', {});
    sticky = unwrapGuildData(rawSticky);

    const rawMutes = readJSON('mutes.json', {});
    mutes = cleanMuteStore(unwrapGuildData(rawMutes));

    saveAll();
    console.log('[DB] Single-server database initialized for server 1544153685523955804');
}

function saveAll() {
    writeJSON('settings.json', settings);
    writeJSON('users.json', users);
    writeJSON('warnings.json', warnings);
    writeJSON('tickets.json', tickets);
    writeJSON('modlogs.json', modlogs);
    writeJSON('sticky.json', sticky);
    writeJSON('mutes.json', mutes);
}

// ─── Settings API ───
function getSettings() {
    return { ...settings };
}

function updateSettings(updates) {
    settings = { ...settings, ...updates };
    writeJSON('settings.json', settings);
    return settings;
}

// ─── User Arguments Resolver ───
// Supports: getUser(userId), getUser(guildId, userId), updateUser(userId, data), updateUser(guildId, userId, data)
function resolveUserId(arg1, arg2) {
    if (typeof arg2 === 'string' && /^\d{16,20}$/.test(arg2)) {
        return arg2; // (guildId, userId)
    }
    if (typeof arg1 === 'string' && /^\d{16,20}$/.test(arg1)) {
        return arg1; // (userId)
    }
    return typeof arg1 === 'string' ? arg1 : '0';
}

function resolveUpdateArgs(arg1, arg2, arg3) {
    if (typeof arg3 === 'object' && arg3 !== null) {
        return { userId: arg2, data: arg3 }; // (guildId, userId, data)
    }
    if (typeof arg2 === 'object' && arg2 !== null) {
        return { userId: arg1, data: arg2 }; // (userId, data)
    }
    return { userId: arg1, data: {} };
}

// ─── Users & Leveling API ───
function getUser(arg1, arg2) {
    const userId = resolveUserId(arg1, arg2);
    if (!users[userId]) {
        users[userId] = {
            xp: 0,
            level: 0,
            totalMessages: 0,
            lastXpTime: 0,
        };
    }
    return users[userId];
}

function updateUser(arg1, arg2, arg3) {
    const { userId, data } = resolveUpdateArgs(arg1, arg2, arg3);
    const current = getUser(userId);
    users[userId] = { ...current, ...data };
    writeJSON('users.json', users);
    return users[userId];
}

function getAllUsers() {
    return { ...users };
}

function getLeaderboard(limit = 10) {
    return Object.entries(users)
        .filter(([id, data]) => /^\d{16,20}$/.test(id) && typeof data === 'object' && data !== null)
        .map(([id, data]) => ({ userId: id, xp: Number(data.xp) || 0, level: Number(data.level) || 0, totalMessages: Number(data.totalMessages) || 0 }))
        .sort((a, b) => b.xp - a.xp)
        .slice(0, limit);
}

// ─── Warnings API ───
function getWarnings(arg1, arg2) {
    const userId = resolveUserId(arg1, arg2);
    return warnings[userId] || [];
}

function addWarning(arg1, arg2, arg3) {
    let userId;
    let warning;
    if (arg3 !== undefined) {
        if (typeof arg3 === 'string') {
            // Called as addWarning(userId, moderatorId, reason)
            userId = arg1;
            warning = { reason: arg3, moderatorId: arg2, timestamp: Date.now() };
        } else {
            // Called as addWarning(guildId, userId, warningObj)
            userId = arg2;
            warning = arg3;
        }
    } else {
        // Called as addWarning(userId, warningObj)
        userId = arg1;
        warning = typeof arg2 === 'object' && arg2 !== null
            ? { timestamp: Date.now(), ...arg2 }
            : { reason: String(arg2 || 'No reason provided'), timestamp: Date.now() };
    }
    if (!warnings[userId]) warnings[userId] = [];
    warnings[userId].push(warning);
    writeJSON('warnings.json', warnings);
    return warnings[userId];
}

function clearWarnings(arg1, arg2) {
    const userId = resolveUserId(arg1, arg2);
    warnings[userId] = [];
    writeJSON('warnings.json', warnings);
}

// ─── Tickets API ───
let ticketCounter = 0;

function incrementTicketCounter(type = 'support') {
    ticketCounter++;
    return ticketCounter;
}

function createTicket(data) {
    const id = `ticket-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const ticket = {
        id,
        createdAt: Date.now(),
        status: 'open',
        ...data,
    };
    tickets[data.channelId] = ticket;
    writeJSON('tickets.json', tickets);
    return ticket;
}

function getTicket(channelId) {
    return tickets[channelId] || null;
}

function getTicketByChannel(channelId) {
    return tickets[channelId] || null;
}

function saveTicket(channelId, ticketData) {
    tickets[channelId] = ticketData;
    writeJSON('tickets.json', tickets);
}

function updateTicket(ticketIdOrChannelId, updates) {
    let key = ticketIdOrChannelId;
    if (!tickets[key]) {
        key = Object.keys(tickets).find(k => tickets[k].id === ticketIdOrChannelId);
    }
    if (key && tickets[key]) {
        tickets[key] = { ...tickets[key], ...updates };
        writeJSON('tickets.json', tickets);
        return tickets[key];
    }
    return null;
}

function getAllTickets() {
    return { ...tickets };
}

// ─── ModLogs API ───
function addModLog(arg1, arg2) {
    const log = (typeof arg2 === 'object' && arg2 !== null) ? arg2 : arg1;
    modlogs.unshift(log);
    if (modlogs.length > 500) modlogs = modlogs.slice(0, 500);
    writeJSON('modlogs.json', modlogs);
}

function getModLogs(userId = null, limit = 50) {
    if (typeof userId === 'string' && /^\d{16,20}$/.test(userId)) {
        return modlogs.filter(l => l.targetId === userId).slice(0, limit);
    }
    return modlogs.slice(0, limit);
}

// ─── Sticky Messages API ───
function getSticky(channelId) {
    return sticky[channelId] || null;
}

function setSticky(channelId, stickyData) {
    sticky[channelId] = stickyData;
    writeJSON('sticky.json', sticky);
}

function removeSticky(channelId) {
    delete sticky[channelId];
    writeJSON('sticky.json', sticky);
}

// ─── Mutes API ───
function getMute(userId) {
    return mutes[userId] || null;
}

function addMute(userId, muteDataOrExpiresAt, reason, moderatorId) {
    let data;
    if (muteDataOrExpiresAt && typeof muteDataOrExpiresAt === 'object') {
        data = {
            expiresAt: muteDataOrExpiresAt.expiresAt || null,
            reason: muteDataOrExpiresAt.reason || 'No reason provided',
            moderatorId: muteDataOrExpiresAt.moderatorId || null,
            mutedAt: muteDataOrExpiresAt.mutedAt || Date.now()
        };
    } else {
        data = {
            expiresAt: muteDataOrExpiresAt || null,
            reason: reason || 'No reason provided',
            moderatorId: moderatorId || null,
            mutedAt: Date.now()
        };
    }
    mutes[userId] = data;
    writeJSON('mutes.json', mutes);
}

function removeMute(userId) {
    delete mutes[userId];
    writeJSON('mutes.json', mutes);
}

function getAllMutes() {
    return { ...mutes };
}


// ─── Applications API ───
function getApplicationStatus(type) {
    if (!settings.applications) {
        settings.applications = { staff: false, dev: false };
    }
    return settings.applications[type] !== undefined ? Boolean(settings.applications[type]) : false;
}

function setApplicationStatus(type, isOpen) {
    if (!settings.applications) {
        settings.applications = { staff: false, dev: false };
    }
    settings.applications[type] = Boolean(isOpen);
    writeJSON('settings.json', settings);
    return settings.applications[type];
}

// Run initialization
init();


module.exports = {
    SINGLE_GUILD_ID,
    getSettings,
    updateSettings,
    getUser,
    updateUser,
    getAllUsers,
    getLeaderboard,
    getWarnings,
    addWarning,
    clearWarnings,
    getTicket,
    getTicketByChannel,
    createTicket,
    updateTicket,
    incrementTicketCounter,
    saveTicket,
    getAllTickets,
    addModLog,
    getModLogs,
    getSticky,
    setSticky,
    removeSticky,
    getMute,
    addMute,
    removeMute,
    getAllMutes,
    getApplicationStatus,
    setApplicationStatus,
};
