// LumeBot — Message Delete Log
const { sendLog } = require('../systems/logging');

module.exports = {
    once: false,
    async execute(client, message) {
        if (!message.guild || message.author?.bot) return;
        if (message.partial) return;

        await sendLog(message.guild, 'Message Deleted', null, [
            { name: 'Author', value: `${message.author} (${message.author.tag})`, inline: true },
            { name: 'Channel', value: `${message.channel}`, inline: true },
            { name: 'Content', value: message.content?.slice(0, 1024) || '*No text content*' },
        ], 0xe74c3c);
    },
};
