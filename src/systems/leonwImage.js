// Verity — LeonW Media System
const fs = require('fs');
const path = require('path');
const { AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');

const ALLOWED_USER_IDS = ['1488316093964746872'];

function isAuthorized(userId) {
    return ALLOWED_USER_IDS.includes(userId);
}

function getLeonwImagePath() {
    const metaCandidates = [
        path.resolve(__dirname, '../../data/leonw_meta.json'),
        '/opt/verity-bot/data/leonw_meta.json'
    ];
    for (const mp of metaCandidates) {
        if (fs.existsSync(mp)) {
            try {
                const meta = JSON.parse(fs.readFileSync(mp, 'utf8'));
                if (meta.filePath && fs.existsSync(meta.filePath)) {
                    return meta.filePath;
                }
            } catch (e) {}
        }
    }

    const candidatePaths = [
        path.resolve(__dirname, '../../data/leonwedits.mp4'),
        '/opt/verity-bot/data/leonwedits.mp4',
        '/var/www/raven/leonwedits.mp4',
        'C:/Users/leonw/Desktop/Projects/Verity Discord Bot/data/leonwedits.mp4',
        path.resolve(__dirname, '../../data/leonw.png'),
        '/opt/verity-bot/data/leonw.png'
    ];
    for (const p of candidatePaths) {
        if (fs.existsSync(p)) return p;
    }
    const defaultPath = path.resolve(__dirname, '../../data/leonwedits.mp4');
    const dir = path.dirname(defaultPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return defaultPath;
}

function getLeonwButtonRow() {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('leonw_change_image')
            .setLabel('Change Image')
            .setStyle(ButtonStyle.Primary)
    );
}

function getExtensionFromUrl(url, fallback = '.mp4') {
    try {
        const pathname = new URL(url).pathname;
        const m = pathname.match(/\.(mp4|mov|webm|png|jpe?g|webp|gif)$/i);
        if (m) return '.' + m[1].toLowerCase();
    } catch (e) {}
    return fallback;
}

async function saveLeonwImage(imageUrl) {
    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length === 0) throw new Error('Empty media');

    const ext = getExtensionFromUrl(imageUrl, '.mp4');
    const fileName = ext === '.mp4' ? 'leonwedits.mp4' : `leonw${ext}`;

    const dirs = [
        path.resolve(__dirname, '../../data'),
        '/opt/verity-bot/data',
        '/var/www/raven'
    ];

    let savedPath = null;
    for (const dir of dirs) {
        try {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            const fullPath = path.join(dir, fileName);
            fs.writeFileSync(fullPath, buffer);
            try { fs.chmodSync(fullPath, 0o644); } catch (e) {}
            if (!savedPath) savedPath = fullPath;

            if (dir.includes('data')) {
                fs.writeFileSync(path.join(dir, 'leonw_meta.json'), JSON.stringify({ filePath: fullPath, fileName }), 'utf8');
            }
        } catch (e) {}
    }

    return { buffer, fileName };
}

const activeCollectors = new Set();

async function handleLeonwButton(client, interaction) {
    if (!isAuthorized(interaction.user.id)) {
        return interaction.reply({
            content: '❌ You cannot change this media.',
            flags: MessageFlags.Ephemeral
        }).catch(() => {});
    }

    if (interaction.replied || interaction.deferred) return;

    if (activeCollectors.has(interaction.user.id)) {
        return interaction.reply({
            content: 'Already waiting for media. Please send it in this channel.',
            flags: MessageFlags.Ephemeral
        }).catch(() => {});
    }

    activeCollectors.add(interaction.user.id);

    await interaction.reply({
        content: 'Send the new image or video.',
        flags: MessageFlags.Ephemeral
    }).catch(() => {});

    const msgFilter = m => m.author.id === interaction.user.id && (
        m.attachments.some(att =>
            att.contentType?.startsWith('image/') ||
            att.contentType?.startsWith('video/') ||
            /\.(mp4|mov|webm|png|jpe?g|webp|gif)$/i.test(att.name)
        ) ||
        /^https?:\/\/.*\.(mp4|mov|webm|png|jpe?g|webp|gif)/i.test(m.content.trim())
    );

    const collector = interaction.channel.createMessageCollector({
        filter: msgFilter,
        time: 60_000,
        max: 1
    });

    collector.on('collect', async (imgMsg) => {
        activeCollectors.delete(interaction.user.id);
        try {
            const att = imgMsg.attachments.find(a =>
                a.contentType?.startsWith('image/') ||
                a.contentType?.startsWith('video/') ||
                /\.(mp4|mov|webm|png|jpe?g|webp|gif)$/i.test(a.name)
            );
            const url = att ? att.url : imgMsg.content.trim();

            const { buffer, fileName } = await saveLeonwImage(url);
            const newAttachment = new AttachmentBuilder(buffer, { name: fileName });
            const row = getLeonwButtonRow();

            if (interaction.message) {
                await interaction.message.edit({
                    files: [newAttachment],
                    components: [row]
                }).catch(() => {});
            }

            imgMsg.delete().catch(() => {});
            interaction.followUp({ content: 'Updated.', flags: MessageFlags.Ephemeral }).catch(() => {});
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
    getLeonwImagePath,
    getLeonwButtonRow,
    saveLeonwImage,
    handleLeonwButton
};
