const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed, createEmbed } = require('../../utils/embeds');
const { hasAdmin } = require('../../utils/permissions');
const { syncMemberRoles } = require('../../systems/roleSync');
const config = require('../../config');

module.exports = {
    name: 'syncroles',
    aliases: ['rolesync', 'syncallroles'],
    description: 'Sync roles (announcements, levels, tags, pings, etc.) from the previous server for a user or the entire server.',
    category: 'staff',
    slashData: new SlashCommandBuilder()
        .setName('syncroles')
        .setDescription('Sync roles from previous server for a user or entire server.')
        .addUserOption(o => o.setName('user').setDescription('Target user (leave empty to sync entire server)').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

    async execute(message, args, client) {
        if (!hasAdmin(message.member) && !message.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
            return message.reply({ embeds: [errorEmbed('You do not have permission to use this command.')] });
        }

        const targetMember = message.mentions.members.first() || (args[0] && args[0] !== 'all' ? message.guild.members.cache.get(args[0]) : null);

        if (targetMember) {
            const statusMsg = await message.reply('⏳ Syncing roles for ' + targetMember.user.tag + '...').catch(() => null);
            const added = await syncMemberRoles(targetMember);
            const reply = added.length > 0
                ? successEmbed(`Synced **${added.length}** roles for ${targetMember}!`)
                : createEmbed({
                    color: config.COLORS.INFO || 0x5865F2,
                    description: `ℹ️ ${targetMember} is already fully synced or has no missing roles from the previous server.`
                });
            if (statusMsg) return statusMsg.edit({ content: null, embeds: [reply] }).catch(() => {});
            return message.reply({ embeds: [reply] });
        }

        // Sync all members
        const statusMsg = await message.reply('⏳ Starting full server role sync from previous server...').catch(() => null);
        const members = await message.guild.members.fetch().catch(() => message.guild.members.cache);
        let syncedCount = 0;
        let totalRolesAdded = 0;

        for (const [id, m] of members) {
            if (m.user.bot) continue;
            const added = await syncMemberRoles(m);
            if (added.length > 0) {
                syncedCount++;
                totalRolesAdded += added.length;
            }
        }

        const doneEmbed = successEmbed(`✅ **Role Sync Completed!**\n\n• **Members Updated:** ${syncedCount}\n• **Total Roles Restored:** ${totalRolesAdded}`);
        if (statusMsg) return statusMsg.edit({ content: null, embeds: [doneEmbed] }).catch(() => {});
        return message.reply({ embeds: [doneEmbed] });
    },

    async slashExecute(interaction, client) {
        if (!hasAdmin(interaction.member) && !interaction.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
            return interaction.reply({ embeds: [errorEmbed('You do not have permission to use this command.')], ephemeral: true });
        }

        const targetMember = interaction.options.getMember('user');
        await interaction.deferReply();

        if (targetMember) {
            const added = await syncMemberRoles(targetMember);
            const reply = added.length > 0
                ? successEmbed(`Synced **${added.length}** roles for ${targetMember}!`)
                : createEmbed({
                    color: config.COLORS.INFO || 0x5865F2,
                    description: `ℹ️ ${targetMember} is already fully synced or has no missing roles from the previous server.`
                });
            return interaction.editReply({ embeds: [reply] });
        }

        const members = await interaction.guild.members.fetch().catch(() => interaction.guild.members.cache);
        let syncedCount = 0;
        let totalRolesAdded = 0;

        for (const [id, m] of members) {
            if (m.user.bot) continue;
            const added = await syncMemberRoles(m);
            if (added.length > 0) {
                syncedCount++;
                totalRolesAdded += added.length;
            }
        }

        const doneEmbed = successEmbed(`✅ **Role Sync Completed!**\n\n• **Members Updated:** ${syncedCount}\n• **Total Roles Restored:** ${totalRolesAdded}`);
        return interaction.editReply({ embeds: [doneEmbed] });
    }
};
