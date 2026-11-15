const { SlashCommandBuilder } = require('discord.js');
const { successEmbed } = require('../../utils/embeds');

const JOKES = [
    { setup: "Why don't scientists trust atoms?", punchline: "Because they make up everything!" },
    { setup: "Why did the scarecrow win an award?", punchline: "Because he was outstanding in his field!" },
    { setup: "Why don't skeletons fight each other?", punchline: "They don't have the guts." },
    { setup: "What do you call fake spaghetti?", punchline: "An impasta!" },
    { setup: "What do you call a well-balanced horse?", punchline: "Stable." },
    { setup: "What do you call an angry carrot?", punchline: "A steamed veggie." },
    { setup: "Why couldn't the bicycle stand up by itself?", punchline: "It was two tired." },
    { setup: "What did one wall say to the other?", punchline: "I'll meet you at the corner." },
    { setup: "Why did the math book look sad?", punchline: "Because of all of its problems!" },
    { setup: "Why did the tomato turn red?", punchline: "Because it saw the salad dressing!" },
    { setup: "What do you call cheese that isn't yours?", punchline: "Nacho cheese!" },
    { setup: "What kind of shoes do ninjas wear?", punchline: "Sneakers!" },
    { setup: "Why did the scarecrow become a neurosurgeon?", punchline: "Because he was outstanding in his field and had a lot of brains!" },
    { setup: "What do you call a bear with no teeth?", punchline: "A gummy bear!" },
    { setup: "Why did the golfer bring two pairs of pants?", punchline: "In case he got a hole in one." },
    { setup: "What do you call a pile of cats?", punchline: "A meowtain." },
    { setup: "Why did the coffee file a police report?", punchline: "It got mugged." },
    { setup: "How does a penguin build its house?", punchline: "Igloos it together." },
    { setup: "What do you call a fake noodle?", punchline: "An impasta." },
    { setup: "Why did the computer go to the doctor?", punchline: "It had a virus!" },
    { setup: "Why do bees have sticky hair?", punchline: "Because they use a honeycomb." },
    { setup: "What do you call an alligator in a vest?", punchline: "An investigator." },
    { setup: "Why don't eggs tell jokes?", punchline: "They'd crack each other up." },
    { setup: "What did the ocean say to the shore?", punchline: "Nothing, it just waved." },
    { setup: "Why did the cookie go to the hospital?", punchline: "Because it felt crummy." }
];

module.exports = {
    name: 'joke',
    aliases: ['dadjoke'],
    description: 'Get a random joke.',
    category: 'fun',
    slashData: new SlashCommandBuilder()
        .setName('joke')
        .setDescription('Get a random joke.'),
    execute: async (message, args, client) => {
        const joke = JOKES[Math.floor(Math.random() * JOKES.length)];
        return message.reply({ embeds: [successEmbed(`**${joke.setup}**\n\n${joke.punchline}`).setTitle('🤡 Joke')] });
    },
    slashExecute: async (interaction, client) => {
        const joke = JOKES[Math.floor(Math.random() * JOKES.length)];
        return interaction.reply({ embeds: [successEmbed(`**${joke.setup}**\n\n${joke.punchline}`).setTitle('🤡 Joke')] });
    }
};
