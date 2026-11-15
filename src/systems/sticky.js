// LumeBot — Sticky Message System
const db = require('../database/db');

// Re-send the sticky message at the bottom of the channel
async function handleSticky(message) {
    const sticky = db.getSticky(message.channel.id);
    if (!sticky) return;

    // Don't re-send if the last message is the sticky itself
    if (message.id === sticky.messageId) return;

    // Debounce: don't re-send if last sticky was < 3 seconds ago
    if (Date.now() - sticky.lastSent < 3000) return;

    // Delete old sticky message
    try {
        const oldMsg = await message.channel.messages.fetch(sticky.messageId).catch(() => null);
        if (oldMsg) await oldMsg.delete().catch(() => {});
    } catch (e) {}

    // Send new sticky
    try {
        const newMsg = await message.channel.send(`📌 **Sticky Message:**\n${sticky.content}`);
        db.updateStickyMessageId(message.channel.id, newMsg.id);
    } catch (e) {
        console.error('[STICKY] Failed to re-send sticky:', e.message);
    }
}

module.exports = { handleSticky };
