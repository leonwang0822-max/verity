// LumeBot — Welcome System
const { AttachmentBuilder } = require('discord.js');
const { createEmbed } = require('../utils/embeds');
const config = require('../config');
const db = require('../database/db');
const path = require('path');
const fs = require('fs');

async function sendWelcome(member) {
    const settings = db.getSettings();
    if (!settings.welcomeChannel) return;

    const channel = member.guild.channels.cache.get(settings.welcomeChannel);
    if (!channel) return;

    const embed = createEmbed({
        color: config.COLORS.WELCOME,
        title: "Welcome to Lumenarch's Lounge!",
        description: [
            '📋 | Read Rules before engaging with others!',
            '<#1530836479398514831> - Click me to read the rules!',
            '',
            '📰 | If you are confused about anything.',
            'Read our FAQ before asking for something in general or opening a ticket, since It might be listed in the FAQ already.',
            '<#1529772659137712198>',
        ].join('\n'),
        footer: 'Thank you for Joining :)',
    });

    // Check for welcome image
    const imagePath = path.join(__dirname, '..', '..', 'welcome.png');
    const files = [];
    if (fs.existsSync(imagePath)) {
        const attachment = new AttachmentBuilder(imagePath, { name: 'welcome.png' });
        embed.setImage('attachment://welcome.png');
        files.push(attachment);
    }

    try {
        await channel.send({
            content: `${member}, welcome to Lume's Realm`,
            embeds: [embed],
            files,
        });
    } catch (e) {
        console.error('[WELCOME] Failed to send welcome:', e.message);
    }
}

module.exports = { sendWelcome };
