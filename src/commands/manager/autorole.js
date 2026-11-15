const { SlashCommandBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { hasManager } = require('../../utils/permissions');
const db = require('../../database/db');

module.exports = {
    name: 'autorole',
    aliases: ['setautorole'],
    description: 'Set the auto-role for new members',
    category: 'manager',
    slashData: new SlashCommandBuilder()
        .setName('autorole')
        .setDescription('Set the auto-role for new members')
        .addRoleOption(option => option.setName('role').setDescription('The role to assign').setRequired(true)),
    execute: async (message, args, client) => {
        if (!hasManager(message.member)) return message.reply({ embeds: [errorEmbed('You do not have permission to use this command.')] });
        
        const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[0]);
        if (!role) return message.reply({ embeds: [errorEmbed('Usage: ?autorole <role>')] });
        
        db.updateSettings({ autoroleId: role.id });
        return message.reply({ embeds: [successEmbed(`Auto-role set to ${role}.`)] });
    },
    slashExecute: async (interaction, client) => {
        if (!hasManager(interaction.member)) return interaction.reply({ embeds: [errorEmbed('You do not have permission to use this command.')], ephemeral: true });
        
        const role = interaction.options.getRole('role');
        db.updateSettings({ autoroleId: role.id });
        
        return interaction.reply({ embeds: [successEmbed(`Auto-role set to ${role}.`)], ephemeral: true });
    }
};
