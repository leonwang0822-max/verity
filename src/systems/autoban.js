// LumeBot — Auto-Ban Trap Channel System
const { ChannelType, PermissionFlagsBits } = require('discord.js');
const db = require('../database/db');
const config = require('../config');
const { createEmbed } = require('../utils/embeds');
const { sendLog } = require('./logging');
const { hasAdmin, hasManager } = require('../utils/permissions');

function generateRandomName() {
    // Purely random numbers and letters (7 characters, e.g. x8k9m2p)
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 7; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

async function setupAutoBanChannel(guild) {
    const channelName = generateRandomName();

    // Create the honeypot channel
    const channel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        reason: 'Auto-ban honeypot trap channel setup',
        permissionOverwrites: [
            {
                id: guild.id, // @everyone
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
            }
        ]
    });

    const infoEmbed = createEmbed({
        color: config.COLORS.WARNING,
        title: '⚠️ SECURITY TRAP CHANNEL',
        description: 'Do NOT type any messages in this channel.\nThis channel is an automated honeypot trap to detect and ban scam bots.\n\n*Staff members are exempt.*',
        footer: 'LumeBot Automated Protection'
    });
    await channel.send({ embeds: [infoEmbed] }).catch(() => {});

    db.updateSettings({ autoBanChannelId: channel.id });
    return channel;
}

async function rotateAutoBanChannelName(client) {
    const settings = db.getSettings();
    if (!settings.autoBanChannelId) return;

    try {
        const guild = client.guilds.cache.get(config.GUILD_ID);
        if (!guild) return;

        const channel = guild.channels.cache.get(settings.autoBanChannelId) || 
                        await guild.channels.fetch(settings.autoBanChannelId).catch(() => null);

        if (channel) {
            const newName = generateRandomName();
            await channel.setName(newName, 'Daily auto-ban honeypot channel name rotation');
            console.log(`[AUTOBAN] Rotated trap channel name to: #${newName}`);
        }
    } catch (e) {
        console.error('[AUTOBAN] Failed to rotate channel name:', e.message);
    }
}

async function handleAutoBan(message) {
    if (!message.guild) return false;
    const settings = db.getSettings();
    const trapChannelId = settings.autoBanChannelId || '1544154446542409838';

    if (message.channel.id !== trapChannelId) {
        return false;
    }

    // Exemption Check — Staff, Managers, Owners, Admins are safe
    if (hasAdmin(message.member) || hasManager(message.member)) {
        console.log(`[AUTOBAN] Exemption granted for staff member ${message.author.tag}`);
        return true;
    }

    const targetUser = message.author;
    const guild = message.guild;
    const softbanReason = 'Scam Bots Account detected (Softbanned & Purged)';

    // 1. Immediately delete the message
    await message.delete().catch(() => {});

    // 2. Try to DM the user before softban
    try {
        const dmEmbed = createEmbed({
            color: config.COLORS.WARNING,
            title: '🧹 You Have Been Softbanned',
            description: `You were automatically softbanned from **${guild.name}**.\n\n` +
                `• **Reason:** ${softbanReason}\n` +
                `• **Details:** Message posted in security trap channel.`,
            footer: 'LumeBot Automated Security'
        });
        await targetUser.send({ embeds: [dmEmbed] });
    } catch (e) {
        // DM failed
    }

    // 3. Softban (Ban with 7 days message deletion then immediately unban)
    try {
        await guild.members.ban(targetUser.id, { deleteMessageSeconds: 604800, reason: softbanReason });
        await guild.members.unban(targetUser.id, 'Softban honeypot — auto unban');

        db.addModLog({ action: 'SOFTBAN', moderatorId: 'SYSTEM', targetId: targetUser.id, reason: softbanReason });
        sendLog(guild, 'AUTOBAN_SOFTBAN', { moderator: { tag: 'System' }, target: targetUser, reason: softbanReason });
        console.log(`[AUTOBAN] Softbanned & purged bot/scammer ${targetUser.tag} (${targetUser.id})`);
    } catch (err) {
        console.error(`[AUTOBAN] Failed to softban user ${targetUser.id}:`, err.message);
    }

    return true;
}

module.exports = {
    setupAutoBanChannel,
    createAutoBanChannel: setupAutoBanChannel,
    rotateAutoBanChannelName,
    handleAutoBan,
    generateRandomName,
};
