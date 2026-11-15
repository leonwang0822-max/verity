const { SlashCommandBuilder } = require('discord.js');
const { successEmbed } = require('../../utils/embeds');

const ANSWERS = [
    "It is certain.", "It is decidedly so.", "Without a doubt.", "Yes - definitely.",
    "You may rely on it.", "As I see it, yes.", "Most likely.", "Outlook good.",
    "Yes.", "Signs point to yes.", "Reply hazy, try again.", "Ask again later.",
    "Better not tell you now.", "Cannot predict now.", "Concentrate and ask again.",
    "Don't count on it.", "My reply is no.", "My sources say no.",
    "Outlook not so good.", "Very doubtful."
];

module.exports = {
    name: '8ball',
    aliases: ['magic8', 'eightball'],
    description: 'Ask the magic 8-ball a question.',
    category: 'fun',
    slashData: new SlashCommandBuilder()
        .setName('8ball')
        .setDescription('Ask the magic 8-ball a question.')
        .addStringOption(option =>
            option.setName('question')
                .setDescription('The question you want to ask')
                .setRequired(true)
        ),
    execute: async (message, args, client) => {
        if (!args.length) return message.reply('Please ask a question!');
        const question = args.join(' ');
        const answer = ANSWERS[Math.floor(Math.random() * ANSWERS.length)];
        const embed = successEmbed(`**Question:** ${question}\n**Answer:** ${answer}`);
        embed.setTitle('🎱 Magic 8-Ball');
        return message.reply({ embeds: [embed] });
    },
    slashExecute: async (interaction, client) => {
        const question = interaction.options.getString('question');
        const answer = ANSWERS[Math.floor(Math.random() * ANSWERS.length)];
        const embed = successEmbed(`**Question:** ${question}\n**Answer:** ${answer}`);
        embed.setTitle('🎱 Magic 8-Ball');
        return interaction.reply({ embeds: [embed] });
    }
};
