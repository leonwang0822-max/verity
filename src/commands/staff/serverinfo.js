const { SlashCommandBuilder } = require('discord.js');
const { createEmbed } = require('../../utils/embeds');
const { discordTimestamp } = require('../../utils/time');
const config = require('../../config');

module.exports = {
    name: 'serverinfo',
    aliases: ['si', 'guildinfo'],
    description: 'Show server statistics',
    category: 'staff',
    slashData: new SlashCommandBuilder()
        .setName('serverinfo')
        .setDescription('Show server statistics'),
        
    async execute(message, args, client) {
        const embed = await this.buildInfoEmbed(message.guild);
        await message.reply({ embeds: [embed] });
    },
    
    async slashExecute(interaction, client) {
        const embed = await this.buildInfoEmbed(interaction.guild);
        await interaction.reply({ embeds: [embed] });
    },
    
    async buildInfoEmbed(guild) {
        const owner = await guild.fetchOwner();
        
        const embed = createEmbed(`Server Info: ${guild.name}`, null, config.COLORS.INFO)
            .addFields(
                { name: 'ID', value: guild.id, inline: true },
                { name: 'Owner', value: `${owner.user.tag} (${owner.id})`, inline: true },
                { name: 'Created At', value: discordTimestamp(guild.createdAt, 'F'), inline: false },
                { name: 'Members', value: `${guild.memberCount}`, inline: true },
                { name: 'Channels', value: `${guild.channels.cache.size}`, inline: true },
                { name: 'Roles', value: `${guild.roles.cache.size}`, inline: true },
                { name: 'Boost Level', value: `${guild.premiumTier}`, inline: true },
                { name: 'Boosts', value: `${guild.premiumSubscriptionCount || 0}`, inline: true }
            );
            
        if (guild.iconURL()) embed.setThumbnail(guild.iconURL({ dynamic: true, size: 512 }));
        
        return embed;
    }
};