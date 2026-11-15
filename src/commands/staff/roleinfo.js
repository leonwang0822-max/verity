const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, errorEmbed } = require('../../utils/embeds');
const config = require('../../config');

module.exports = {
    name: 'roleinfo',
    aliases: ['ri'],
    description: 'Show role info',
    category: 'staff',
    slashData: new SlashCommandBuilder()
        .setName('roleinfo')
        .setDescription('Show role info')
        .addRoleOption(option => option.setName('role').setDescription('Role to inspect').setRequired(true)),
        
    async execute(message, args, client) {
        const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[0]);
        if (!role) return message.reply({ embeds: [errorEmbed('Please mention a role or provide an ID.')] });
        
        const embed = this.buildInfoEmbed(role);
        await message.reply({ embeds: [embed] });
    },
    
    async slashExecute(interaction, client) {
        const role = interaction.options.getRole('role');
        const embed = this.buildInfoEmbed(role);
        await interaction.reply({ embeds: [embed] });
    },
    
    buildInfoEmbed(role) {
        const perms = role.permissions.toArray();
        const permsText = perms.length > 0 ? (perms.length > 10 ? perms.slice(0, 10).join(', ') + `... and ${perms.length - 10} more` : perms.join(', ')) : 'None';
        
        return createEmbed(`Role Info: ${role.name}`, null, role.color || config.COLORS.INFO)
            .addFields(
                { name: 'ID', value: role.id, inline: true },
                { name: 'Color', value: role.hexColor, inline: true },
                { name: 'Position', value: `${role.position}`, inline: true },
                { name: 'Mentionable', value: role.mentionable ? 'Yes' : 'No', inline: true },
                { name: 'Hoisted', value: role.hoist ? 'Yes' : 'No', inline: true },
                { name: 'Members with Role', value: `${role.members.size}`, inline: true },
                { name: 'Permissions', value: permsText, inline: false }
            );
    }
};