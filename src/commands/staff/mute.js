const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { canModerate, hasAdmin } = require('../../utils/permissions');
const { parseDuration, formatDuration, extractTargetDurationReason } = require('../../utils/duration');
const { muteUser } = require('../../systems/mute');
const db = require('../../database/db');
const config = require('../../config');
const { sendLog } = require('../../systems/logging');

const { resolveMember } = require('../../utils/resolver');

module.exports = {
    name: 'mute',
    aliases: ['m', 'tempmute'],
    description: 'Mutes a user by assigning the Muted role (with optional duration).',
    category: 'staff',
    slashData: new SlashCommandBuilder()
        .setName('mute')
        .setDescription('Mutes a user by assigning the Muted role.')
        .addUserOption(option => option.setName('user').setDescription('The user to mute').setRequired(true))
        .addStringOption(option => option.setName('duration').setDescription('Duration e.g. 10m, 1h, 1d (leave empty for permanent)').setRequired(false))
        .addStringOption(option => option.setName('reason').setDescription('Reason for the mute').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(message, args, client) {
        if (!hasAdmin(message.member) && !message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return message.reply({ embeds: [errorEmbed('You do not have permission to use this command.')] });
        }

        const { userQuery, durationMs, reason } = extractTargetDurationReason(args);
        if (!userQuery) return message.reply({ embeds: [errorEmbed('Please specify a user.\nExample: `?mute leonw reason text 1m` or `?mute leonw 1m reason text`')] });

        const target = await resolveMember(message.guild, userQuery);
        if (!target) return message.reply({ embeds: [errorEmbed(`Could not find any user matching \`${userQuery}\`.`)] });
        if (target.id === '1488316093964746872' || target.id === client.user.id) {
            return message.reply({ embeds: [errorEmbed('You cannot mute this user.')] });
        }

        try {
            const result = await muteUser(message.guild, target, durationMs, reason, message.author);
            db.addModLog({ action: 'MUTE', moderatorId: message.author.id, targetId: target.id, reason });
            sendLog(message.guild, 'MUTE', { moderator: message.author, target: target.user, reason, duration: result.durationText });

            return message.reply({
                embeds: [successEmbed(`Successfully muted ${target.user} (${result.durationText}).`)]
            });
        } catch (err) {
            console.error('[MUTE CMD] Error:', err);
            return message.reply({ embeds: [errorEmbed(`Failed to mute user: ${err.message}`)] });
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
        if (target.id === '1488316093964746872' || target.id === client.user.id) {
            return interaction.reply({ embeds: [errorEmbed('You cannot mute this user.')], ephemeral: true });
        }

        let durationMs = null;
        if (durationStr) {
            durationMs = parseDuration(durationStr);
            if (!durationMs) {
                return interaction.reply({ embeds: [errorEmbed('Invalid duration format. Use 1s, 10m, 1h, 1d, etc.')], ephemeral: true });
            }
        }

        try {
            const result = await muteUser(interaction.guild, target, durationMs, reason, interaction.user);
            db.addModLog({ action: 'MUTE', moderatorId: interaction.user.id, targetId: target.id, reason });
            sendLog(interaction.guild, 'MUTE', { moderator: interaction.user, target: target.user, reason, duration: result.durationText });

            return interaction.reply({
                embeds: [successEmbed(`Successfully muted ${target.user} (${result.durationText}).`)],
                ephemeral: true
            });
        } catch (err) {
            console.error('[MUTE CMD] Error:', err);
            return interaction.reply({ embeds: [errorEmbed(`Failed to mute user: ${err.message}`)], ephemeral: true });
        }
    }
};
