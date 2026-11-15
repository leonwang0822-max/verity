const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { canModerate } = require('../../utils/permissions');
const db = require('../../database/db');
const { sendLog } = require('../../systems/logging');

module.exports = {
    name: 'nick',
    aliases: ['nickname'],
    description: 'Change a user\'s nickname.',
    category: 'staff',
    slashData: new SlashCommandBuilder()
        .setName('nick')
        .setDescription('Change a user\'s nickname.')
        .addUserOption(o => o.setName('user').setDescription('The user').setRequired(true))
        .addStringOption(o => o.setName('nickname').setDescription('New nickname (leave empty to reset)').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageNicknames),

    async execute(message, args, client) {
        const member = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
        if (!member) return message.reply({ embeds: [errorEmbed('Please mention a valid member.')] });
        if (!canModerate(message.member, member)) return message.reply({ embeds: [errorEmbed('You cannot moderate this user.')] });

        const nickname = args.slice(1).join(' ') || null;
        const oldNick = member.displayName;
        try {
            await member.setNickname(nickname);
            db.addModLog({ action: 'NICKNAME', moderatorId: message.author.id, targetId: member.id, reason: `${oldNick} → ${nickname || 'Reset'}` });
            sendLog(message.guild, 'Nickname Changed', `**User:** ${member}\n**Moderator:** ${message.author}\n**Before:** ${oldNick}\n**After:** ${nickname || 'Reset'}`);
            return message.reply({ embeds: [successEmbed(`Changed ${member.user.tag}'s nickname to **${nickname || 'Reset'}**.`)] });
        } catch (e) {
            return message.reply({ embeds: [errorEmbed('Failed to change nickname.')] });
        }
    },

    async slashExecute(interaction, client) {
        const member = interaction.options.getMember('user');
        if (!member) return interaction.reply({ embeds: [errorEmbed('Member not found.')], ephemeral: true });
        if (!canModerate(interaction.member, member)) return interaction.reply({ embeds: [errorEmbed('You cannot moderate this user.')], ephemeral: true });

        const nickname = interaction.options.getString('nickname') || null;
        const oldNick = member.displayName;
        try {
            await member.setNickname(nickname);
            db.addModLog({ action: 'NICKNAME', moderatorId: interaction.user.id, targetId: member.id, reason: `${oldNick} → ${nickname || 'Reset'}` });
            sendLog(interaction.guild, 'Nickname Changed', `**User:** ${member}\n**Moderator:** ${interaction.user}\n**Before:** ${oldNick}\n**After:** ${nickname || 'Reset'}`);
            return interaction.reply({ embeds: [successEmbed(`Changed ${member.user.tag}'s nickname to **${nickname || 'Reset'}**.`)] });
        } catch (e) {
            return interaction.reply({ embeds: [errorEmbed('Failed to change nickname.')], ephemeral: true });
        }
    },
};
