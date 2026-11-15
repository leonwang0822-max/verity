const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { hasAdmin, hasManager } = require('../../utils/permissions');
const { sendLog } = require('../../systems/logging');
const leveling = require('../../systems/leveling');
const db = require('../../database/db');

module.exports = {
    name: 'setlevel',
    aliases: ['setlvl'],
    description: 'Set a user\'s level.',
    category: 'staff',
    slashData: new SlashCommandBuilder()
        .setName('setlevel')
        .setDescription('Set a user\'s level.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to modify')
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option.setName('level')
                .setDescription('The level to set')
                .setRequired(true)
                .setMinValue(0)
        ),
    execute: async (message, args, client) => {
        if (!hasAdmin(message.member) && !hasManager(message.member)) {
            return message.reply({ embeds: [errorEmbed('You do not have permission to use this command.')] });
        }

        const target = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
        if (!target) return message.reply({ embeds: [errorEmbed('User not found.')] });
        
        const newLevel = parseInt(args[1]);
        if (isNaN(newLevel) || newLevel < 0) return message.reply({ embeds: [errorEmbed('Please provide a valid level (0 or higher).')] });

        const xpNeeded = leveling.xpForLevel(newLevel);
        db.updateUser(target.id, { level: newLevel, xp: xpNeeded });
        
        await leveling.syncLevelRoles(target, newLevel);
        
        const reason = `Level set to ${newLevel} by ${message.author.tag}`;
        db.addModLog({ action: 'SETLEVEL', moderatorId: message.author.id, targetId: target.id, reason });
        sendLog(message.guild, 'SETLEVEL', { moderator: message.author, target: target.user, reason, newLevel });

        return message.reply({ embeds: [successEmbed(`Successfully set ${target}'s level to **${newLevel}**.`)] });
    },
    slashExecute: async (interaction, client) => {
        if (!hasAdmin(interaction.member) && !hasManager(interaction.member)) {
            return interaction.reply({ embeds: [errorEmbed('You do not have permission to use this command.')], ephemeral: true });
        }

        const target = interaction.options.getMember('user');
        const newLevel = interaction.options.getInteger('level');

        if (!target) return interaction.reply({ embeds: [errorEmbed('User not found in this server.')], ephemeral: true });

        const xpNeeded = leveling.xpForLevel(newLevel);
        db.updateUser(target.id, { level: newLevel, xp: xpNeeded });
        
        await leveling.syncLevelRoles(target, newLevel);

        const reason = `Level set to ${newLevel} by ${interaction.user.tag}`;
        db.addModLog({ action: 'SETLEVEL', moderatorId: interaction.user.id, targetId: target.id, reason });
        sendLog(interaction.guild, 'SETLEVEL', { moderator: interaction.user, target: target.user, reason, newLevel });

        return interaction.reply({ embeds: [successEmbed(`Successfully set ${target}'s level to **${newLevel}**.`)] });
    }
};
