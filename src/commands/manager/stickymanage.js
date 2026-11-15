const { SlashCommandBuilder } = require('discord.js');
const { successEmbed, errorEmbed, createEmbed } = require('../../utils/embeds');
const { hasManager } = require('../../utils/permissions');
const config = require('../../config');
const db = require('../../database/db');

module.exports = {
    name: 'stickymanage',
    aliases: ['stickies', 'liststicky'],
    description: 'List all active sticky messages',
    category: 'manager',
    slashData: new SlashCommandBuilder()
        .setName('stickymanage')
        .setDescription('List all active sticky messages'),
    execute: async (message, args, client) => {
        if (!hasManager(message.member)) return message.reply({ embeds: [errorEmbed('You do not have permission to use this command.')] });
        
        const stickies = db.getAllStickies ? db.getAllStickies() : [];
        if (!stickies || stickies.length === 0) return message.reply({ embeds: [errorEmbed('No active sticky messages found.')] });
        
        const list = stickies.map(s => `<#${s.channelId}>: ${s.content.substring(0, 50)}${s.content.length > 50 ? '...' : ''}`).join('\n');
        
        return message.reply({ embeds: [createEmbed('Sticky Messages', list, config.COLORS.PRIMARY)] });
    },
    slashExecute: async (interaction, client) => {
        if (!hasManager(interaction.member)) return interaction.reply({ embeds: [errorEmbed('You do not have permission to use this command.')], ephemeral: true });
        
        const stickies = db.getAllStickies ? db.getAllStickies() : [];
        if (!stickies || stickies.length === 0) return interaction.reply({ embeds: [errorEmbed('No active sticky messages found.')], ephemeral: true });
        
        const list = stickies.map(s => `<#${s.channelId}>: ${s.content.substring(0, 50)}${s.content.length > 50 ? '...' : ''}`).join('\n');
        
        return interaction.reply({ embeds: [createEmbed('Sticky Messages', list, config.COLORS.PRIMARY)], ephemeral: true });
    }
};
