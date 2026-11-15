const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { hasManager } = require('../../utils/permissions');
const db = require('../../database/db');
const { sendLog } = require('../../systems/logging');
const config = require('../../config');

module.exports = {
    name: 'sticky',
    aliases: ['stick'],
    description: 'Set a sticky message in the current channel',
    category: 'staff',
    slashData: new SlashCommandBuilder()
        .setName('sticky')
        .setDescription('Set a sticky message in the current channel')
        .addStringOption(option => option.setName('message').setDescription('Message to stick').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
        
    async execute(message, args, client) {
        if (!hasManager(message.member)) return message.reply({ embeds: [errorEmbed('You do not have permission.')] });
        
        const content = args.join(' ');
        if (!content) return message.reply({ embeds: [errorEmbed('Please provide a message.')] });
        
        const sent = await message.channel.send(content);
        db.setSticky(message.channel.id, content, sent.id);
        
        await message.reply({ embeds: [successEmbed('Sticky message set.')] });
        
        db.addModLog({ action: 'Sticky', moderatorId: message.author.id, targetId: client.user.id, reason: `Sticky in ${message.channel.name}` });
        sendLog(client, message.guild, 'Sticky Set', `By ${message.author.tag} in ${message.channel.name}`, config.COLORS.INFO);
    },
    
    async slashExecute(interaction, client) {
        if (!hasManager(interaction.member)) return interaction.reply({ embeds: [errorEmbed('You do not have permission.')], ephemeral: true });
        
        const content = interaction.options.getString('message');
        const sent = await interaction.channel.send(content);
        db.setSticky(interaction.channel.id, content, sent.id);
        
        await interaction.reply({ embeds: [successEmbed('Sticky message set.')], ephemeral: true });
        
        db.addModLog({ action: 'Sticky', moderatorId: interaction.user.id, targetId: client.user.id, reason: `Sticky in ${interaction.channel.name}` });
        sendLog(client, interaction.guild, 'Sticky Set', `By ${interaction.user.tag} in ${interaction.channel.name}`, config.COLORS.INFO);
    }
};