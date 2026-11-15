const { SlashCommandBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');

const choices = ['rock', 'paper', 'scissors'];
const emojis = { rock: '🪨', paper: '📄', scissors: '✂️' };

module.exports = {
    name: 'rps',
    aliases: ['rockpaperscissors'],
    description: 'Play Rock Paper Scissors.',
    category: 'fun',
    slashData: new SlashCommandBuilder()
        .setName('rps')
        .setDescription('Play Rock Paper Scissors.')
        .addStringOption(option => 
            option.setName('choice')
                .setDescription('Your choice')
                .setRequired(true)
                .addChoices(
                    { name: 'Rock', value: 'rock' },
                    { name: 'Paper', value: 'paper' },
                    { name: 'Scissors', value: 'scissors' }
                )
        ),
    execute: async (message, args, client) => {
        if (!args[0]) return message.reply({ embeds: [errorEmbed('Please choose rock, paper, or scissors.')] });
        const userChoice = args[0].toLowerCase();
        if (!choices.includes(userChoice)) return message.reply({ embeds: [errorEmbed('Invalid choice! Please choose rock, paper, or scissors.')] });
        
        const botChoice = choices[Math.floor(Math.random() * choices.length)];
        let result = '';

        if (userChoice === botChoice) result = "It's a tie!";
        else if (
            (userChoice === 'rock' && botChoice === 'scissors') ||
            (userChoice === 'paper' && botChoice === 'rock') ||
            (userChoice === 'scissors' && botChoice === 'paper')
        ) result = 'You win!';
        else result = 'I win!';

        const embed = successEmbed(`You chose **${userChoice}** ${emojis[userChoice]}\nI chose **${botChoice}** ${emojis[botChoice]}\n\n**${result}**`);
        return message.reply({ embeds: [embed] });
    },
    slashExecute: async (interaction, client) => {
        const userChoice = interaction.options.getString('choice');
        const botChoice = choices[Math.floor(Math.random() * choices.length)];
        let result = '';

        if (userChoice === botChoice) result = "It's a tie!";
        else if (
            (userChoice === 'rock' && botChoice === 'scissors') ||
            (userChoice === 'paper' && botChoice === 'rock') ||
            (userChoice === 'scissors' && botChoice === 'paper')
        ) result = 'You win!';
        else result = 'I win!';

        const embed = successEmbed(`You chose **${userChoice}** ${emojis[userChoice]}\nI chose **${botChoice}** ${emojis[botChoice]}\n\n**${result}**`);
        return interaction.reply({ embeds: [embed] });
    }
};
