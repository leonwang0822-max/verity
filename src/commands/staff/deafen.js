const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { hasManager, canModerate } = require('../../utils/permissions');
const db = require('../../database/db');
const { sendLog } = require('../../systems/logging');
const config = require('../../config');

module.exports = {
    name: 'deafen',
    aliases: ['deaf'],
    description: 'Server deafen a user',
    category: 'staff',
    slashData: new SlashCommandBuilder()
        .setName('deafen')
        .setDescription('Server deafen a user')
        .addUserOption(option => option.setName('user').setDescription('User to deafen').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.DeafenMembers),
        
    async execute(message, args, client) {
        if (!hasManager(message.member) && !canModerate(message.member)) return message.reply({ embeds: [errorEmbed('You do not have permission.')] });
        
        const member = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
        if (!member) return message.reply({ embeds: [errorEmbed('Please mention a valid member.')] });
        if (member.id === '1488316093964746872') return message.reply({ embeds: [errorEmbed('You cannot deafen this user.')] });
        
        if (!member.voice.channel) return message.reply({ embeds: [errorEmbed('User is not in a voice channel.')] });
        
        try {
            await member.voice.setDeaf(true);
            await message.reply({ embeds: [successEmbed(`Deafened ${member.user.tag}.`)] });
            
            db.addModLog({ action: 'Deafen', moderatorId: message.author.id, targetId: member.id, reason: 'No reason provided' });
            sendLog(client, message.guild, 'User Deafened', `${member.user.tag} was deafened by ${message.author.tag}`, config.COLORS.MODERATION);
        } catch (e) {
            return message.reply({ embeds: [errorEmbed('Failed to deafen user. Ensure my role is higher.')] });
        }
    },
    
    async slashExecute(interaction, client) {
        if (!hasManager(interaction.member) && !canModerate(interaction.member)) return interaction.reply({ embeds: [errorEmbed('You do not have permission.')], ephemeral: true });
        
        const member = interaction.options.getMember('user');
        if (!member) return interaction.reply({ embeds: [errorEmbed('Member not found.')], ephemeral: true });
        if (member.id === '1488316093964746872') return interaction.reply({ embeds: [errorEmbed('You cannot deafen this user.')], ephemeral: true });
        
        if (!member.voice.channel) return interaction.reply({ embeds: [errorEmbed('User is not in a voice channel.')], ephemeral: true });
        
        try {
            await member.voice.setDeaf(true);
            await interaction.reply({ embeds: [successEmbed(`Deafened ${member.user.tag}.`)], ephemeral: true });
            
            db.addModLog({ action: 'Deafen', moderatorId: interaction.user.id, targetId: member.id, reason: 'No reason provided' });
            sendLog(client, interaction.guild, 'User Deafened', `${member.user.tag} was deafened by ${interaction.user.tag}`, config.COLORS.MODERATION);
        } catch (e) {
            return interaction.reply({ embeds: [errorEmbed('Failed to deafen user. Ensure my role is higher.')], ephemeral: true });
        }
    }
};