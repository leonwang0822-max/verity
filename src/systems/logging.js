// LumeBot — Logging System
const { createEmbed } = require('../utils/embeds');
const config = require('../config');
const db = require('../database/db');

// Flexible sendLog that accepts multiple call signatures:
// sendLog(guild, title, description, fields, color)
// sendLog(client, guild, 'LOG', title, description)  (subagent format)
async function sendLog(...args) {
    let guild, title, description, fields = [], color = config.COLORS.LOG;

    // Detect which call pattern is being used
    if (args[0] && args[0].channels && args[0].channels.cache) {
        // First arg is a guild object: sendLog(guild, title, description, fields, color)
        [guild, title, description, fields, color] = args;
    } else if (args[1] && args[1].channels && args[1].channels.cache) {
        // Second arg is a guild: sendLog(client, guild, ..., title, description)
        guild = args[1];
        // args[2] might be 'LOG' or category — skip it
        title = args[3] || args[2];
        description = args[4] || args[3];
    } else {
        // Fallback — try first arg as guild
        [guild, title, description, fields, color] = args;
    }

    if (!guild) return;
    if (!fields) fields = [];
    if (!color) color = config.COLORS.LOG;

    // Ensure description is always a string if an object was passed
    if (description && typeof description === 'object' && !Array.isArray(description)) {
        const obj = description;
        let lines = [];
        if (obj.target) lines.push(`**User:** ${obj.target.tag || obj.target}`);
        if (obj.moderator) lines.push(`**Moderator:** ${obj.moderator.tag || obj.moderator}`);
        if (obj.reason) lines.push(`**Reason:** ${obj.reason}`);
        if (obj.newLevel !== undefined) lines.push(`**New Level:** ${obj.newLevel}`);
        description = lines.length > 0 ? lines.join('\n') : JSON.stringify(obj);
    }


    const settings = db.getSettings();
    if (!settings.logChannel) return;

    const channel = guild.channels?.cache?.get(settings.logChannel);
    if (!channel) return;

    const embed = createEmbed({ color, title: `📋 ${title}`, description, fields, footer: `Log ID: ${Date.now().toString(36)}` });

    try {
        await channel.send({ embeds: [embed] });
    } catch (e) {
        console.error('[LOG] Failed to send log:', e.message);
    }
}

module.exports = { sendLog };
