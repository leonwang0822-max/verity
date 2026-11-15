// LumeBot — Ban Add Log
const { sendLog } = require('../systems/logging');

module.exports = {
    once: false,
    async execute(client, ban) {
        await sendLog(ban.guild, 'Member Banned', null, [
            { name: 'User', value: `${ban.user.tag} (${ban.user.id})`, inline: true },
            { name: 'Reason', value: ban.reason || 'No reason provided', inline: true },
        ], 0xe74c3c);
    },
};
