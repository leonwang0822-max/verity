const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const db = require('../../database/db');
const { sendLog } = require('../../systems/logging');

module.exports = {
    name: 'lock',
    aliases: [],
    description: 'Lock a channel to prevent messages.',
    category: 'staff',
    slashData: new SlashCommandBuilder()
        .setName('lock')
        .setDescription('Lock a channel to prevent messages.')
        .addChannelOption(o => o.setName('channel').setDescription('Channel to lock (default: current)').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(message, args, client) {
        const channel = message.mentions.channels.first() || message.channel;
        try {
            await channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: false });
            db.addModLog({ action: 'LOCK', moderatorId: message.author.id, targetId: channel.id, reason: `Locked #${channel.name}` });
            sendLog(message.guild, 'Channel Locked', `**Channel:** ${channel}\n**Moderator:** ${message.author}`);
            return message.reply({ embeds: [successEmbed(`🔒 Locked ${channel}.`)] });
        } catch (e) {
            return message.reply({ embeds: [errorEmbed('Failed to lock channel.')] });
        }
    },

    async slashExecute(interaction, client) {
        const channel = interaction.options.getChannel('channel') || interaction.channel;
        try {
            await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: false });
            db.addModLog({ action: 'LOCK', moderatorId: interaction.user.id, targetId: channel.id, reason: `Locked #${channel.name}` });
            sendLog(interaction.guild, 'Channel Locked', `**Channel:** ${channel}\n**Moderator:** ${interaction.user}`);
            return interaction.reply({ embeds: [successEmbed(`🔒 Locked ${channel}.`)] });
        } catch (e) {
            return interaction.reply({ embeds: [errorEmbed('Failed to lock channel.')], ephemeral: true });
        }
    },
};
