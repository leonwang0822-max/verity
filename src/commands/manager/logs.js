const { SlashCommandBuilder, ChannelType } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { hasManager } = require('../../utils/permissions');
const db = require('../../database/db');

module.exports = {
    name: 'logs',
    aliases: ['setlogs'],
    description: 'Quick set log channel',
    category: 'manager',
    slashData: new SlashCommandBuilder()
        .setName('logs')
        .setDescription('Quick set log channel')
        .addChannelOption(option => option.setName('channel').setDescription('Logs channel').addChannelTypes(ChannelType.GuildText).setRequired(true)),
    execute: async (message, args, client) => {
        if (!hasManager(message.member)) return message.reply({ embeds: [errorEmbed('You do not have permission to use this command.')] });
        
        const channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[0]);
        if (!channel) return message.reply({ embeds: [errorEmbed('Usage: ?logs <channel>')] });
        
        db.updateSettings({ logChannel: channel.id });
        return message.reply({ embeds: [successEmbed(`Log channel set to ${channel}.`)] });
    },
    slashExecute: async (interaction, client) => {
        if (!hasManager(interaction.member)) return interaction.reply({ embeds: [errorEmbed('You do not have permission to use this command.')], ephemeral: true });
        
        const channel = interaction.options.getChannel('channel');
        db.updateSettings({ logChannel: channel.id });
        
        return interaction.reply({ embeds: [successEmbed(`Log channel set to ${channel}.`)], ephemeral: true });
    }
};
