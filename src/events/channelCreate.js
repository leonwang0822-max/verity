// LumeBot — Channel Create/Delete Logs
const { sendLog } = require('../systems/logging');

module.exports = {
    once: false,
    async execute(client, channel) {
        if (!channel.guild) return;
        await sendLog(channel.guild, 'Channel Created', null, [
            { name: 'Channel', value: `${channel} (${channel.name})`, inline: true },
            { name: 'Type', value: `${channel.type}`, inline: true },
        ], 0x2ecc71);
    },
};
