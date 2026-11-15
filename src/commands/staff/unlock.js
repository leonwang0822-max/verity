const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const db = require('../../database/db');
const { sendLog } = require('../../systems/logging');

module.exports = {
    name: 'unlock',
    aliases: [],
    description: 'Unlock a channel.',
    category: 'staff',
    slashData: new SlashCommandBuilder()
        .setName('unlock')
        .setDescription('Unlock a channel.')
        .addChannelOption(o => o.setName('channel').setDescription('Channel to unlock (default: current)').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(message, args, client) {
        const channel = message.mentions.channels.first() || message.channel;
        try {
            await channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: null });
            db.addModLog({ action: 'UNLOCK', moderatorId: message.author.id, targetId: channel.id, reason: `Unlocked #${channel.name}` });
            sendLog(message.guild, 'Channel Unlocked', `**Channel:** ${channel}\n**Moderator:** ${message.author}`);
            return message.reply({ embeds: [successEmbed(`🔓 Unlocked ${channel}.`)] });
        } catch (e) {
            return message.reply({ embeds: [errorEmbed('Failed to unlock channel.')] });
        }
    },

    async slashExecute(interaction, client) {
        const channel = interaction.options.getChannel('channel') || interaction.channel;
        try {
            await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: null });
            db.addModLog({ action: 'UNLOCK', moderatorId: interaction.user.id, targetId: channel.id, reason: `Unlocked #${channel.name}` });
            sendLog(interaction.guild, 'Channel Unlocked', `**Channel:** ${channel}\n**Moderator:** ${interaction.user}`);
            return interaction.reply({ embeds: [successEmbed(`🔓 Unlocked ${channel}.`)] });
        } catch (e) {
            return interaction.reply({ embeds: [errorEmbed('Failed to unlock channel.')], ephemeral: true });
        }
    },
};
