const { SlashCommandBuilder } = require('discord.js');
const { successEmbed } = require('../../utils/embeds');

const MEMES = [
    "When you fix a bug but create 10 more.",
    "Me explaining to my rubber duck why the code isn't working.",
    "StackOverflow is down. Programmers everywhere: *panics*",
    "I don't always test my code, but when I do, I do it in production.",
    "My code doesn't work, I have no idea why. My code works, I have no idea why.",
    "99 little bugs in the code. Take one down, patch it around... 127 little bugs in the code.",
    "Programmer (noun): An organism that converts caffeine into code.",
    "Why do programmers prefer dark mode? Because light attracts bugs.",
    "There are 10 types of people in the world: those who understand binary, and those who don't.",
    "Client: It's just a small change. Dev: *Cries internally*",
    "A SQL query goes into a bar, walks up to two tables and asks: 'Can I join you?'",
    "How do you comfort a JavaScript bug? You console it.",
    "To understand what recursion is, you must first understand recursion.",
    "Commit early, push often... and hope for the best.",
    "I'm not lazy, I'm just executing my energy-saving mode.",
    "The code was working yesterday... what did I touch?",
    "Documentation? We don't need no stinking documentation!",
    "It works on my machine ¯\\_(ツ)_/¯",
    "Git commit -m 'Fixed typo... again.'",
    "Ctrl+C, Ctrl+V: The developer's best friend.",
    "Debugging is like being the detective in a crime movie where you are also the murderer.",
    "That moment when you realize you've been editing the wrong file.",
    "Just one more line of code before bed... *sun rises*",
    "User: The app crashed. Dev: Works perfectly for me.",
    "Frontend devs: *centers a div*. Backend devs: *sorcery*.",
    "I need a break. Let me compile this real quick.",
    "When the code compiles on the first try... suspiciously.",
    "What's the object-oriented way to become wealthy? Inheritance.",
    "There is no cloud, just someone else's computer.",
    "Sleep? I can sleep when the sprint is over.",
    "When you find the solution on a 5-year-old forum post but the link is dead."
];

module.exports = {
    name: 'meme',
    aliases: ['joke-meme'],
    description: 'Get a random programming meme or joke.',
    category: 'fun',
    slashData: new SlashCommandBuilder()
        .setName('meme')
        .setDescription('Get a random programming meme or joke.'),
    execute: async (message, args, client) => {
        const meme = MEMES[Math.floor(Math.random() * MEMES.length)];
        return message.reply({ embeds: [successEmbed(meme).setTitle('😂 Meme')] });
    },
    slashExecute: async (interaction, client) => {
        const meme = MEMES[Math.floor(Math.random() * MEMES.length)];
        return interaction.reply({ embeds: [successEmbed(meme).setTitle('😂 Meme')] });
    }
};
