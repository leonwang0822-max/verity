const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { hasManager, canModerate } = require('../../utils/permissions');
const db = require('../../database/db');
const { sendLog } = require('../../systems/logging');
const config = require('../../config');

module.exports = {
    name: 'moveall',
    aliases: ['movevc'],
    description: 'Move all users from one VC to another',
    category: 'staff',
    slashData: new SlashCommandBuilder()
        .setName('moveall')
        .setDescription('Move all users from one VC to another')
        .addChannelOption(option => option.setName('from').setDescription('Source voice channel').setRequired(true).addChannelTypes(ChannelType.GuildVoice))
        .addChannelOption(option => option.setName('to').setDescription('Destination voice channel').setRequired(true).addChannelTypes(ChannelType.GuildVoice))
        .setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers),
        
    async execute(message, args, client) {
        if (!hasManager(message.member) && !canModerate(message.member)) return message.reply({ embeds: [errorEmbed('You do not have permission.')] });
        
        const fromId = args[0]?.replace(/[<#>]/g, '');
        const toId = args[1]?.replace(/[<#>]/g, '');
        
        const fromChannel = message.guild.channels.cache.get(fromId);
        const toChannel = message.guild.channels.cache.get(toId);
        
        if (!fromChannel || !toChannel || fromChannel.type !== ChannelType.GuildVoice || toChannel.type !== ChannelType.GuildVoice) {
            return message.reply({ embeds: [errorEmbed('Please provide valid source and destination voice channels.')] });
        }
        
        let moved = 0;
        for (const [memberId, member] of fromChannel.members) {
            try {
                await member.voice.setChannel(toChannel);
                moved++;
            } catch (e) {}
        }
        
        await message.reply({ embeds: [successEmbed(`Moved ${moved} users from ${fromChannel.name} to ${toChannel.name}.`)] });
        
        db.addModLog({ action: 'MoveAll', moderatorId: message.author.id, targetId: client.user.id, reason: `Moved ${moved} users ${fromChannel.name} -> ${toChannel.name}` });
        sendLog(client, message.guild, 'Bulk Voice Move', `By ${message.author.tag}: ${moved} users from ${fromChannel.name} to ${toChannel.name}`, config.COLORS.MODERATION);
    },
    
    async slashExecute(interaction, client) {
        if (!hasManager(interaction.member) && !canModerate(interaction.member)) return interaction.reply({ embeds: [errorEmbed('You do not have permission.')], ephemeral: true });
        
        const fromChannel = interaction.options.getChannel('from');
        const toChannel = interaction.options.getChannel('to');
        
        let moved = 0;
        for (const [memberId, member] of fromChannel.members) {
            try {
                await member.voice.setChannel(toChannel);
                moved++;
            } catch (e) {}
        }
        
        await interaction.reply({ embeds: [successEmbed(`Moved ${moved} users from ${fromChannel.name} to ${toChannel.name}.`)], ephemeral: true });
        
        db.addModLog({ action: 'MoveAll', moderatorId: interaction.user.id, targetId: client.user.id, reason: `Moved ${moved} users ${fromChannel.name} -> ${toChannel.name}` });
        sendLog(client, interaction.guild, 'Bulk Voice Move', `By ${interaction.user.tag}: ${moved} users from ${fromChannel.name} to ${toChannel.name}`, config.COLORS.MODERATION);
    }
};