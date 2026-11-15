const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const db = require('../../database/db');
const { sendLog } = require('../../systems/logging');

module.exports = {
    name: 'slowmode',
    aliases: ['slow'],
    description: 'Set channel slowmode.',
    category: 'staff',
    slashData: new SlashCommandBuilder()
        .setName('slowmode')
        .setDescription('Set channel slowmode.')
        .addIntegerOption(o => o.setName('seconds').setDescription('Slowmode in seconds (0 to disable)').setMinValue(0).setMaxValue(21600).setRequired(true))
        .addChannelOption(o => o.setName('channel').setDescription('Channel (default: current)').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(message, args, client) {
        const seconds = parseInt(args[0]);
        if (isNaN(seconds) || seconds < 0 || seconds > 21600) {
            return message.reply({ embeds: [errorEmbed('Please specify seconds between 0 and 21600 (6 hours).')] });
        }
        const channel = message.mentions.channels.first() || message.channel;
        try {
            await channel.setRateLimitPerUser(seconds);
            db.addModLog({ action: 'SLOWMODE', moderatorId: message.author.id, targetId: channel.id, reason: `${seconds}s` });
            sendLog(message.guild, 'Slowmode Changed', `**Channel:** ${channel}\n**Moderator:** ${message.author}\n**Duration:** ${seconds === 0 ? 'Disabled' : `${seconds}s`}`);
            return message.reply({ embeds: [successEmbed(seconds === 0 ? `Disabled slowmode in ${channel}.` : `Set slowmode to ${seconds}s in ${channel}.`)] });
        } catch (e) {
            return message.reply({ embeds: [errorEmbed('Failed to set slowmode.')] });
        }
    },

    async slashExecute(interaction, client) {
        const seconds = interaction.options.getInteger('seconds');
        const channel = interaction.options.getChannel('channel') || interaction.channel;
        try {
            await channel.setRateLimitPerUser(seconds);
            db.addModLog({ action: 'SLOWMODE', moderatorId: interaction.user.id, targetId: channel.id, reason: `${seconds}s` });
            sendLog(interaction.guild, 'Slowmode Changed', `**Channel:** ${channel}\n**Moderator:** ${interaction.user}\n**Duration:** ${seconds === 0 ? 'Disabled' : `${seconds}s`}`);
            return interaction.reply({ embeds: [successEmbed(seconds === 0 ? `Disabled slowmode in ${channel}.` : `Set slowmode to ${seconds}s in ${channel}.`)] });
        } catch (e) {
            return interaction.reply({ embeds: [errorEmbed('Failed to set slowmode.')], ephemeral: true });
        }
    },
};
