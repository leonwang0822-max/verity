const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { hasManager, canModerate } = require('../../utils/permissions');
const db = require('../../database/db');
const { sendLog } = require('../../systems/logging');
const config = require('../../config');

module.exports = {
    name: 'undeafen',
    aliases: ['undeaf'],
    description: 'Remove deafen from a user',
    category: 'staff',
    slashData: new SlashCommandBuilder()
        .setName('undeafen')
        .setDescription('Remove deafen from a user')
        .addUserOption(option => option.setName('user').setDescription('User to undeafen').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.DeafenMembers),
        
    async execute(message, args, client) {
        if (!hasManager(message.member) && !canModerate(message.member)) return message.reply({ embeds: [errorEmbed('You do not have permission.')] });
        
        const member = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
        if (!member) return message.reply({ embeds: [errorEmbed('Please mention a valid member.')] });
        
        if (!member.voice.channel) return message.reply({ embeds: [errorEmbed('User is not in a voice channel.')] });
        
        try {
            await member.voice.setDeaf(false);
            await message.reply({ embeds: [successEmbed(`Undeafened ${member.user.tag}.`)] });
            
            db.addModLog({ action: 'Undeafen', moderatorId: message.author.id, targetId: member.id, reason: 'No reason provided' });
            sendLog(client, message.guild, 'User Undeafened', `${member.user.tag} was undeafened by ${message.author.tag}`, config.COLORS.MODERATION);
        } catch (e) {
            return message.reply({ embeds: [errorEmbed('Failed to undeafen user. Ensure my role is higher.')] });
        }
    },
    
    async slashExecute(interaction, client) {
        if (!hasManager(interaction.member) && !canModerate(interaction.member)) return interaction.reply({ embeds: [errorEmbed('You do not have permission.')], ephemeral: true });
        
        const member = interaction.options.getMember('user');
        if (!member) return interaction.reply({ embeds: [errorEmbed('Member not found.')], ephemeral: true });
        
        if (!member.voice.channel) return interaction.reply({ embeds: [errorEmbed('User is not in a voice channel.')], ephemeral: true });
        
        try {
            await member.voice.setDeaf(false);
            await interaction.reply({ embeds: [successEmbed(`Undeafened ${member.user.tag}.`)], ephemeral: true });
            
            db.addModLog({ action: 'Undeafen', moderatorId: interaction.user.id, targetId: member.id, reason: 'No reason provided' });
            sendLog(client, interaction.guild, 'User Undeafened', `${member.user.tag} was undeafened by ${interaction.user.tag}`, config.COLORS.MODERATION);
        } catch (e) {
            return interaction.reply({ embeds: [errorEmbed('Failed to undeafen user. Ensure my role is higher.')], ephemeral: true });
        }
    }
};