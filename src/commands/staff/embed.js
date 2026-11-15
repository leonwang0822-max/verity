const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const { hasManager, canModerate, hasAdmin } = require('../../utils/permissions');
const config = require('../../config');
const db = require('../../database/db');
const { sendLog } = require('../../systems/logging');

function parseHexColor(input) {
    if (!input) return config.COLORS.PRIMARY;
    let clean = input.replace('#', '').trim();
    if (/^[0-9A-Fa-f]{6}$/.test(clean)) {
        return parseInt(clean, 16);
    }
    return config.COLORS.PRIMARY;
}

module.exports = {
    name: 'embed',
    aliases: ['createembed', 'builder'],
    description: 'Create and send a custom embed message to a channel.',
    category: 'staff',
    slashData: new SlashCommandBuilder()
        .setName('embed')
        .setDescription('Create a custom embed message.')
        .addChannelOption(option => option.setName('channel').setDescription('Channel to send embed to').setRequired(true))
        .addStringOption(option => option.setName('title').setDescription('Embed title').setRequired(true))
        .addStringOption(option => option.setName('description').setDescription('Embed description').setRequired(true))
        .addStringOption(option => option.setName('color').setDescription('Embed color (e.g. #ff0000 or 3498db)').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
        
    async execute(message, args, client) {
        if (!hasAdmin(message.member) && !hasManager(message.member) && !canModerate(message.member)) {
            return message.reply({ embeds: [errorEmbed('You do not have permission.')] });
        }
        
        const channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[0]);
        if (!channel) return message.reply({ embeds: [errorEmbed('Please mention a valid channel.\nExample: `?embed #general Title | Description | #3498db`')] });
        
        const msgStr = args.slice(1).join(' ');
        if (!msgStr) return message.reply({ embeds: [errorEmbed('Please provide content.\nFormat: `?embed #channel Title | Description | #color`')] });

        const parts = msgStr.split('|').map(s => s.trim());
        const title = parts[0];
        const desc = parts[1] || 'No description provided';
        const color = parseHexColor(parts[2]);
        
        try {
            const embed = createEmbed({
                color,
                title,
                description: desc,
                footer: `Sent by ${message.author.tag}`
            });
            await channel.send({ embeds: [embed] });
            await message.reply({ embeds: [successEmbed(`Embed sent successfully to ${channel}.`)] });
            
            db.addModLog({ action: 'EMBED', moderatorId: message.author.id, targetId: client.user.id, reason: `Embed in #${channel.name}` });
            sendLog(message.guild, 'EMBED', { moderator: message.author, target: client.user, reason: `Sent embed in ${channel}` });
        } catch (e) {
            console.error('[EMBED CMD] Error:', e);
            return message.reply({ embeds: [errorEmbed(`Failed to send embed: ${e.message}`)] });
        }
    },
    
    async slashExecute(interaction, client) {
        if (!hasAdmin(interaction.member) && !hasManager(interaction.member) && !canModerate(interaction.member)) {
            return interaction.reply({ embeds: [errorEmbed('You do not have permission.')], ephemeral: true });
        }
        
        const channel = interaction.options.getChannel('channel');
        const title = interaction.options.getString('title');
        const desc = interaction.options.getString('description');
        const rawColor = interaction.options.getString('color');
        const color = parseHexColor(rawColor);
        
        try {
            const embed = createEmbed({
                color,
                title,
                description: desc,
                footer: `Sent by ${interaction.user.tag}`
            });
            await channel.send({ embeds: [embed] });
            await interaction.reply({ embeds: [successEmbed(`Embed sent successfully to ${channel}.`)], ephemeral: true });
            
            db.addModLog({ action: 'EMBED', moderatorId: interaction.user.id, targetId: client.user.id, reason: `Embed in #${channel.name}` });
            sendLog(interaction.guild, 'EMBED', { moderator: interaction.user, target: client.user, reason: `Sent embed in ${channel}` });
        } catch (e) {
            console.error('[EMBED CMD] Error:', e);
            return interaction.reply({ embeds: [errorEmbed(`Failed to send embed: ${e.message}`)], ephemeral: true });
        }
    }
};