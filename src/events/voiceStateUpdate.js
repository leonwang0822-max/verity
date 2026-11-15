// LumeBot — Voice State Update Log
const { sendLog } = require('../systems/logging');

module.exports = {
    once: false,
    async execute(client, oldState, newState) {
        if (oldState.member?.user.bot) return;
        const guild = newState.guild || oldState.guild;
        const member = newState.member || oldState.member;
        if (!member) return;

        // Joined a voice channel
        if (!oldState.channelId && newState.channelId) {
            await sendLog(guild, 'Voice Join', null, [
                { name: 'User', value: `${member} (${member.user.tag})`, inline: true },
                { name: 'Channel', value: `<#${newState.channelId}>`, inline: true },
            ], 0x2ecc71);
        }
        // Left a voice channel
        else if (oldState.channelId && !newState.channelId) {
            await sendLog(guild, 'Voice Leave', null, [
                { name: 'User', value: `${member} (${member.user.tag})`, inline: true },
                { name: 'Channel', value: `<#${oldState.channelId}>`, inline: true },
            ], 0xe74c3c);
        }
        // Moved between channels
        else if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
            await sendLog(guild, 'Voice Move', null, [
                { name: 'User', value: `${member} (${member.user.tag})`, inline: true },
                { name: 'From', value: `<#${oldState.channelId}>`, inline: true },
                { name: 'To', value: `<#${newState.channelId}>`, inline: true },
            ], 0xf39c12);
        }
    },
};
