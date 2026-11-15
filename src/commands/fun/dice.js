const { SlashCommandBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    name: 'dice',
    aliases: ['roll', 'rolldice'],
    description: 'Roll some dice.',
    category: 'fun',
    slashData: new SlashCommandBuilder()
        .setName('dice')
        .setDescription('Roll some dice.')
        .addIntegerOption(option => option.setName('sides').setDescription('Number of sides (default 6)').setMinValue(2).setMaxValue(100))
        .addIntegerOption(option => option.setName('count').setDescription('Number of dice (default 1)').setMinValue(1).setMaxValue(20)),
    execute: async (message, args, client) => {
        let sides = 6;
        let count = 1;
        if (args.length > 0) sides = parseInt(args[0]) || 6;
        if (args.length > 1) count = parseInt(args[1]) || 1;
        
        if (sides < 2 || sides > 100) return message.reply({ embeds: [errorEmbed('Sides must be between 2 and 100.')] });
        if (count < 1 || count > 20) return message.reply({ embeds: [errorEmbed('Count must be between 1 and 20.')] });

        const results = Array.from({ length: count }, () => Math.floor(Math.random() * sides) + 1);
        const total = results.reduce((a, b) => a + b, 0);
        
        const embed = successEmbed(`Rolled ${count}d${sides}\n**Results:** ${results.join(', ')}\n**Total:** ${total}`);
        embed.setTitle('🎲 Dice Roll');
        return message.reply({ embeds: [embed] });
    },
    slashExecute: async (interaction, client) => {
        const sides = interaction.options.getInteger('sides') || 6;
        const count = interaction.options.getInteger('count') || 1;

        const results = Array.from({ length: count }, () => Math.floor(Math.random() * sides) + 1);
        const total = results.reduce((a, b) => a + b, 0);
        
        const embed = successEmbed(`Rolled ${count}d${sides}\n**Results:** ${results.join(', ')}\n**Total:** ${total}`);
        embed.setTitle('🎲 Dice Roll');
        return interaction.reply({ embeds: [embed] });
    }
};
