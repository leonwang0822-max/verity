// LumeBot — Auto-Pin System
// Automatically pins images in a specific channel and adds reactions
const config = require('../config');

async function handleAutoPin(message) {
    if (message.channel.id !== config.AUTO_PIN_CHANNEL_ID) return;
    if (message.author.bot) return;

    // Check if the message has any images
    const hasImage = message.attachments.some(a =>
        a.contentType && a.contentType.startsWith('image/')
    ) || message.embeds.some(e => e.image || e.thumbnail);

    if (!hasImage) return;

    try {
        // React with fire emoji first, then thumbs up and thumbs down
        await message.react('🔥');
        await message.react('👍');
        await message.react('👎');

        // Pin the message
        await message.pin();
    } catch (e) {
        console.error('[AUTOPIN] Failed to pin/react:', e.message);
    }
}

module.exports = { handleAutoPin };
