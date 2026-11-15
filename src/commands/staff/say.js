const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { errorEmbed, successEmbed } = require('../../utils/embeds');
const { hasManager, canModerate } = require('../../utils/permissions');
const config = require('../../config');
const db = require('../../database/db');
const { sendLog } = require('../../systems/logging');

module.exports = {
    name: 'say',
    aliases: ['echo'],
    description: 'Make the bot say something',
    category: 'staff',
    slashData: new SlashCommandBuilder()
        .setName('say')
        .setDescription('Make the bot say something')
        .addStringOption(option => option.setName('message').setDescription('Message to say').setRequired(true))
        .addChannelOption(option => option.setName('channel').setDescription('Channel to say in').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
        
    async execute(message, args, client) {
        if (!hasManager(message.member) && !canModerate(message.member)) return message.reply({ embeds: [errorEmbed('You do not have permission.')] });
        
        let channel = message.mentions.channels.first();
        let msg;
        if (channel) {
            msg = args.slice(1).join(' ');
        } else {
            channel = message.channel;
            msg = args.join(' ');
        }
        
        if (!msg) return message.reply({ embeds: [errorEmbed('Please provide a message.')] });
        
        await channel.send(msg);
        if (channel.id !== message.channel.id) {
            await message.reply({ embeds: [successEmbed(`Message sent to ${channel}.`)] });
        } else {
            if (message.deletable) await message.delete().catch(() => {});
        }
        
        db.addModLog({ action: 'Say', moderatorId: message.author.id, targetId: client.user.id, reason: `Said something in ${channel.name}` });
        sendLog(client, message.guild, 'Say Command', `Used by ${message.author.tag} in ${channel.name}`, config.COLORS.INFO);
    },
    
    async slashExecute(interaction, client) {
        if (!hasManager(interaction.member) && !canModerate(interaction.member)) return interaction.reply({ embeds: [errorEmbed('You do not have permission.')], ephemeral: true });
        
        const channel = interaction.options.getChannel('channel') || interaction.channel;
        const msg = interaction.options.getString('message');
        
        await channel.send(msg);
        await interaction.reply({ embeds: [successEmbed(`Message sent to ${channel}.`)], ephemeral: true });
        
        db.addModLog({ action: 'Say', moderatorId: interaction.user.id, targetId: client.user.id, reason: `Said something in ${channel.name}` });
        sendLog(client, interaction.guild, 'Say Command', `Used by ${interaction.user.tag} in ${channel.name}`, config.COLORS.INFO);
    }
};