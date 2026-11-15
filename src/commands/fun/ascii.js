const { SlashCommandBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');

const ASCII_MAP = {
    'A': [' ### ', '#   #', '#####', '#   #', '#   #'],
    'B': ['#### ', '#   #', '#### ', '#   #', '#### '],
    'C': [' ####', '#    ', '#    ', '#    ', ' ####'],
    'D': ['#### ', '#   #', '#   #', '#   #', '#### '],
    'E': ['#####', '#    ', '#### ', '#    ', '#####'],
    'F': ['#####', '#    ', '#### ', '#    ', '#    '],
    'G': [' ####', '#    ', '#  ##', '#   #', ' ####'],
    'H': ['#   #', '#   #', '#####', '#   #', '#   #'],
    'I': [' ### ', '  #  ', '  #  ', '  #  ', ' ### '],
    'J': ['    #', '    #', '    #', '#   #', ' ### '],
    'K': ['#   #', '#  # ', '###  ', '#  # ', '#   #'],
    'L': ['#    ', '#    ', '#    ', '#    ', '#####'],
    'M': ['#   #', '## ##', '# # #', '#   #', '#   #'],
    'N': ['#   #', '##  #', '# # #', '#  ##', '#   #'],
    'O': [' ### ', '#   #', '#   #', '#   #', ' ### '],
    'P': ['#### ', '#   #', '#### ', '#    ', '#    '],
    'Q': [' ### ', '#   #', '# # #', '#  ##', ' ####'],
    'R': ['#### ', '#   #', '#### ', '#  # ', '#   #'],
    'S': [' ####', '#    ', ' ### ', '    #', '#### '],
    'T': ['#####', '  #  ', '  #  ', '  #  ', '  #  '],
    'U': ['#   #', '#   #', '#   #', '#   #', ' ### '],
    'V': ['#   #', '#   #', '#   #', ' # # ', '  #  '],
    'W': ['#   #', '#   #', '# # #', '## ##', '#   #'],
    'X': ['#   #', ' # # ', '  #  ', ' # # ', '#   #'],
    'Y': ['#   #', ' # # ', '  #  ', '  #  ', '  #  '],
    'Z': ['#####', '   # ', '  #  ', ' #   ', '#####'],
    ' ': ['     ', '     ', '     ', '     ', '     ']
};

module.exports = {
    name: 'ascii',
    aliases: ['block'],
    description: 'Convert text to simple block letters.',
    category: 'fun',
    slashData: new SlashCommandBuilder()
        .setName('ascii')
        .setDescription('Convert text to simple block letters.')
        .addStringOption(option => 
            option.setName('text')
                .setDescription('The text to convert')
                .setRequired(true)
                .setMaxLength(10)
        ),
    execute: async (message, args, client) => {
        if (!args.length) return message.reply({ embeds: [errorEmbed('Please provide text to convert (max 10 chars).')] });
        const text = args.join(' ').toUpperCase().substring(0, 10);
        
        let output = ['```\n', '', '', '', '', '', '```'];
        for (const char of text) {
            const block = ASCII_MAP[char] || ASCII_MAP[' '];
            for (let i = 0; i < 5; i++) {
                output[i + 1] += block[i] + '  ';
            }
        }
        
        return message.reply(output.join('\n'));
    },
    slashExecute: async (interaction, client) => {
        const text = interaction.options.getString('text').toUpperCase().substring(0, 10);
        
        let output = ['```\n', '', '', '', '', '', '```'];
        for (const char of text) {
            const block = ASCII_MAP[char] || ASCII_MAP[' '];
            for (let i = 0; i < 5; i++) {
                output[i + 1] += block[i] + '  ';
            }
        }
        
        return interaction.reply(output.join('\n'));
    }
};
