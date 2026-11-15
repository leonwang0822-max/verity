const { SlashCommandBuilder } = require('discord.js');
const { createEmbed } = require('../../utils/embeds');
const db = require('../../database/db');
const config = require('../../config');

module.exports = {
    name: 'leaderboard',
    aliases: ['lb', 'top'],
    description: 'Show the top 10 users by XP.',
    category: 'leveling',
    slashData: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('Show the top 10 users by XP.'),

    async execute(message, args, client) {
        const embed = await buildLeaderboard(client);
        return message.reply({ embeds: [embed] }).catch(() => {});
    },

    async slashExecute(interaction, client) {
        await interaction.deferReply().catch(() => {});
        const embed = await buildLeaderboard(client);
        return interaction.editReply({ embeds: [embed] }).catch(() => {});
    }
};

async function buildLeaderboard(client) {
    const top = db.getLeaderboard(10);
    let lbText = '';

    if (!top || top.length === 0) {
        lbText = 'No users on the leaderboard yet! Start chatting to earn XP.';
    } else {
        const medals = ['🥇', '🥈', '🥉'];
        // Fetch all top users concurrently in parallel
        const userPromises = top.map(entry => 
            client.users.fetch(entry.userId).catch(() => null)
        );
        const fetchedUsers = await Promise.all(userPromises);

        for (let i = 0; i < top.length; i++) {
            const entry = top[i];
            const user = fetchedUsers[i];
            const name = user ? user.username : `User ${entry.userId}`;
            const prefix = medals[i] || `**${i + 1}.**`;
            const xp = (Number(entry.xp) || 0).toLocaleString();
            const level = Number(entry.level) || 0;
            lbText += `${prefix} **${name}** — Level ${level} • ${xp} XP\n`;
        }
    }

    return createEmbed({
        color: config.COLORS.LEVEL,
        title: '🏆 XP Leaderboard',
        description: lbText,
        footer: 'Keep chatting to climb the ranks!',
    });
}
