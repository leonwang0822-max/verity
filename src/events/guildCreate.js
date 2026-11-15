// Verity — Guild Create Event
// Enforces single-server policy: automatically leaves any server that is not 1529735375306883194

const config = require('../config');

module.exports = {
    name: 'guildCreate',
    once: false,
    async execute(client, guild) {
        if (guild.id !== config.GUILD_ID) {
            console.log(`[SECURITY] Auto-leaving unauthorized server "${guild.name}" (${guild.id})`);
            await guild.leave().catch(() => {});
        }
    },
};
