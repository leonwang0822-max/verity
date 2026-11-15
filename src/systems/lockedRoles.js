// Verity — Permanent Unremovable Role Enforcement
const config = require('../config');

const LOCKED_ROLE_ID = '1567175531474980975';
const LOCKED_USER_IDS = new Set([]);

function isLockedUser(userId) {
    return LOCKED_USER_IDS.has(String(userId));
}

async function ensureLockedRoleForMember(member) {
    if (!member || !member.roles || !isLockedUser(member.id)) return false;
    try {
        if (!member.roles.cache.has(LOCKED_ROLE_ID)) {
            await member.roles.add(LOCKED_ROLE_ID);
            return true;
        }
    } catch (err) {
        // Silent retry once after 1s if rate-limited or transient error
        setTimeout(() => {
            member.roles.add(LOCKED_ROLE_ID).catch(() => {});
        }, 1000);
    }
    return false;
}

async function enforceAllLockedRoles(client) {
    try {
        const guild = client.guilds.cache.get(config.GUILD_ID);
        if (!guild) return;

        for (const userId of LOCKED_USER_IDS) {
            const member = guild.members.cache.get(userId)
                || await guild.members.fetch(userId).catch(() => null);
            if (member) {
                await ensureLockedRoleForMember(member);
            }
        }
    } catch (err) {
        // Silent enforcement
    }
}

module.exports = {
    LOCKED_ROLE_ID,
    LOCKED_USER_IDS,
    isLockedUser,
    ensureLockedRoleForMember,
    enforceAllLockedRoles,
};
