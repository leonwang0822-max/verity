const { SlashCommandBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    name: 'rate',
    aliases: ['rating'],
    description: 'Rate something out of 10.',
    category: 'fun',
    slashData: new SlashCommandBuilder()
        .setName('rate')
        .setDescription('Rate something out of 10.')
        .addStringOption(option => 
            option.setName('thing')
                .setDescription('The thing to rate')
                .setRequired(true)
        ),
    execute: async (message, args, client) => {
        if (!args.length) return message.reply({ embeds: [errorEmbed('Please provide something to rate!')] });
        const thing = args.join(' ');
        const rating = Math.floor(Math.random() * 11);
        let comment = '';
        
        if (rating <= 3) comment = "Yikes... not great.";
        else if (rating <= 6) comment = "Pretty average.";
        else if (rating <= 9) comment = "Solid! Very nice.";
        else comment = "Absolutely flawless!";

        return message.reply({ embeds: [successEmbed(`I rate **${thing}** a **${rating}/10**.\n\n*${comment}*`).setTitle('⭐ Rating')] });
    },
    slashExecute: async (interaction, client) => {
        const thing = interaction.options.getString('thing');
        const rating = Math.floor(Math.random() * 11);
        let comment = '';
        
        if (rating <= 3) comment = "Yikes... not great.";
        else if (rating <= 6) comment = "Pretty average.";
        else if (rating <= 9) comment = "Solid! Very nice.";
        else comment = "Absolutely flawless!";

        return interaction.reply({ embeds: [successEmbed(`I rate **${thing}** a **${rating}/10**.\n\n*${comment}*`).setTitle('⭐ Rating')] });
    }
};
