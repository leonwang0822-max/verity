const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { canModerate, hasAdmin } = require('../../utils/permissions');
const { unmuteUser } = require('../../systems/mute');
const db = require('../../database/db');
const config = require('../../config');
const { sendLog } = require('../../systems/logging');

const { resolveMember } = require('../../utils/resolver');

module.exports = {
    name: 'unmute',
    aliases: ['untimeout', 'unm'],
    description: 'Unmutes a user (removes Muted role & clears Discord timeout).',
    category: 'staff',
    slashData: new SlashCommandBuilder()
        .setName('unmute')
        .setDescription('Unmutes a user.')
        .addUserOption(option => option.setName('user').setDescription('The user to unmute').setRequired(true))
        .addStringOption(option => option.setName('reason').setDescription('Reason for the unmute').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(message, args, client) {
        if (!hasAdmin(message.member) && !message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return message.reply({ embeds: [errorEmbed('You do not have permission to use this command.')] });
        }

        if (!args[0]) return message.reply({ embeds: [errorEmbed('Please mention a user, or provide their name/ID.')] });

        const target = await resolveMember(message.guild, args[0]);
        if (!target) return message.reply({ embeds: [errorEmbed(`Could not find any user matching \`${args[0]}\`.`)] });
        // Unmute command can target anyone

        const reason = args.slice(1).join(' ') || 'No reason provided';

        try {
            // Remove Muted role via system
            await unmuteUser(message.guild, target, reason, message.author);
            // Clear Discord native timeout if active
            if (target.isCommunicationDisabled()) {
                await target.timeout(null, reason).catch(() => {});
            }

            db.addModLog({ action: 'UNMUTE', moderatorId: message.author.id, targetId: target.id, reason });
            sendLog(message.guild, 'UNMUTE', { moderator: message.author, target: target.user, reason });

            return message.reply({ embeds: [successEmbed(`Successfully unmuted ${target.user.tag}.`)] });
        } catch (err) {
            console.error('[UNMUTE CMD] Error:', err);
            return message.reply({ embeds: [errorEmbed(`Failed to unmute user: ${err.message}`)] });
        }
    },

    async slashExecute(interaction, client) {
        if (!hasAdmin(interaction.member) && !interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return interaction.reply({ embeds: [errorEmbed('You do not have permission.')], ephemeral: true });
        }

        const target = interaction.options.getMember('user');
        const reason = interaction.options.getString('reason') || 'No reason provided';

        if (!target) return interaction.reply({ embeds: [errorEmbed('Invalid user provided.')], ephemeral: true });
        // Unmute command can target anyone

        try {
            await unmuteUser(interaction.guild, target, reason, interaction.user);
            if (target.isCommunicationDisabled()) {
                await target.timeout(null, reason).catch(() => {});
            }

            db.addModLog({ action: 'UNMUTE', moderatorId: interaction.user.id, targetId: target.id, reason });
            sendLog(interaction.guild, 'UNMUTE', { moderator: interaction.user, target: target.user, reason });

            return interaction.reply({ embeds: [successEmbed(`Successfully unmuted ${target.user.tag}.`)], ephemeral: true });
        } catch (err) {
            console.error('[UNMUTE CMD] Error:', err);
            return interaction.reply({ embeds: [errorEmbed(`Failed to unmute user: ${err.message}`)], ephemeral: true });
        }
    }
};
