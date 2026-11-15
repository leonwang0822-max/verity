// LumeBot — Leveling System
// Polaris-inspired XP calculation with role rewards

const config = require('../config');
const db = require('../database/db');
const { createEmbed } = require('../utils/embeds');

// XP needed to reach a specific level (cumulative)
// Formula: 5 * level^2 + 50 * level + 100
function xpForLevel(level) {
    let total = 0;
    for (let i = 1; i <= level; i++) {
        total += 5 * (i * i) + 50 * i + 100;
    }
    return total;
}

// XP needed for just the next level
function xpForNextLevel(level) {
    return 5 * ((level + 1) * (level + 1)) + 50 * (level + 1) + 100;
}

// Calculate level from total XP
function getLevelFromXP(xp) {
    let level = 0;
    let totalRequired = 0;
    while (true) {
        const nextLevelXP = 5 * ((level + 1) * (level + 1)) + 50 * (level + 1) + 100;
        if (totalRequired + nextLevelXP > xp) break;
        totalRequired += nextLevelXP;
        level++;
    }
    return level;
}

// Get XP progress within current level
function getProgress(xp, level) {
    let totalForCurrent = 0;
    for (let i = 1; i <= level; i++) {
        totalForCurrent += 5 * (i * i) + 50 * i + 100;
    }
    const currentLevelXP = xp - totalForCurrent;
    const neededForNext = 5 * ((level + 1) * (level + 1)) + 50 * (level + 1) + 100;
    return {
        currentXP: currentLevelXP,
        neededXP: neededForNext,
        totalXP: xp,
        percentage: Math.floor((currentLevelXP / neededForNext) * 100),
    };
}

// Generate a visual progress bar
function progressBar(percentage, length = 20) {
    const filled = Math.round((percentage / 100) * length);
    const empty = length - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
}

// Automatically detect level role rewards from guild role names
function detectGuildLevelRoles(guild) {
    const rolesMap = {};
    if (!guild || !guild.roles || !guild.roles.cache) return rolesMap;

    // Matches e.g. "Level 1", "Level 5", "Lvl 10", "Level-20", "Level 100 | Active", "[Level 5]"
    const regex = /(?:level|lvl)\s*[:\-_#\[\]]*\s*(\d+)/i;

    guild.roles.cache.forEach(role => {
        const match = role.name.match(regex);
        if (match) {
            const level = parseInt(match[1], 10);
            if (!isNaN(level) && level > 0) {
                if (!rolesMap[level] || role.position > (guild.roles.cache.get(rolesMap[level])?.position || 0)) {
                    rolesMap[level] = role.id;
                }
            }
        }
    });

    return rolesMap;
}

// Get combined map of level roles for a guild (auto-detected + configured fallback)
function getLevelRolesMap(guild = null) {
    const detected = detectGuildLevelRoles(guild);
    const settings = db.getSettings();
    const configured = settings.levelRoles || config.LEVEL_ROLES || {};

    // Auto-detected roles from server role names take priority, falling back to configured
    return { ...configured, ...detected };
}

// Get the role reward for a level (if any)
function getRoleForLevel(level, guild = null) {
    const rolesMap = getLevelRolesMap(guild);
    return rolesMap[level] || null;
}

// Get all role rewards at or below a given level
function getRolesUpToLevel(level, guild = null) {
    const roles = [];
    const rolesMap = getLevelRolesMap(guild);
    const levels = Object.keys(rolesMap).map(Number).sort((a, b) => a - b);
    for (const lvl of levels) {
        if (lvl <= level) roles.push({ level: lvl, roleId: rolesMap[lvl] });
    }
    return roles;
}

// Handle XP gain from a message
async function handleMessage(message) {
    if (message.author.bot) return;
    if (!message.guild) return;

    const guildId = message.guild.id;
    const settings = db.getSettings(guildId);
    if (!settings.levelingEnabled) return;

    const userId = message.author.id;
    const user = db.getUser(guildId, userId);
    const now = Date.now();

    // Cooldown check
    if (now - user.lastXpTime < config.XP.COOLDOWN_SECONDS * 1000) {
        // Still update message count
        db.updateUser(guildId, userId, { totalMessages: (user.totalMessages || 0) + 1 });
        return;
    }

    // Random XP gain
    const xpGain = Math.floor(Math.random() * (config.XP.MAX_PER_MESSAGE - config.XP.MIN_PER_MESSAGE + 1)) + config.XP.MIN_PER_MESSAGE;
    const newXP = (user.xp || 0) + xpGain;
    const oldLevel = user.level || 0;
    const newLevel = getLevelFromXP(newXP);

    db.updateUser(guildId, userId, {
        xp: newXP,
        level: newLevel,
        totalMessages: (user.totalMessages || 0) + 1,
        lastXpTime: now,
    });

    // Level up!
    if (newLevel > oldLevel) {
        await onLevelUp(message, newLevel, oldLevel);
    }
}

// Handle level up
async function onLevelUp(message, newLevel, oldLevel) {
    const member = message.member;
    if (!member) return;

    try {
        const lvlMsg = await message.channel.send({ content: `${message.author} Reached Level ${newLevel} 🎉` });
        setTimeout(() => {
            lvlMsg.delete().catch(() => {});
        }, 5000);
    } catch (e) {
        // Channel might not allow bot messages
    }

    // Assign role rewards
    await syncLevelRoles(member, newLevel);
}

// Sync all level roles for a member
async function syncLevelRoles(member, level) {
    if (!member || !member.guild) return;
    if (level === undefined || level === null) {
        level = db.getUser(member.guild.id, member.id).level || 0;
    }

    const me = member.guild.members.me;
    if (!me || !me.permissions.has('ManageRoles')) {
        console.warn(`[LEVEL] Bot lacks ManageRoles permission in guild ${member.guild.name}`);
        return;
    }

    const levelRolesMap = getLevelRolesMap(member.guild);
    const allLevelRoleIds = Object.values(levelRolesMap);
    const earnedRoles = getRolesUpToLevel(level, member.guild);

    for (const roleId of allLevelRoleIds) {
        let role = member.guild.roles.cache.get(roleId);
        if (!role) {
            role = await member.guild.roles.fetch(roleId).catch(() => null);
        }
        if (!role) continue;

        // Check if bot's highest role is above the target level role
        if (role.position >= me.roles.highest.position) {
            console.warn(`[LEVEL] Cannot manage role "${role.name}" (${role.id}) because it is equal to or higher than bot's highest role (${me.roles.highest.name})`);
            continue;
        }

        const shouldHave = earnedRoles.some(r => r.roleId === roleId);

        try {
            if (shouldHave && !member.roles.cache.has(roleId)) {
                await member.roles.add(role);
                console.log(`[LEVEL] Added role ${role.name} to ${member.user.tag}`);
            } else if (!shouldHave && member.roles.cache.has(roleId)) {
                await member.roles.remove(role);
                console.log(`[LEVEL] Removed role ${role.name} from ${member.user.tag}`);
            }
        } catch (e) {
            console.error(`[LEVEL] Failed to manage role ${role.name} for ${member.user.tag}:`, e.message);
        }
    }
}

module.exports = {
    xpForLevel,
    xpForNextLevel,
    getLevelFromXP,
    getProgress,
    progressBar,
    detectGuildLevelRoles,
    getLevelRolesMap,
    getRoleForLevel,
    getRolesUpToLevel,
    handleMessage,
    syncLevelRoles,
};
