const { SlashCommandBuilder } = require('discord.js');
const { createEmbed } = require('../../utils/embeds');
const { discordTimestamp } = require('../../utils/time');
const config = require('../../config');

module.exports = {
    name: 'userinfo',
    aliases: ['whois', 'ui'],
    description: 'Show detailed user info',
    category: 'staff',
    slashData: new SlashCommandBuilder()
        .setName('userinfo')
        .setDescription('Show detailed user info')
        .addUserOption(option => option.setName('user').setDescription('User to get info about').setRequired(false)),
        
    async execute(message, args, client) {
        const target = message.mentions.members.first() || message.guild.members.cache.get(args[0]) || message.member;
        const embed = this.buildInfoEmbed(target);
        await message.reply({ embeds: [embed] });
    },
    
    async slashExecute(interaction, client) {
        const target = interaction.options.getMember('user') || interaction.member;
        const embed = this.buildInfoEmbed(target);
        await interaction.reply({ embeds: [embed] });
    },
    
    buildInfoEmbed(member) {
        const roles = member.roles.cache.filter(r => r.id !== member.guild.id).sort((a, b) => b.position - a.position).map(r => r.toString());
        const rolesText = roles.length > 0 ? (roles.length > 15 ? roles.slice(0, 15).join(', ') + `... and ${roles.length - 15} more` : roles.join(', ')) : 'None';
        
        return createEmbed(`User Info: ${member.user.tag}`, null, config.COLORS.INFO)
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 512 }))
            .addFields(
                { name: 'ID', value: member.user.id, inline: true },
                { name: 'Nickname', value: member.nickname || 'None', inline: true },
                { name: 'Bot?', value: member.user.bot ? 'Yes' : 'No', inline: true },
                { name: 'Account Created', value: discordTimestamp(member.user.createdAt, 'F'), inline: false },
                { name: 'Joined Server', value: discordTimestamp(member.joinedAt, 'F'), inline: false },
                { name: 'Highest Role', value: member.roles.highest ? member.roles.highest.toString() : 'None', inline: true },
                { name: `Roles [${member.roles.cache.size - 1}]`, value: rolesText, inline: false }
            );
    }
};