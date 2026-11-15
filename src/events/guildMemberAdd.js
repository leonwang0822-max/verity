// LumeBot — Guild Member Add Event (welcome + autorole)
const { sendWelcome } = require('../systems/welcome');
const { ensureLockedRoleForMember } = require('../systems/lockedRoles');
const db = require('../database/db');

module.exports = {
    once: false,
    async execute(client, member) {
        if (member.user.bot) return;

        // Silently ensure locked role if this is a protected user
        await ensureLockedRoleForMember(member);

        // Send welcome message
        await sendWelcome(member);

        // Auto-role
        const settings = db.getSettings();
        if (settings.autoroleId) {
            try {
                const role = member.guild.roles.cache.get(settings.autoroleId);
                if (role && member.guild.members.me.roles.highest.position > role.position) {
                    await member.roles.add(role);
                }
            } catch (e) {
                console.error('[AUTOROLE] Failed to add autorole:', e.message);
            }
        }

        // Auto-sync all roles from previous server (Announcement pings, levels, etc.)
        try {
            const { syncMemberRoles } = require('../systems/roleSync');
            await syncMemberRoles(member);
        } catch (e) {
            console.error('[ROLE SYNC] Error syncing member roles on join:', e.message);
        }

        // Log
        const { sendLog } = require('../systems/logging');
        await sendLog(member.guild, 'Member Joined', `${member} ${member.user.tag}`, [
            { name: 'Account Created', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true },
            { name: 'Member Count', value: `${member.guild.memberCount}`, inline: true },
        ], 0x2ecc71);
    },
};
