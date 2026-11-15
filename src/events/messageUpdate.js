// LumeBot — Message Update Log
const { sendLog } = require('../systems/logging');

module.exports = {
    once: false,
    async execute(client, oldMessage, newMessage) {
        if (!oldMessage.guild || oldMessage.author?.bot) return;
        if (oldMessage.partial || newMessage.partial) return;
        if (oldMessage.content === newMessage.content) return;

        await sendLog(oldMessage.guild, 'Message Edited', null, [
            { name: 'Author', value: `${oldMessage.author} (${oldMessage.author.tag})`, inline: true },
            { name: 'Channel', value: `${oldMessage.channel}`, inline: true },
            { name: 'Before', value: oldMessage.content?.slice(0, 1024) || '*Empty*' },
            { name: 'After', value: newMessage.content?.slice(0, 1024) || '*Empty*' },
            { name: 'Jump to Message', value: `[Click here](${newMessage.url})` },
        ], 0xf39c12);
    },
};
