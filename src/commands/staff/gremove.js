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

function clearStore() {
    try { fs.writeFileSync(STORE_PATH, '[]', 'utf-8'); } catch (e) {}
}

async function doGlobalRemove(guild, onProgress) {
    const store = loadStore();
    if (store.length === 0) return '⚠️ No global announcement messages to delete. Send one first with `?gannounce`.';

    await onProgress('🗑️ Deleting **' + store.length + '** global announcement messages...');

    let deleted = 0;
    let failed = 0;

    for (const entry of store) {
        try {
            const channel = guild.channels.cache.get(entry.channel_id);
            if (!channel) { failed++; continue; }
            const msg = await channel.messages.fetch(entry.message_id).catch(() => null);
            if (!msg) { failed++; continue; }
            await msg.delete();
            deleted++;
        } catch (e) {
            failed++;
        }
        await new Promise(r => setTimeout(r, 300));
    }

    clearStore();
    return '🗑️ Deleted **' + deleted + '/' + store.length + '** global announcement messages!' +
        (failed > 0 ? '\n⚠️ ' + failed + ' could not be deleted (already gone or no access).' : '');
}

module.exports = {
    name: 'gremove',
    aliases: ['globalremove', 'gdelete', 'globaldelete', 'gannounceremove'],
    description: '(Owner only) Delete all messages sent by the last global announcement.',
    category: 'staff',
    slashData: new SlashCommandBuilder()
        .setName('gremove')
        .setDescription('(Owner only) Delete all messages from the last global announcement.'),

    async execute(message, args, client) {
        if (message.author.id !== OWNER_ID) {
            return message.reply({ embeds: [errorEmbed('❌ Only the server owner can use this command.')] });
        }

        const confirm = await message.reply('⏳ Processing...');
        const result = await doGlobalRemove(
            message.guild,
            async (text) => confirm.edit(text).catch(() => {})
        );
        await confirm.edit({ content: null, embeds: [successEmbed(result)] }).catch(() => {});
    },

    async slashExecute(interaction, client) {
        if (interaction.user.id !== OWNER_ID) {
            return interaction.reply({ embeds: [errorEmbed('❌ Only the server owner can use this command.')], ephemeral: true });
        }

        await interaction.reply({ content: '⏳ Processing...', ephemeral: true });
        const result = await doGlobalRemove(
            interaction.guild,
            async (text) => interaction.editReply(text).catch(() => {})
        );
        await interaction.editReply({ content: null, embeds: [successEmbed(result)] }).catch(() => {});
    }
};
