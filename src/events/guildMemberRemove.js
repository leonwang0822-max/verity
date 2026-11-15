// LumeBot — Guild Member Remove Log
const { sendLog } = require('../systems/logging');

module.exports = {
    once: false,
    async execute(client, member) {
        if (member.user.bot) return;

        await sendLog(member.guild, 'Member Left', null, [
            { name: 'User', value: `${member.user.tag} (${member.user.id})`, inline: true },
            { name: 'Roles', value: member.roles.cache.filter(r => r.id !== member.guild.id).map(r => `${r}`).join(', ') || 'None', inline: false },
            { name: 'Member Count', value: `${member.guild.memberCount}`, inline: true },
        ], 0xe74c3c);
    },
};
