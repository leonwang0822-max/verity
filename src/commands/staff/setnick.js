const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { hasManager, canModerate } = require('../../utils/permissions');
const db = require('../../database/db');
const { sendLog } = require('../../systems/logging');
const config = require('../../config');

module.exports = {
    name: 'setnick',
    aliases: ['nickname', 'changenick'],
    description: 'Set nickname for a user',
    category: 'staff',
    slashData: new SlashCommandBuilder()
        .setName('setnick')
        .setDescription('Set nickname for a user')
        .addUserOption(option => option.setName('user').setDescription('User to change').setRequired(true))
        .addStringOption(option => option.setName('nickname').setDescription('New nickname (leave empty to reset)').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageNicknames),
        
    async execute(message, args, client) {
        if (!hasManager(message.member) && !canModerate(message.member)) return message.reply({ embeds: [errorEmbed('You do not have permission.')] });
        
        const member = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
        if (!member) return message.reply({ embeds: [errorEmbed('Please mention a valid member.')] });
        
        const nickname = args.slice(1).join(' ');
        
        try {
            await member.setNickname(nickname || null);
            await message.reply({ embeds: [successEmbed(`Nickname for ${member.user.tag} has been ${nickname ? 'changed' : 'reset'}.`)] });
            
            db.addModLog({ action: 'SetNick', moderatorId: message.author.id, targetId: member.id, reason: `New nick: ${nickname || 'None'}` });
            sendLog(client, message.guild, 'Nickname Changed', `${member.user.tag} nickname was changed by ${message.author.tag}`, config.COLORS.MODERATION);
        } catch (e) {
            return message.reply({ embeds: [errorEmbed('Failed to change nickname. Ensure my role is higher.')] });
        }
    },
    
    async slashExecute(interaction, client) {
        if (!hasManager(interaction.member) && !canModerate(interaction.member)) return interaction.reply({ embeds: [errorEmbed('You do not have permission.')], ephemeral: true });
        
        const member = interaction.options.getMember('user');
        if (!member) return interaction.reply({ embeds: [errorEmbed('Member not found.')], ephemeral: true });
        
        const nickname = interaction.options.getString('nickname');
        
        try {
            await member.setNickname(nickname || null);
            await interaction.reply({ embeds: [successEmbed(`Nickname for ${member.user.tag} has been ${nickname ? 'changed' : 'reset'}.`)], ephemeral: true });
            
            db.addModLog({ action: 'SetNick', moderatorId: interaction.user.id, targetId: member.id, reason: `New nick: ${nickname || 'None'}` });
            sendLog(client, interaction.guild, 'Nickname Changed', `${member.user.tag} nickname was changed by ${interaction.user.tag}`, config.COLORS.MODERATION);
        } catch (e) {
            return interaction.reply({ embeds: [errorEmbed('Failed to change nickname. Ensure my role is higher.')], ephemeral: true });
        }
    }
};