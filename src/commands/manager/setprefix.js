const { SlashCommandBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { hasManager } = require('../../utils/permissions');
const db = require('../../database/db');

module.exports = {
    name: 'setprefix',
    aliases: ['prefix'],
    description: 'Change bot prefix',
    category: 'manager',
    slashData: new SlashCommandBuilder()
        .setName('setprefix')
        .setDescription('Change bot prefix')
        .addStringOption(option => option.setName('prefix').setDescription('New prefix (max 5 chars)').setMaxLength(5).setRequired(true)),
    execute: async (message, args, client) => {
        if (!hasManager(message.member)) return message.reply({ embeds: [errorEmbed('You do not have permission to use this command.')] });
        
        const prefix = args[0];
        if (!prefix || prefix.length > 5) return message.reply({ embeds: [errorEmbed('Usage: ?setprefix <prefix> (max 5 chars)')] });
        
        db.updateSettings({ prefix });
        return message.reply({ embeds: [successEmbed(`Prefix updated to \`${prefix}\`.`)] });
    },
    slashExecute: async (interaction, client) => {
        if (!hasManager(interaction.member)) return interaction.reply({ embeds: [errorEmbed('You do not have permission to use this command.')], ephemeral: true });
        
        const prefix = interaction.options.getString('prefix');
        db.updateSettings({ prefix });
        
        return interaction.reply({ embeds: [successEmbed(`Prefix updated to \`${prefix}\`.`)], ephemeral: true });
    }
};
