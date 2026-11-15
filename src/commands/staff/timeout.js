const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { canModerate, hasAdmin } = require('../../utils/permissions');
const { parseDuration, formatDuration, extractTargetDurationReason } = require('../../utils/duration');
const db = require('../../database/db');
const config = require('../../config');
const { sendLog } = require('../../systems/logging');

const { resolveMember } = require('../../utils/resolver');

module.exports = {
    name: 'timeout',
    aliases: ['to'],
    description: 'Timeouts a user in the server using Discord built-in timeout.',
    category: 'staff',
    slashData: new SlashCommandBuilder()
        .setName('timeout')
        .setDescription('Timeouts a user in the server.')
        .addUserOption(option => option.setName('user').setDescription('The user to timeout').setRequired(true))
        .addStringOption(option => option.setName('duration').setDescription('Duration (e.g. 1s, 100s, 1h, 1hour, 1d)').setRequired(true))
        .addStringOption(option => option.setName('reason').setDescription('Reason for the timeout'))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(message, args, client) {
        if (!hasAdmin(message.member) && !message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return message.reply({ embeds: [errorEmbed('You do not have permission to use this command.')] });
        }

        const { userQuery, durationMs, reason } = extractTargetDurationReason(args);
        if (!userQuery) return message.reply({ embeds: [errorEmbed('Please specify a user.\nExample: `?timeout leonw reason text 1m` or `?timeout leonw 1m reason text`')] });
        if (!durationMs || durationMs > 2419200000) return message.reply({ embeds: [errorEmbed('Invalid duration. Maximum duration is 28 days.')] });

        const target = await resolveMember(message.guild, userQuery);
        if (!target) return message.reply({ embeds: [errorEmbed(`Could not find any user matching \`${userQuery}\`.`)] });
        if (!canModerate(message.member, target)) return message.reply({ embeds: [errorEmbed('You cannot timeout this user.')] });

        try {
            await target.timeout(durationMs, reason || 'No reason provided');
            db.addModLog({ action: 'TIMEOUT', moderatorId: message.author.id, targetId: target.id, reason: reason || 'No reason provided' });
            sendLog(message.guild, 'TIMEOUT', { moderator: message.author, target: target.user, reason: reason || 'No reason provided', duration: formatDuration(durationMs) });

            return message.reply({ embeds: [successEmbed(`Timed out ${target.user.tag} for ${formatDuration(durationMs)}.`)] });
        } catch (err) {
            console.error('[TIMEOUT CMD] Error:', err);
            return message.reply({ embeds: [errorEmbed(`Failed to timeout user: ${err.message}`)] });
        }
    },

    async slashExecute(interaction, client) {
        if (!hasAdmin(interaction.member) && !interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return interaction.reply({ embeds: [errorEmbed('You do not have permission.')], ephemeral: true });
        }

        const target = interaction.options.getMember('user');
        const durationStr = interaction.options.getString('duration');
        const reason = interaction.options.getString('reason') || 'No reason provided';

        if (!target) return interaction.reply({ embeds: [errorEmbed('Invalid user provided.')], ephemeral: true });
        if (!canModerate(interaction.member, target)) return interaction.reply({ embeds: [errorEmbed('You cannot timeout this user.')], ephemeral: true });

        const ms = parseDuration(durationStr);
        if (!ms || ms > 2419200000) return interaction.reply({ embeds: [errorEmbed('Invalid duration. Maximum duration is 28 days.')], ephemeral: true });

        try {
            await target.timeout(ms, reason);
            db.addModLog({ action: 'TIMEOUT', moderatorId: interaction.user.id, targetId: target.id, reason });
            sendLog(interaction.guild, 'TIMEOUT', { moderator: interaction.user, target: target.user, reason, duration: formatDuration(ms) });

            return interaction.reply({ embeds: [successEmbed(`Timed out ${target.user.tag} for ${formatDuration(ms)}.`)] });
        } catch (err) {
            console.error('[TIMEOUT CMD] Error:', err);
            return interaction.reply({ embeds: [errorEmbed(`Failed to timeout user: ${err.message}`)], ephemeral: true });
        }
    }
};
