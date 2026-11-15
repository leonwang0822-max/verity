// Verity — Spam Detection & Auto-Moderation System
// Warns users 2 times for spamming; on the 3rd offense, applies the Muted role (1532024984267132970)
// for 10 minutes and directs the user to open a ticket in #appeals (1531910360641179768).
// Automatically deletes all recent spammed messages when spam is detected.

const config = require('../config');
const { muteUser } = require('./mute');
const { hasAdmin, hasManager, isOwner, DEV_USER_ID } = require('../utils/permissions');

// Stores message histories: userId -> Array of { timestamp: number, content: string, id: string, channelId: string }
const userMessageHistory = new Map();

// Stores active spam warning records: userId -> { warnings: number, lastWarningTime: number, alertCooldown: number }
const spamWarnings = new Map();

// Configuration
const BURST_MSG_LIMIT = 5; // 5 messages within 3.5 seconds
const BURST_TIME_WINDOW_MS = 3500;

const DUPLICATE_MSG_LIMIT = 3; // 3 duplicate messages within 12 seconds
const DUPLICATE_TIME_WINDOW_MS = 12000;

const WARNING_EXPIRATION_MS = 5 * 60 * 1000; // Warnings reset after 5 minutes without spamming
const MUTE_DURATION_MS = 10 * 60 * 1000; // 10 minutes mute

/**
 * Automatically purges recent spammed messages from the channel.
 */
async function cleanupSpamMessages(message, userId, cleanContent, isBurst) {
    try {
        const fetched = await message.channel.messages.fetch({ limit: 25 }).catch(() => null);
        if (!fetched) {
            await message.delete().catch(() => {});
            return;
        }

        const now = Date.now();
        const toDelete = fetched.filter(m => {
            if (m.author.id !== userId) return false;
            const ageMs = now - m.createdTimestamp;
            if (ageMs > 20000) return false; // within last 20 seconds
            if (isBurst) return true;
            return m.content.trim().toLowerCase() === cleanContent;
        });

        if (toDelete.size === 1) {
            await toDelete.first().delete().catch(() => {});
        } else if (toDelete.size > 1) {
            await message.channel.bulkDelete(toDelete, true).catch(async () => {
                for (const msg of toDelete.values()) {
                    await msg.delete().catch(() => {});
                }
            });
        } else {
            await message.delete().catch(() => {});
        }
    } catch {
        await message.delete().catch(() => {});
    }
}

/**
 * Checks an incoming message for spam and enforces warnings & 10-minute mutes.
 * @param {import('discord.js').Message} message 
 * @returns {Promise<boolean>} True if the message was detected as spam and handled
 */
async function handleSpamDetection(message) {
    if (!message.guild || message.author.bot) return false;


    const userId = message.author.id;
    const now = Date.now();
    const cleanContent = (message.content || '').trim().toLowerCase();

    // 1. Update user message history
    let history = userMessageHistory.get(userId) || [];
    history = history.filter(m => (now - m.timestamp) < 20000);
    history.push({ timestamp: now, content: cleanContent, id: message.id, channelId: message.channel.id });
    userMessageHistory.set(userId, history);

    // 2. Check for spam patterns
    const recentBurst = history.filter(m => (now - m.timestamp) <= BURST_TIME_WINDOW_MS && m.channelId === message.channel.id);
    const isBurstSpam = recentBurst.length >= BURST_MSG_LIMIT;

    let isDuplicateSpam = false;
    if (cleanContent.length > 2) {
        const recentDuplicates = history.filter(
            m => (now - m.timestamp) <= DUPLICATE_TIME_WINDOW_MS && m.content === cleanContent && m.channelId === message.channel.id
        );
        isDuplicateSpam = recentDuplicates.length >= DUPLICATE_MSG_LIMIT;
    }

    if (!isBurstSpam && !isDuplicateSpam) {
        return false;
    }

    // 3. User is spamming — purge spammed messages
    await cleanupSpamMessages(message, userId, cleanContent, isBurstSpam);

    // 4. Manage warnings and penalties
    let userSpamData = spamWarnings.get(userId) || { warnings: 0, lastWarningTime: 0, alertCooldown: 0 };

    // Reset warnings if last warning was long ago
    if (userSpamData.lastWarningTime && (now - userSpamData.lastWarningTime) > WARNING_EXPIRATION_MS) {
        userSpamData.warnings = 0;
    }

    // Prevent double-warning message within 1.5 seconds if user flooded 5 messages in 100ms
    if (userSpamData.alertCooldown && (now - userSpamData.alertCooldown) < 1500) {
        return true;
    }
    userSpamData.alertCooldown = now;

    userSpamData.warnings += 1;
    userSpamData.lastWarningTime = now;
    spamWarnings.set(userId, userSpamData);

    const appealsChannelId = config.APPEALS_CHANNEL_ID || '1531910360641179768';

    if (userSpamData.warnings === 1) {
        // Offense 1: First Warning
        const warnMsg = await message.channel.send({
            content: `⚠️ ${message.author} Please stop spamming! **Warning [1/2]**. If you continue spamming, you will be muted for 10 minutes.`
        }).catch(() => null);

        if (warnMsg) {
            setTimeout(() => warnMsg.delete().catch(() => {}), 6000);
        }
        return true;
    }

    if (userSpamData.warnings === 2) {
        // Offense 2: Final Warning
        const warnMsg = await message.channel.send({
            content: `⚠️ ${message.author} **FINAL WARNING [2/2]**! Stop spamming immediately or you will be muted for 10 minutes!`
        }).catch(() => null);

        if (warnMsg) {
            setTimeout(() => warnMsg.delete().catch(() => {}), 6000);
        }
        return true;
    }

    if (userSpamData.warnings >= 3) {
        // Offense 3: Exceeded 2 warnings -> Apply Muted Role for 10 minutes
        spamWarnings.delete(userId);
        userMessageHistory.delete(userId);

        try {
            await muteUser(
                message.guild,
                message.member,
                MUTE_DURATION_MS,
                'Automated Spam Protection (Exceeded 2 spam warnings)',
                message.client.user
            );

            await message.channel.send({
                content: `🔇 ${message.author} has been **muted for 10 minutes** for continuous spamming.\nIf you believe this is a mistake, please open a ticket in <#${appealsChannelId}> to appeal.`
            }).catch(() => {});
        } catch (err) {
            console.error('[SPAM DETECTION] Failed to mute user:', err);
        }

        return true;
    }

    return true;
}

module.exports = { handleSpamDetection };
