const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, errorEmbed } = require('../../utils/embeds');
const leveling = require('../../systems/leveling');
const db = require('../../database/db');
const config = require('../../config');

module.exports = {
    name: 'level',
    aliases: ['xp', 'rank'],
    description: 'Check your or another user\'s level and XP.',
    category: 'leveling',
    slashData: new SlashCommandBuilder()
        .setName('level')
        .setDescription('Check your or another user\'s level and XP.')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to check')
                .setRequired(false)
        ),

    async execute(message, args, client) {
        const target = message.mentions.users.first() || client.users.cache.get(args[0]) || message.author;
        if (target.bot) return message.reply({ embeds: [errorEmbed('Bots do not earn XP.')] });
        return message.reply({ embeds: [buildLevelEmbed(target, message.guild)] });
    },

    async slashExecute(interaction, client) {
        const target = interaction.options.getUser('user') || interaction.user;
        if (target.bot) return interaction.reply({ embeds: [errorEmbed('Bots do not earn XP.')], ephemeral: true });
        return interaction.reply({ embeds: [buildLevelEmbed(target, interaction.guild)] });
    }
};

function buildLevelEmbed(target, guild = null) {
    const userData = db.getUser(target.id) || { xp: 0, level: 0, totalMessages: 0 };
    const xp = userData.xp || 0;
    const lvl = userData.level || 0;
    const totalMsgs = userData.totalMessages || 0;

    const progress = leveling.getProgress(xp, lvl);
    const bar = leveling.progressBar(progress.percentage || 0);

    // Calculate rank
    const leaderboard = db.getLeaderboard(1000);
    const rank = leaderboard.findIndex(u => u.userId === target.id) + 1;

    // Current & Next role reward calculation (auto-detected from server role names)
    const levelRoles = leveling.getLevelRolesMap(guild);
    const levelKeys = Object.keys(levelRoles).map(Number).sort((a, b) => a - b);
    
    let currentReward = 'None';
    for (const l of levelKeys) {
        if (l <= lvl) {
            currentReward = `<@&${levelRoles[l]}>`;
        }
    }

    let nextReward = 'All claimed! 🎉';
    for (const l of levelKeys) {
        if (l > lvl) {
            nextReward = `<@&${levelRoles[l]}> (Level ${l})`;
            break;
        }
    }

    const currentXPStr = (progress.currentXP || 0).toLocaleString();
    const neededXPStr = (progress.neededXP || 0).toLocaleString();
    const totalXPStr = (progress.totalXP || 0).toLocaleString();
    const msgsStr = totalMsgs.toLocaleString();

    return createEmbed({
        color: config.COLORS.LEVEL,
        title: `${target.username}'s Level`,
        thumbnail: target.displayAvatarURL({ dynamic: true }),
        fields: [
            { name: 'Rank', value: `#${rank > 0 ? rank : '?'}`, inline: true },
            { name: 'Level', value: `${lvl}`, inline: true },
            { name: 'Total XP', value: `${totalXPStr}`, inline: true },
            { name: 'Progress', value: `${bar} ${progress.percentage || 0}%\n${currentXPStr} / ${neededXPStr} XP`, inline: false },
            { name: 'Messages', value: `${msgsStr}`, inline: true },
            { name: 'Current Role', value: currentReward, inline: true },
            { name: 'Next Reward', value: nextReward, inline: true },
        ],
        footer: 'Keep chatting to level up!',
    });
}
