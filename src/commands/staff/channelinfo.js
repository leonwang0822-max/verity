const { SlashCommandBuilder, ChannelType } = require('discord.js');
const { createEmbed } = require('../../utils/embeds');
const { discordTimestamp } = require('../../utils/time');
const config = require('../../config');

module.exports = {
    name: 'channelinfo',
    aliases: ['ci'],
    description: 'Show channel info',
    category: 'staff',
    slashData: new SlashCommandBuilder()
        .setName('channelinfo')
        .setDescription('Show channel info')
        .addChannelOption(option => option.setName('channel').setDescription('Channel to inspect').setRequired(false)),
        
    async execute(message, args, client) {
        const channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[0]) || message.channel;
        const embed = this.buildInfoEmbed(channel);
        await message.reply({ embeds: [embed] });
    },
    
    async slashExecute(interaction, client) {
        const channel = interaction.options.getChannel('channel') || interaction.channel;
        const embed = this.buildInfoEmbed(channel);
        await interaction.reply({ embeds: [embed] });
    },
    
    buildInfoEmbed(channel) {
        let typeStr = 'Unknown';
        if (channel.type === ChannelType.GuildText) typeStr = 'Text';
        else if (channel.type === ChannelType.GuildVoice) typeStr = 'Voice';
        else if (channel.type === ChannelType.GuildCategory) typeStr = 'Category';
        else if (channel.type === ChannelType.GuildAnnouncement) typeStr = 'Announcement';
        else if (channel.type === ChannelType.GuildForum) typeStr = 'Forum';
        
        const embed = createEmbed(`Channel Info: ${channel.name}`, null, config.COLORS.INFO)
            .addFields(
                { name: 'ID', value: channel.id, inline: true },
                { name: 'Type', value: typeStr, inline: true },
                { name: 'Created At', value: discordTimestamp(channel.createdAt, 'F'), inline: false },
                { name: 'NSFW', value: channel.nsfw ? 'Yes' : 'No', inline: true }
            );
            
        if (channel.type === ChannelType.GuildText || channel.type === ChannelType.GuildForum || channel.type === ChannelType.GuildVoice) {
            embed.addFields(
                { name: 'Slowmode', value: `${channel.rateLimitPerUser || 0} seconds`, inline: true },
                { name: 'Topic', value: channel.topic || 'None', inline: false }
            );
        }
        
        return embed;
    }
};