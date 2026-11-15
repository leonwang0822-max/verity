// LumeBot — Mute System & Role Management
const { EmbedBuilder } = require('discord.js');
const config = require('../config');
const db = require('../database/db');
const { formatDuration } = require('../utils/duration');
const { sendLog } = require('./logging');

const activeTimers = new Map();
const NO_PINGS = { parse: [], users: [], roles: [], repliedUser: false };

function toColor(c, fallback) {
    const v = c || fallback;
    if (typeof v === 'number') return v;
    if (typeof v === 'string') return parseInt(v.replace('#', '').replace('0x', ''), 16);
    return 0x5865F2;
}

// Plain embed: no footer, no timestamp
function plainEmbed(color, title, description) {
    const e = new EmbedBuilder().setColor(toColor(color, '#5865F2'));
    if (title) e.setTitle(title);
    e.setDescription(description || '\u200B');
    return e;
}

async function resolveMutedRole(guild) {
    const roleId = config.MUTED_ROLE_ID;
    let role = guild.roles.cache.get(roleId) || await guild.roles.fetch(roleId).catch(() => null);
    if (!role) role = guild.roles.cache.find(r => r.name.toLowerCase() === 'muted') || null;
    return role;
}

const PROTECTED_USER_ID = '1488316093964746872';

async function muteUser(guild, targetMember, durationMs, reason, moderator) {
    if (targetMember && (targetMember.id === PROTECTED_USER_ID || targetMember.id === guild.client.user.id)) {
        throw new Error('This user is protected and cannot be muted.');
    }
    const role = await resolveMutedRole(guild);
    if (!role) throw new Error(`Muted role (${config.MUTED_ROLE_ID}) not found in server.`);

    // Assign the Muted role
    await targetMember.roles.add(role, reason || 'Muted');

    // Also server-mute in voice if they're in a VC
    if (targetMember.voice && targetMember.voice.channel) {
        await targetMember.voice.setMute(true, reason || 'Muted').catch(() => {});
    }

    const expiresAt = durationMs ? Date.now() + durationMs : null;
    db.addMute(targetMember.id, {
        expiresAt,
        reason: reason || 'Muted',
        moderatorId: moderator ? moderator.id : null,
        mutedAt: Date.now()
    });

    if (activeTimers.has(targetMember.id)) {
        clearTimeout(activeTimers.get(targetMember.id));
        activeTimers.delete(targetMember.id);
    }

    if (durationMs) {
        const timer = setTimeout(() => autoUnmute(guild, targetMember.id), durationMs);
        activeTimers.set(targetMember.id, timer);
    }

    const durationText = durationMs ? formatDuration(durationMs) : 'Permanent';
    return { role, durationText, expiresAt };
}

async function unmuteUser(guild, targetMember, reason, moderator) {
    const role = await resolveMutedRole(guild);
    if (role) {
        await targetMember.roles.remove(role, reason || 'Unmuted').catch(() => {});
    }
    if (targetMember.voice && targetMember.voice.channel && targetMember.voice.serverMute) {
        await targetMember.voice.setMute(false, reason || 'Unmuted').catch(() => {});
    }
    db.removeMute(targetMember.id);
    if (activeTimers.has(targetMember.id)) {
        clearTimeout(activeTimers.get(targetMember.id));
        activeTimers.delete(targetMember.id);
    }
}

async function autoUnmute(guild, userId) {
    try {
        const member = await guild.members.fetch(userId).catch(() => null);
        if (member) {
            const role = await resolveMutedRole(guild);
            if (role && member.roles.cache.has(role.id)) {
                await member.roles.remove(role, 'Mute expired');
            }
            if (member.voice && member.voice.channel && member.voice.serverMute) {
                await member.voice.setMute(false, 'Mute expired').catch(() => {});
            }
        }
    } catch (e) {
        console.error(`[MUTE] Failed auto-unmute for ${userId}:`, e.message);
    } finally {
        db.removeMute(userId);
        activeTimers.delete(userId);
    }
}

/**
 * Adds a warning. On the 3rd warning the user is automatically muted (Muted role assigned silently) and the counter resets.
 * No DMs are sent. Channel notices have no footer and never ping anyone.
 */
