const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const db = require('../../database/db');
const { sendLog } = require('../../systems/logging');

module.exports = {
    name: 'clearwarnings',
    aliases: ['clearwarn', 'cw'],
    description: 'Clear all warnings for a user.',
    category: 'staff',
    slashData: new SlashCommandBuilder()
        .setName('clearwarnings')
        .setDescription('Clear all warnings for a user.')
        .addUserOption(o => o.setName('user').setDescription('The user').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(message, args, client) {
        const target = message.mentions.users.first() || await client.users.fetch(args[0]).catch(() => null);
        if (!target) return message.reply({ embeds: [errorEmbed('Please specify a valid user.')] });

        const warnings = db.getWarnings(target.id);
        if (warnings.length === 0) return message.reply({ embeds: [errorEmbed(`${target.tag} has no warnings.`)] });

        db.clearWarnings(target.id);
        db.addModLog({ action: 'CLEAR_WARNINGS', moderatorId: message.author.id, targetId: target.id, reason: `Cleared ${warnings.length} warnings` });
        sendLog(message.guild, 'Warnings Cleared', `**User:** ${target} (${target.tag})\n**Moderator:** ${message.author}\n**Warnings Cleared:** ${warnings.length}`);
        return message.reply({ embeds: [successEmbed(`Cleared ${warnings.length} warning(s) for ${target.tag}.`)] });
    },

    async slashExecute(interaction, client) {
        const target = interaction.options.getUser('user');
        const warnings = db.getWarnings(target.id);
        if (warnings.length === 0) return interaction.reply({ embeds: [errorEmbed(`${target.tag} has no warnings.`)], ephemeral: true });

        db.clearWarnings(target.id);
        db.addModLog({ action: 'CLEAR_WARNINGS', moderatorId: interaction.user.id, targetId: target.id, reason: `Cleared ${warnings.length} warnings` });
        sendLog(interaction.guild, 'Warnings Cleared', `**User:** ${target} (${target.tag})\n**Moderator:** ${interaction.user}\n**Warnings Cleared:** ${warnings.length}`);
        return interaction.reply({ embeds: [successEmbed(`Cleared ${warnings.length} warning(s) for ${target.tag}.`)] });
    },
};
