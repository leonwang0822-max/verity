// LumeBot — Channel Delete Log
const { sendLog } = require('../systems/logging');

module.exports = {
    once: false,
    async execute(client, channel) {
        if (!channel.guild) return;
        await sendLog(channel.guild, 'Channel Deleted', null, [
            { name: 'Channel', value: channel.name, inline: true },
            { name: 'Type', value: `${channel.type}`, inline: true },
        ], 0xe74c3c);
    },
};
