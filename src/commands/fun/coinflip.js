const { SlashCommandBuilder } = require('discord.js');
const { successEmbed } = require('../../utils/embeds');

module.exports = {
    name: 'coinflip',
    aliases: ['flip', 'cf'],
    description: 'Flip a coin.',
    category: 'fun',
    slashData: new SlashCommandBuilder()
        .setName('coinflip')
        .setDescription('Flip a coin.'),
    execute: async (message, args, client) => {
        const result = Math.random() < 0.5 ? 'Heads' : 'Tails';
        const embed = successEmbed(`The coin landed on **${result}**! 🪙`);
        return message.reply({ embeds: [embed] });
    },
    slashExecute: async (interaction, client) => {
        const result = Math.random() < 0.5 ? 'Heads' : 'Tails';
        const embed = successEmbed(`The coin landed on **${result}**! 🪙`);
        return interaction.reply({ embeds: [embed] });
    }
};
