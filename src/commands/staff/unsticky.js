const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { hasManager } = require('../../utils/permissions');
const db = require('../../database/db');
const { sendLog } = require('../../systems/logging');
const config = require('../../config');

module.exports = {
    name: 'unsticky',
    aliases: ['unstick'],
    description: 'Remove the sticky message from the current channel',
    category: 'staff',
    slashData: new SlashCommandBuilder()
        .setName('unsticky')
        .setDescription('Remove the sticky message from the current channel')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
        
    async execute(message, args, client) {
        if (!hasManager(message.member)) return message.reply({ embeds: [errorEmbed('You do not have permission.')] });
        
        const sticky = db.getSticky(message.channel.id);
        if (!sticky) return message.reply({ embeds: [errorEmbed('No sticky message in this channel.')] });
        
        try {
            if (sticky.messageId) {
                const msg = await message.channel.messages.fetch(sticky.messageId).catch(() => null);
                if (msg) await msg.delete();
            }
        } catch(e) {}
        
        db.removeSticky(message.channel.id);
        await message.reply({ embeds: [successEmbed('Sticky message removed.')] });
        
        db.addModLog({ action: 'Unsticky', moderatorId: message.author.id, targetId: client.user.id, reason: `Unsticky in ${message.channel.name}` });
        sendLog(client, message.guild, 'Sticky Removed', `By ${message.author.tag} in ${message.channel.name}`, config.COLORS.INFO);
    },
    
    async slashExecute(interaction, client) {
        if (!hasManager(interaction.member)) return interaction.reply({ embeds: [errorEmbed('You do not have permission.')], ephemeral: true });
        
        const sticky = db.getSticky(interaction.channel.id);
        if (!sticky) return interaction.reply({ embeds: [errorEmbed('No sticky message in this channel.')], ephemeral: true });
        
        try {
            if (sticky.messageId) {
                const msg = await interaction.channel.messages.fetch(sticky.messageId).catch(() => null);
                if (msg) await msg.delete();
            }
        } catch(e) {}
        
        db.removeSticky(interaction.channel.id);
        await interaction.reply({ embeds: [successEmbed('Sticky message removed.')], ephemeral: true });
        
        db.addModLog({ action: 'Unsticky', moderatorId: interaction.user.id, targetId: client.user.id, reason: `Unsticky in ${interaction.channel.name}` });
        sendLog(client, interaction.guild, 'Sticky Removed', `By ${interaction.user.tag} in ${interaction.channel.name}`, config.COLORS.INFO);
    }
};