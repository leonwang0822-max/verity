const { SlashCommandBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    name: 'reverse',
    aliases: ['rev'],
    description: 'Reverse text.',
    category: 'fun',
    slashData: new SlashCommandBuilder()
        .setName('reverse')
        .setDescription('Reverse text.')
        .addStringOption(option => 
            option.setName('text')
                .setDescription('The text to reverse')
                .setRequired(true)
        ),
    execute: async (message, args, client) => {
        if (!args.length) return message.reply({ embeds: [errorEmbed('Please provide text to reverse!')] });
        const text = args.join(' ');
        const reversed = text.split('').reverse().join('');
        return message.reply({ embeds: [successEmbed(`**Original:** ${text}\n**Reversed:** ${reversed}`).setTitle('🔄 Reversed Text')] });
    },
    slashExecute: async (interaction, client) => {
        const text = interaction.options.getString('text');
        const reversed = text.split('').reverse().join('');
        return interaction.reply({ embeds: [successEmbed(`**Original:** ${text}\n**Reversed:** ${reversed}`).setTitle('🔄 Reversed Text')] });
    }
};
