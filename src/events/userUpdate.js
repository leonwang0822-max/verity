// LumeBot — User Update Log (avatar/username changes)
const { sendLog } = require('../systems/logging');
const config = require('../config');

module.exports = {
    once: false,
    async execute(client, oldUser, newUser) {
        if (oldUser.bot) return;

        const guild = client.guilds.cache.get(config.GUILD_ID);
        if (!guild) return;

        // Username change
        if (oldUser.username !== newUser.username) {
            await sendLog(guild, 'Username Changed', null, [
                { name: 'User', value: `${newUser} (${newUser.id})`, inline: true },
                { name: 'Before', value: oldUser.username, inline: true },
                { name: 'After', value: newUser.username, inline: true },
            ], 0x3498db);
        }

        // Avatar change
        if (oldUser.avatar !== newUser.avatar) {
            await sendLog(guild, 'Avatar Changed', `${newUser} changed their avatar`, [
                { name: 'User', value: `${newUser} (${newUser.tag})`, inline: true },
                { name: 'Old Avatar', value: oldUser.displayAvatarURL({ dynamic: true }) || 'None', inline: true },
                { name: 'New Avatar', value: newUser.displayAvatarURL({ dynamic: true }) || 'None', inline: true },
            ], 0x9b59b6);
        }
    },
};
