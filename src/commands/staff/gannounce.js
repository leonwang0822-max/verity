const { SlashCommandBuilder } = require('discord.js');
const { errorEmbed, successEmbed } = require('../../utils/embeds');
const fs = require('fs');
const path = require('path');

const OWNER_ID = '1488316093964746872';
const STORE_PATH = path.join(__dirname, '../../data/global_announce_store.json');

function loadStore() {
    try {
        if (fs.existsSync(STORE_PATH)) return JSON.parse(fs.readFileSync(STORE_PATH, 'utf-8'));
    } catch (e) {}
    return [];
}

function saveStore(data) {
    fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
    fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

async function doGlobalAnnounce(guild, content, attachment, onProgress) {
    const channels = guild.channels.cache.filter(c => c.type === 0 || c.type === 5);
    const sent = [];
    const failed = [];

    await onProgress('📡 Sending global announcement to **' + channels.size + '** channels...');

    for (const [, channel] of channels) {
        try {
            const payload = {};
            if (content) payload.content = content;
            if (attachment) payload.files = [{ attachment: attachment.url, name: attachment.name || 'announcement.png' }];

            const msg = await channel.send(payload);
            sent.push({ channel_id: channel.id, channel_name: channel.name, message_id: msg.id });
        } catch (e) {
            failed.push(channel.name);
        }
        await new Promise(r => setTimeout(r, 350));
    }

    saveStore(sent);

    let summary = '✅ Global announcement sent to **' + sent.length + '** channels!';
    if (failed.length > 0) {
        summary += '\n⚠️ Failed in ' + failed.length + ' channels: ' + failed.slice(0, 5).join(', ') + (failed.length > 5 ? '...' : '');
    }
    summary += '\n\nUse `?gremove` or `/gremove` to delete all these messages.';
    return summary;
}

module.exports = {
    name: 'gannounce',
    aliases: ['gannouce', 'globalannounce', 'globalannouce', 'gannouncement'],
    description: '(Owner only) Send a global announcement to every channel.',
    category: 'staff',
    slashData: new SlashCommandBuilder()
        .setName('gannounce')
        .setDescription('(Owner only) Send a global announcement to every channel.')
        .addStringOption(o => o.setName('message').setDescription('Text to send (optional if sending image)').setRequired(false))
        .addAttachmentOption(o => o.setName('image').setDescription('Image to send (optional)').setRequired(false)),

    async execute(message, args, client) {
        if (message.author.id !== OWNER_ID) {
            return message.reply({ embeds: [errorEmbed('❌ Only the server owner can use this command.')] });
        }

        const content = args.join(' ').trim() || null;
        const attachment = message.attachments.first() || null;

        if (!content && !attachment) {
            return message.reply({ embeds: [errorEmbed('Please provide text and/or attach an image.\nExample: `?gannounce Hello everyone!` or attach an image.')] });
        }

        const attachmentData = attachment ? { url: attachment.url, name: attachment.name } : null;
        const confirm = await message.reply('⏳ Starting global announcement...');

        const summary = await doGlobalAnnounce(
            message.guild, content, attachmentData,
            async (text) => confirm.edit(text).catch(() => {})
        );
        await confirm.edit({ content: null, embeds: [successEmbed(summary)] }).catch(() => {});
    },

    async slashExecute(interaction, client) {
        if (interaction.user.id !== OWNER_ID) {
            return interaction.reply({ embeds: [errorEmbed('❌ Only the server owner can use this command.')], ephemeral: true });
        }

        const content = interaction.options.getString('message') || null;
        const attachment = interaction.options.getAttachment('image') || null;

        if (!content && !attachment) {
            return interaction.reply({ embeds: [errorEmbed('Please provide text and/or an image attachment.')], ephemeral: true });
        }

        await interaction.reply({ content: '⏳ Starting global announcement...', ephemeral: true });

        const attachmentData = attachment ? { url: attachment.url, name: attachment.name } : null;
        const summary = await doGlobalAnnounce(
            interaction.guild, content, attachmentData,
            async (text) => interaction.editReply(text).catch(() => {})
        );
        await interaction.editReply({ content: null, embeds: [successEmbed(summary)] }).catch(() => {});
    }
};
