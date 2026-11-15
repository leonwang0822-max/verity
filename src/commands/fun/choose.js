const { SlashCommandBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    name: 'choose',
    aliases: ['pick', 'decide'],
    description: 'Choose randomly from a list of options.',
    category: 'fun',
    slashData: new SlashCommandBuilder()
        .setName('choose')
        .setDescription('Choose randomly from a list of options.')
        .addStringOption(option => 
            option.setName('choices')
                .setDescription('Comma-separated choices (e.g. apple, banana, orange)')
                .setRequired(true)
        ),
    execute: async (message, args, client) => {
        if (!args.length) return message.reply({ embeds: [errorEmbed('Please provide some choices separated by commas.')] });
        
        const input = args.join(' ');
        const choicesList = input.split(',').map(c => c.trim()).filter(c => c.length > 0);
        
        if (choicesList.length < 2) return message.reply({ embeds: [errorEmbed('Please provide at least 2 choices separated by commas.')] });
        
        const chosen = choicesList[Math.floor(Math.random() * choicesList.length)];
        return message.reply({ embeds: [successEmbed(`From your choices, I pick:\n\n**${chosen}**`).setTitle('🤔 Choice')] });
    },
    slashExecute: async (interaction, client) => {
        const input = interaction.options.getString('choices');
        const choicesList = input.split(',').map(c => c.trim()).filter(c => c.length > 0);
        
        if (choicesList.length < 2) return interaction.reply({ embeds: [errorEmbed('Please provide at least 2 choices separated by commas.')] });
        
        const chosen = choicesList[Math.floor(Math.random() * choicesList.length)];
        return interaction.reply({ embeds: [successEmbed(`From your choices, I pick:\n\n**${chosen}**`).setTitle('🤔 Choice')] });
    }
};