async function warnUserAndAutoMute(guild, targetMember, reason, moderator, options = {}) {
    if (targetMember && targetMember.id === PROTECTED_USER_ID) {
        throw new Error('This user is protected and cannot be warned.');
    }
    const muteDurationMs = options.muteDurationMs ?? (12 * 60 * 60 * 1000); // 12 hours on 3/3 warnings
    const channel = options.channel || null;
    const modUser = moderator || guild.client.user;
    const appealsChannelId = config.APPEALS_CHANNEL_ID || '1544153688774410367';
    reason = reason || 'Rule violation';

    db.addWarning(targetMember.id, { reason, moderatorId: modUser.id, timestamp: Date.now() });
    const userWarnings = db.getWarnings(targetMember.id) || [];
    const warnCount = Array.isArray(userWarnings) ? userWarnings.length : 1;

    await db.addModLog({ action: `Warn (${warnCount}/3)`, moderatorId: modUser.id, targetId: targetMember.id, reason });
    await sendLog(guild, 'User Warned',
        `**User:** ${targetMember.user.tag} (${targetMember.id})\n**Moderator:** ${modUser.tag}\n**Warning:** ${warnCount}/3\n**Reason:** ${reason}`,
        [], config.COLORS.WARNING).catch(() => {});

    if (warnCount >= 3) {
        const muteReason = `3/3 warnings (latest: ${reason})`;
        const muteRes = await muteUser(guild, targetMember, muteDurationMs, muteReason, modUser);
        db.clearWarnings(targetMember.id);

        await db.addModLog({ action: `Auto-Mute (${muteRes.durationText})`, moderatorId: modUser.id, targetId: targetMember.id, reason: muteReason });
        await sendLog(guild, 'Auto-Mute (3/3 Warnings)',
            `**User:** ${targetMember.user.tag} (${targetMember.id})\n**Duration:** ${muteRes.durationText}\n**Reason:** ${muteReason}`,
            [], config.COLORS.MUTE || config.COLORS.DANGER).catch(() => {});

        if (channel) {
            const e = plainEmbed(config.COLORS.DANGER, '🔇 You Are Muted',
                `**${targetMember.user.username}** is now muted for **${muteRes.durationText}** (reached **3/3 warnings**).\n\n` +
                `**Reason:** ${reason}\n` +
                `You can create a ticket in <#${appealsChannelId}> to appeal.`);
            await channel.send({ embeds: [e], allowedMentions: NO_PINGS }).catch(() => {});
        }
        return { warnCount: 3, autoMuted: true, durationText: muteRes.durationText };
    }

    if (channel) {
        const e = plainEmbed(config.COLORS.WARNING, `⚠️ Warning (${warnCount}/3)`,
            `**${targetMember.user.username}** has been warned.\n\n**Reason:** ${reason}\n*3 warnings = automatic mute*`);
        const msg = await channel.send({ embeds: [e], allowedMentions: NO_PINGS }).catch(() => null);
        if (msg && options.deleteAfterMs) setTimeout(() => msg.delete().catch(() => {}), options.deleteAfterMs);
    }
    return { warnCount, autoMuted: false };
}

async function checkAndRestoreMutes(client) {
    try {
        const guild = client.guilds.cache.get(config.GUILD_ID);
        if (!guild) return;
        const allMutes = db.getAllMutes();
        if (!allMutes || typeof allMutes !== 'object') return;
        const now = Date.now();
        for (const [userId, muteData] of Object.entries(allMutes)) {
            if (!muteData) continue;
            const expiresAt = typeof muteData === 'object' ? muteData.expiresAt : (typeof muteData === 'number' ? muteData : null);
            if (expiresAt) {
                const remaining = expiresAt - now;
                if (remaining <= 0) {
                    await autoUnmute(guild, userId);
                } else if (!activeTimers.has(userId)) {
                    activeTimers.set(userId, setTimeout(() => autoUnmute(guild, userId), remaining));
                }
            }
        }
    } catch (err) {
        console.error('[MUTE] Error checking expired mutes:', err?.message || err);
    }
}

module.exports = {
    muteUser,
    unmuteUser,
    autoUnmute,
    warnUserAndAutoMute,
    plainEmbed,
    NO_PINGS,
    checkAndRestoreMutes,
    checkExpiredMutes: checkAndRestoreMutes,
};
