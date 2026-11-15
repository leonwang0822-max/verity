// Verity — Bot Presence Manager
const { ActivityType } = require('discord.js');
const db = require('../database/db');

function updateBotPresence(client) {
    if (!client || !client.user) return;

    const settings = db.getSettings();
    const typeStr = settings.activityType || 'Watching';
    const textStr = settings.activityText || "Lumenarch's Server";

    const typeMap = {
        Watching: ActivityType.Watching,
        Playing: ActivityType.Playing,
        Listening: ActivityType.Listening,
        Competing: ActivityType.Competing,
    };

    const activityType = typeMap[typeStr] || ActivityType.Watching;

    client.user.setPresence({
        activities: [{ name: textStr, type: activityType }],
        status: 'online',
    });

    console.log(`[BOT] Updated presence: ${typeStr} ${textStr}`);
}

module.exports = { updateBotPresence };
