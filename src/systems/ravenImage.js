// Verity — Raven Image System
const fs = require('fs');
const path = require('path');
const { AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');

const ALLOWED_USER_IDS = ['948379389131898901', '1488316093964746872'];

function isAuthorized(userId) {
    return ALLOWED_USER_IDS.includes(userId);
}

function getRavenImagePath() {
    const candidatePaths = [
        path.resolve(__dirname, '../../data/raven.png'),
        '/opt/verity-bot/data/raven.png',
        '/var/www/raven/raven.png',
        'C:/Users/leonw/Desktop/Projects/Verity Discord Bot/data/raven.png'
    ];
    for (const p of candidatePaths) {
        if (fs.existsSync(p)) return p;
    }
    const defaultPath = path.resolve(__dirname, '../../data/raven.png');
    const dir = path.dirname(defaultPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return defaultPath;
}

function getRavenButtonRow() {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('raven_change_image')
            .setLabel('Change Image')
            .setStyle(ButtonStyle.Primary)
    );
}

async function saveRavenImage(imageUrl) {
    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length === 0) throw new Error('Empty image');

    const pathsToUpdate = [
        path.resolve(__dirname, '../../data/raven.png'),
        '/opt/verity-bot/data/raven.png',
        '/var/www/raven/raven.png'
    ];

    for (const p of pathsToUpdate) {
        try {
            const dir = path.dirname(p);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(p, buffer);
            try { fs.chmodSync(p, 0o644); } catch (e) {}
        } catch (e) {}
    }

    return buffer;
}

const activeCollectors = new Set();

async function handleRavenButton(client, interaction) {
    if (!isAuthorized(interaction.user.id)) {
        return interaction.reply({
            content: '❌ You cannot change this image.',
            flags: MessageFlags.Ephemeral
        }).catch(() => {});
    }

    if (interaction.replied || interaction.deferred) return;

    if (activeCollectors.has(interaction.user.id)) {
        return interaction.reply({
            content: 'Already waiting for an image. Please send it in this channel.',
            flags: MessageFlags.Ephemeral
        }).catch(() => {});
    }

    activeCollectors.add(interaction.user.id);

    await interaction.reply({
        content: 'Send the new image.',
        flags: MessageFlags.Ephemeral
    }).catch(() => {});

    const msgFilter = m => m.author.id === interaction.user.id && (
        m.attachments.some(att => att.contentType?.startsWith('image/') || /\.(png|jpe?g|webp|gif)$/i.test(att.name)) ||
        /^https?:\/\/.*\.(png|jpe?g|webp|gif)/i.test(m.content.trim())
    );

    const collector = interaction.channel.createMessageCollector({
        filter: msgFilter,
        time: 60_000,
        max: 1
    });

    collector.on('collect', async (imgMsg) => {
        activeCollectors.delete(interaction.user.id);
        try {
            const att = imgMsg.attachments.find(a => a.contentType?.startsWith('image/') || /\.(png|jpe?g|webp|gif)$/i.test(a.name));
            const url = att ? att.url : imgMsg.content.trim();

            const buffer = await saveRavenImage(url);
            const newAttachment = new AttachmentBuilder(buffer, { name: 'raven.png' });
            const row = getRavenButtonRow();

            if (interaction.message) {
                await interaction.message.edit({
                    files: [newAttachment],
                    components: [row]
                }).catch(() => {});
            }

            imgMsg.delete().catch(() => {});
            interaction.followUp({ content: 'Image updated.', flags: MessageFlags.Ephemeral }).catch(() => {});
        } catch (err) {
            interaction.followUp({ content: `Failed: ${err.message}`, flags: MessageFlags.Ephemeral }).catch(() => {});
        }
    });

    collector.on('end', () => {
        activeCollectors.delete(interaction.user.id);
    });
}

module.exports = {
    ALLOWED_USER_IDS,
    isAuthorized,
    getRavenImagePath,
    getRavenButtonRow,
    saveRavenImage,
    handleRavenButton
};
