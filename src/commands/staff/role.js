const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { canManageRole, hasAdmin } = require('../../utils/permissions');
const db = require('../../database/db');
const { sendLog } = require('../../systems/logging');

function findRole(guild, query) {
    if (!query) return null;
    const cleanId = query.replace(/[<@&>]/g, '').trim();
    
    // 1. By exact Role ID
    let role = guild.roles.cache.get(cleanId);
    if (role) return role;

    // 2. By exact name match (case-insensitive)
    const lower = query.trim().toLowerCase();
    role = guild.roles.cache.find(r => r.name.toLowerCase() === lower);
    if (role) return role;

    // 3. By partial name match
    role = guild.roles.cache.find(r => r.name.toLowerCase().includes(lower));
    return role || null;
}

module.exports = {
    name: 'role',
    aliases: ['r', 'giverole', 'removerole'],
    description: 'Add, remove, or toggle a role for a user by role name, mention, or role ID.',
    category: 'staff',
    slashData: new SlashCommandBuilder()
        .setName('role')
        .setDescription('Add, remove, or toggle a role for a user.')
        .addUserOption(o => o.setName('user').setDescription('The user').setRequired(true))
        .addRoleOption(o => o.setName('role').setDescription('The role to toggle').setRequired(true))
        .addStringOption(o => o.setName('action').setDescription('Action (add / remove / toggle)').addChoices(
            { name: 'Toggle (Auto)', value: 'toggle' },
            { name: 'Add', value: 'add' },
            { name: 'Remove', value: 'remove' }
        ).setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

    async execute(message, args, client) {
        if (!hasAdmin(message.member) && !message.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
            return message.reply({ embeds: [errorEmbed('You do not have permission to manage roles.')] });
        }

        const member = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
        if (!member) return message.reply({ embeds: [errorEmbed('Please mention a valid member or provide their ID.\nExample: `?role @user Member` or `?role @user 123456789`')] });

        const roleQuery = args.slice(1).join(' ');
        if (!roleQuery) return message.reply({ embeds: [errorEmbed('Please provide a role name or role ID.\nExample: `?role @user Member` or `?role @user 1531894454796161075`')] });

        const role = findRole(message.guild, roleQuery);
        if (!role) return message.reply({ embeds: [errorEmbed(`Could not find any role matching \`${roleQuery}\`.`)] });

        // Role hierarchy check
        if (!canManageRole(message.member, role)) {
            return message.reply({ embeds: [errorEmbed('You cannot manage this role — it is equal to or higher than your highest role.')] });
        }

        const hasRole = member.roles.cache.has(role.id);
        const action = hasRole ? 'remove' : 'add';

        try {
            if (action === 'add') {
                await member.roles.add(role);
            } else {
                await member.roles.remove(role);
            }
            db.addModLog({ action: `ROLE_${action.toUpperCase()}`, moderatorId: message.author.id, targetId: member.id, reason: role.name });
            sendLog(message.guild, 'Role Modified', `**User:** ${member}\n**Moderator:** ${message.author}\n**Role:** ${role}\n**Action:** ${action}`);
            return message.reply({ embeds: [successEmbed(`${action === 'add' ? 'Added' : 'Removed'} ${role} ${action === 'add' ? 'to' : 'from'} ${member.user.tag}.`)] });
        } catch (e) {
            console.error('[ROLE CMD] Error:', e);
            return message.reply({ embeds: [errorEmbed(`Failed to modify role: ${e.message}. Make sure the bot's role is above ${role.name} in Server Settings.`)] });
        }
    },

    async slashExecute(interaction, client) {
        if (!hasAdmin(interaction.member) && !interaction.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
            return interaction.reply({ embeds: [errorEmbed('You do not have permission.')], ephemeral: true });
        }

        const member = interaction.options.getMember('user');
        const role = interaction.options.getRole('role');
        const choice = interaction.options.getString('action') || 'toggle';

        if (!member) return interaction.reply({ embeds: [errorEmbed('Member not found.')], ephemeral: true });

        if (!canManageRole(interaction.member, role)) {
            return interaction.reply({ embeds: [errorEmbed('You cannot manage this role — it is equal to or higher than your highest role.')], ephemeral: true });
        }

        const hasRole = member.roles.cache.has(role.id);
        let action = choice;
        if (action === 'toggle') {
            action = hasRole ? 'remove' : 'add';
        }

        try {
            if (action === 'add') {
                await member.roles.add(role);
            } else {
                await member.roles.remove(role);
            }
            db.addModLog({ action: `ROLE_${action.toUpperCase()}`, moderatorId: interaction.user.id, targetId: member.id, reason: role.name });
            sendLog(interaction.guild, 'Role Modified', `**User:** ${member}\n**Moderator:** ${interaction.user}\n**Role:** ${role}\n**Action:** ${action}`);
            return interaction.reply({ embeds: [successEmbed(`${action === 'add' ? 'Added' : 'Removed'} ${role} ${action === 'add' ? 'to' : 'from'} ${member.user.tag}.`)] });
        } catch (e) {
            return interaction.reply({ embeds: [errorEmbed(`Failed to modify role: ${e.message}`)], ephemeral: true });
        }
    },
};
