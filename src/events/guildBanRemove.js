// LumeBot — Ban Remove Log
const { sendLog } = require('../systems/logging');

module.exports = {
    once: false,
    async execute(client, ban) {
        await sendLog(ban.guild, 'Member Unbanned', null, [
            { name: 'User', value: `${ban.user.tag} (${ban.user.id})`, inline: true },
        ], 0x2ecc71);
    },
};
