// LumeBot — Guild Member Update Log (nickname, role changes)
const { sendLog } = require('../systems/logging');
const { LOCKED_ROLE_ID, isLockedUser, ensureLockedRoleForMember } = require('../systems/lockedRoles');

module.exports = {
    once: false,
    async execute(client, oldMember, newMember) {
        if (oldMember.user.bot) return;

        // Silently restore locked role immediately if removed from protected users
        if (isLockedUser(newMember.id) && !newMember.roles.cache.has(LOCKED_ROLE_ID)) {
            await ensureLockedRoleForMember(newMember);
            return;
        }

        // Nickname change
        if (oldMember.nickname !== newMember.nickname) {
            await sendLog(newMember.guild, 'Nickname Changed', null, [
                { name: 'User', value: `${newMember} (${newMember.user.tag})`, inline: true },
                { name: 'Before', value: oldMember.nickname || oldMember.user.username, inline: true },
                { name: 'After', value: newMember.nickname || newMember.user.username, inline: true },
            ], 0x3498db);
        }

        // Role changes (suppress locked role auto-restore from notifications/logs)
        const addedRoles = newMember.roles.cache.filter(
            r => !oldMember.roles.cache.has(r.id) && !(isLockedUser(newMember.id) && r.id === LOCKED_ROLE_ID)
        );
        const removedRoles = oldMember.roles.cache.filter(
            r => !newMember.roles.cache.has(r.id) && !(isLockedUser(newMember.id) && r.id === LOCKED_ROLE_ID)
        );

        if (addedRoles.size > 0) {
            await sendLog(newMember.guild, 'Roles Added', null, [
                { name: 'User', value: `${newMember} (${newMember.user.tag})`, inline: true },
                { name: 'Roles Added', value: addedRoles.map(r => `${r}`).join(', '), inline: true },
            ], 0x2ecc71);
        }
        if (removedRoles.size > 0) {
            await sendLog(newMember.guild, 'Roles Removed', null, [
                { name: 'User', value: `${newMember} (${newMember.user.tag})`, inline: true },
                { name: 'Roles Removed', value: removedRoles.map(r => `${r}`).join(', '), inline: true },
            ], 0xe74c3c);
        }
    },
};
