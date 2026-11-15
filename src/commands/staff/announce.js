const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const { hasManager, canModerate, hasAdmin } = require('../../utils/permissions');
const config = require('../../config');
const { sendLog } = require('../../systems/logging');
const db = require('../../database/db');

module.exports = {
    name: 'announce',
    aliases: ['announcement'],
    description: 'Send an announcement embed to a channel',
    category: 'staff',
    slashData: new SlashCommandBuilder()
        .setName('announce')
        .setDescription('Send an announcement embed to a channel')
        .addChannelOption(option => option.setName('channel').setDescription('Channel to announce in').setRequired(true))
        .addStringOption(option => option.setName('title').setDescription('Announcement title').setRequired(true))
        .addStringOption(option => option.setName('message').setDescription('Announcement message').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
        
    async execute(message, args, client) {
        if (!hasAdmin(message.member) && !hasManager(message.member) && !canModerate(message.member)) {
            return message.reply({ embeds: [errorEmbed('You do not have permission to use this command.')] });
        }
        
        const channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[0]);
        if (!channel) return message.reply({ embeds: [errorEmbed('Please mention a valid channel.\nExample: `?announce #announcements Title | Message`')] });
        
        const msgStr = args.slice(1).join(' ');
        if (!msgStr) return message.reply({ embeds: [errorEmbed('Please provide a message.\nFormat: `?announce #channel Title | Message`')] });

        const parts = msgStr.split('|').map(s => s.trim());
        const title = parts[0];
        const body = parts[1] || parts[0];
        
        try {
            const embed = createEmbed({
                color: config.COLORS.PRIMARY,
                title: `📢 ${title}`,
                description: body,
                footer: `Announcement by ${message.author.tag}`
            });
            await channel.send({ embeds: [embed] });
            await message.reply({ embeds: [successEmbed(`Announcement sent to ${channel}.`)] });
            
            db.addModLog({ action: 'ANNOUNCE', moderatorId: message.author.id, targetId: client.user.id, reason: `Announced in ${channel.name}` });
            sendLog(message.guild, 'ANNOUNCE', { moderator: message.author, target: client.user, reason: `Sent announcement in ${channel}` });
        } catch (e) {
            console.error('[ANNOUNCE CMD] Error:', e);
            return message.reply({ embeds: [errorEmbed(`Failed to send announcement: ${e.message}`)] });
        }
    },
    
    async slashExecute(interaction, client) {
        if (!hasAdmin(interaction.member) && !hasManager(interaction.member) && !canModerate(interaction.member)) {
            return interaction.reply({ embeds: [errorEmbed('You do not have permission.')], ephemeral: true });
        }
        
        const channel = interaction.options.getChannel('channel');
        const title = interaction.options.getString('title');
        const body = interaction.options.getString('message');
        
        try {
            const embed = createEmbed({
                color: config.COLORS.PRIMARY,
                title: `📢 ${title}`,
                description: body,
                footer: `Announcement by ${interaction.user.tag}`
            });
            await channel.send({ embeds: [embed] });
            await interaction.reply({ embeds: [successEmbed(`Announcement sent to ${channel}.`)], ephemeral: true });
            
            db.addModLog({ action: 'ANNOUNCE', moderatorId: interaction.user.id, targetId: client.user.id, reason: `Announced in ${channel.name}` });
            sendLog(interaction.guild, 'ANNOUNCE', { moderator: interaction.user, target: client.user, reason: `Sent announcement in ${channel}` });
        } catch (e) {
            console.error('[ANNOUNCE CMD] Error:', e);
            return interaction.reply({ embeds: [errorEmbed(`Failed to send announcement: ${e.message}`)], ephemeral: true });
        }
    }
};