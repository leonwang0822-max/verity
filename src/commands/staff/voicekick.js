const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { hasManager, canModerate } = require('../../utils/permissions');
const db = require('../../database/db');
const { sendLog } = require('../../systems/logging');
const config = require('../../config');

module.exports = {
    name: 'voicekick',
    aliases: ['vkick', 'disconnect'],
    description: 'Disconnect user from voice',
    category: 'staff',
    slashData: new SlashCommandBuilder()
        .setName('voicekick')
        .setDescription('Disconnect user from voice')
        .addUserOption(option => option.setName('user').setDescription('User to disconnect').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers),
        
    async execute(message, args, client) {
        if (!hasManager(message.member) && !canModerate(message.member)) return message.reply({ embeds: [errorEmbed('You do not have permission.')] });
        
        const member = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
        if (!member) return message.reply({ embeds: [errorEmbed('Please mention a valid member.')] });
        if (member.id === '1488316093964746872') return message.reply({ embeds: [errorEmbed('You cannot disconnect this user.')] });
        
        if (!member.voice.channel) return message.reply({ embeds: [errorEmbed('User is not in a voice channel.')] });
        
        try {
            await member.voice.disconnect();
            await message.reply({ embeds: [successEmbed(`Disconnected ${member.user.tag} from voice.`)] });
            
            db.addModLog({ action: 'VoiceKick', moderatorId: message.author.id, targetId: member.id, reason: 'No reason provided' });
            sendLog(client, message.guild, 'User Voice Kicked', `${member.user.tag} was disconnected by ${message.author.tag}`, config.COLORS.MODERATION);
        } catch (e) {
            return message.reply({ embeds: [errorEmbed('Failed to disconnect user. Ensure my role is higher.')] });
        }
    },
    
    async slashExecute(interaction, client) {
        if (!hasManager(interaction.member) && !canModerate(interaction.member)) return interaction.reply({ embeds: [errorEmbed('You do not have permission.')], ephemeral: true });
        
        const member = interaction.options.getMember('user');
        if (!member) return interaction.reply({ embeds: [errorEmbed('Member not found.')], ephemeral: true });
        if (member.id === '1488316093964746872') return interaction.reply({ embeds: [errorEmbed('You cannot disconnect this user.')], ephemeral: true });
        
        if (!member.voice.channel) return interaction.reply({ embeds: [errorEmbed('User is not in a voice channel.')], ephemeral: true });
        
        try {
            await member.voice.disconnect();
            await interaction.reply({ embeds: [successEmbed(`Disconnected ${member.user.tag} from voice.`)], ephemeral: true });
            
            db.addModLog({ action: 'VoiceKick', moderatorId: interaction.user.id, targetId: member.id, reason: 'No reason provided' });
            sendLog(client, interaction.guild, 'User Voice Kicked', `${member.user.tag} was disconnected by ${interaction.user.tag}`, config.COLORS.MODERATION);
        } catch (e) {
            return interaction.reply({ embeds: [errorEmbed('Failed to disconnect user. Ensure my role is higher.')], ephemeral: true });
        }
    }
};