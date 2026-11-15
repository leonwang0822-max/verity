const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const db = require('../../database/db');
const { sendLog } = require('../../systems/logging');

module.exports = {
    name: 'unban',
    aliases: [],
    description: 'Unban a user by their ID.',
    category: 'staff',
    slashData: new SlashCommandBuilder()
        .setName('unban')
        .setDescription('Unban a user by their ID.')
        .addStringOption(o => o.setName('user_id').setDescription('The user ID to unban').setRequired(true))
        .addStringOption(o => o.setName('reason').setDescription('Reason for unbanning').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    async execute(message, args, client) {
        const userId = args[0];
        if (!userId) return message.reply({ embeds: [errorEmbed('Please provide a user ID.')] });

        const reason = args.slice(1).join(' ') || 'No reason provided';

        try {
            await message.guild.members.unban(userId, reason);
            db.addModLog({ action: 'UNBAN', moderatorId: message.author.id, targetId: userId, reason });
            sendLog(message.guild, 'User Unbanned', `**User ID:** ${userId}\n**Moderator:** ${message.author}\n**Reason:** ${reason}`);
            return message.reply({ embeds: [successEmbed(`Unbanned user ID \`${userId}\`.`)] });
        } catch (e) {
            return message.reply({ embeds: [errorEmbed('Failed to unban. Are they actually banned?')] });
        }
    },

    async slashExecute(interaction, client) {
        const userId = interaction.options.getString('user_id');
        const reason = interaction.options.getString('reason') || 'No reason provided';

        try {
            await interaction.guild.members.unban(userId, reason);
            db.addModLog({ action: 'UNBAN', moderatorId: interaction.user.id, targetId: userId, reason });
            sendLog(interaction.guild, 'User Unbanned', `**User ID:** ${userId}\n**Moderator:** ${interaction.user}\n**Reason:** ${reason}`);
            return interaction.reply({ embeds: [successEmbed(`Unbanned user ID \`${userId}\`.`)] });
        } catch (e) {
            return interaction.reply({ embeds: [errorEmbed('Failed to unban. Are they actually banned?')], ephemeral: true });
        }
    },
};
