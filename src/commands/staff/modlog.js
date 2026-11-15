const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createEmbed, errorEmbed } = require('../../utils/embeds');
const { hasManager, canModerate } = require('../../utils/permissions');
const config = require('../../config');
const db = require('../../database/db');

module.exports = {
    name: 'modlog',
    aliases: ['modhistory', 'logs'],
    description: 'View mod history for a user',
    category: 'staff',
    slashData: new SlashCommandBuilder()
        .setName('modlog')
        .setDescription('View mod history for a user')
        .addUserOption(option => option.setName('user').setDescription('User to check').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
        
    async execute(message, args, client) {
        if (!hasManager(message.member) && !canModerate(message.member)) return message.reply({ embeds: [errorEmbed('You do not have permission.')] });
        
        const user = message.mentions.users.first() || client.users.cache.get(args[0]);
        if (!user) return message.reply({ embeds: [errorEmbed('Please mention a user or provide an ID.')] });
        
        const embed = this.buildModLogEmbed(user);
        await message.reply({ embeds: [embed] });
    },
    
    async slashExecute(interaction, client) {
        if (!hasManager(interaction.member) && !canModerate(interaction.member)) return interaction.reply({ embeds: [errorEmbed('You do not have permission.')], ephemeral: true });
        
        const user = interaction.options.getUser('user');
        const embed = this.buildModLogEmbed(user);
        await interaction.reply({ embeds: [embed] });
    },
    
    buildModLogEmbed(user) {
        const logs = db.getModLogs(user.id, 10);
        
        if (!logs || logs.length === 0) {
            return createEmbed(`Mod Logs: ${user.tag}`, 'No logs found for this user.', config.COLORS.INFO);
        }
        
        const embed = createEmbed(`Mod Logs: ${user.tag}`, null, config.COLORS.WARNING);
        
        logs.forEach(log => {
            const dateStr = log.timestamp ? `<t:${Math.floor(new Date(log.timestamp).getTime() / 1000)}:R>` : 'Unknown Time';
            embed.addFields({
                name: `${log.action} | ID: ${log.id}`,
                value: `**Moderator:** <@${log.moderatorId}>
**Reason:** ${log.reason}
**Time:** ${dateStr}`,
                inline: false
            });
        });
        
        return embed;
    }
};