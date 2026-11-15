const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { errorEmbed, successEmbed, createEmbed } = require('../../utils/embeds');
const { hasManager, canModerate, hasAdmin } = require('../../utils/permissions');
const config = require('../../config');
const db = require('../../database/db');
const { sendLog } = require('../../systems/logging');

module.exports = {
    name: 'dm',
    aliases: ['messageuser', 'pm'],
    description: 'DM a user through the bot.',
    category: 'staff',
    slashData: new SlashCommandBuilder()
        .setName('dm')
        .setDescription('DM a user through the bot.')
        .addUserOption(option => option.setName('user').setDescription('User to DM').setRequired(true))
        .addStringOption(option => option.setName('message').setDescription('Message to send').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
        
    async execute(message, args, client) {
        if (!hasAdmin(message.member) && !hasManager(message.member) && !canModerate(message.member)) {
            return message.reply({ embeds: [errorEmbed('You do not have permission to use this command.')] });
        }
        
        const user = message.mentions.users.first() || await client.users.fetch(args[0]).catch(() => null);
        if (!user) return message.reply({ embeds: [errorEmbed('Please mention a valid user or provide their ID.')] });
        
        const msg = args.slice(1).join(' ');
        if (!msg) return message.reply({ embeds: [errorEmbed('Please provide a message to send.')] });
        
        try {
            const embed = createEmbed({
                color: config.COLORS.INFO,
                title: '📩 Message from Server Staff',
                description: msg,
                footer: `Sent from ${message.guild.name}`
            });
            await user.send({ embeds: [embed] });
            await message.reply({ embeds: [successEmbed(`Message successfully sent to ${user.tag}.`)] });
            
            db.addModLog({ action: 'DM', moderatorId: message.author.id, targetId: user.id, reason: msg });
            sendLog(message.guild, 'DM', { moderator: message.author, target: user, reason: msg });
        } catch (error) {
            console.error('[DM CMD] Error:', error);
            return message.reply({ embeds: [errorEmbed(`Could not DM ${user.tag}. They might have DMs disabled or blocked the bot.`)] });
        }
    },
    
    async slashExecute(interaction, client) {
        if (!hasAdmin(interaction.member) && !hasManager(interaction.member) && !canModerate(interaction.member)) {
            return interaction.reply({ embeds: [errorEmbed('You do not have permission.')], ephemeral: true });
        }
        
        const user = interaction.options.getUser('user');
        const msg = interaction.options.getString('message');
        
        try {
            const embed = createEmbed({
                color: config.COLORS.INFO,
                title: '📩 Message from Server Staff',
                description: msg,
                footer: `Sent from ${interaction.guild.name}`
            });
            await user.send({ embeds: [embed] });
            await interaction.reply({ embeds: [successEmbed(`Message successfully sent to ${user.tag}.`)], ephemeral: true });
            
            db.addModLog({ action: 'DM', moderatorId: interaction.user.id, targetId: user.id, reason: msg });
            sendLog(interaction.guild, 'DM', { moderator: interaction.user, target: user, reason: msg });
        } catch (error) {
            console.error('[DM CMD] Error:', error);
            return interaction.reply({ embeds: [errorEmbed(`Could not DM ${user.tag}. They might have DMs disabled or blocked the bot.`)], ephemeral: true });
        }
    }
};