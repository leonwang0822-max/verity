// LumeBot — Occasional Donation Reminder Helper
let lastDonationReminderTime = 0;
let botInteractionCount = 0;

const REMINDER_COOLDOWN_MS = 20 * 60 * 1000; // 20 minutes minimum cooldown between reminders
const MIN_INTERACTIONS = 15; // Requires at least 15 active bot uses before reminder can trigger

/**
 * Triggers occasional donation reminder during active bot usage
 * @param {import('discord.js').TextBasedChannel} channel 
 */
async function checkAndTriggerDonationReminder(channel) {
    if (!channel || typeof channel.send !== 'function') return;

    botInteractionCount++;

    const now = Date.now();
    const timeElapsed = now - lastDonationReminderTime;

    if (botInteractionCount >= MIN_INTERACTIONS && timeElapsed >= REMINDER_COOLDOWN_MS) {
        // 15% random chance to trigger so it feels natural and not spammy
        if (Math.random() < 0.15) {
            botInteractionCount = 0;
            lastDonationReminderTime = now;

            try {
                const msg = await channel.send(
                    `💖 Please consider donating to me! Hosting the servers to host the Verity Bot requires a lot of money.\n👉 **Donate here:** https://leonw.store/donate/1`
                );

                // Automatically delete this message after 5 seconds
                setTimeout(() => {
                    msg.delete().catch(() => {});
                }, 5000);
            } catch (e) {
                // Ignore send/delete errors
            }
        }
    }
}

module.exports = {
    checkAndTriggerDonationReminder
};
