const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const { getCurrentSentence, resetSentence, ONE_WORD_CHANNEL_ID } = require('../../systems/oneWordStory');
const { hasAdmin } = require('../../utils/permissions');

module.exports = {
    name: 'sentence',
    aliases: ['story', 'oneword'],
    description: 'Check the current one-word sentence in progress or reset it (staff).',
    category: 'fun',
    slashData: new SlashCommandBuilder()
        .setName('sentence')
        .setDescription('Check or reset the current one-word sentence game.')
        .addStringOption(opt =>
            opt.setName('action')
               .setDescription('Action to perform (view / reset)')
               .setRequired(false)
               .addChoices(
                   { name: 'view', value: 'view' },
                   { name: 'reset', value: 'reset' }
               )
        ),

    async execute(message, args, client) {
        const sub = args[0] ? args[0].toLowerCase() : 'view';

        if (sub === 'reset') {
            if (!hasAdmin(message.member)) {
                return message.reply({ embeds: [errorEmbed('Only staff/admins can reset the sentence game.')] });
            }
            resetSentence();
            return message.reply({ embeds: [successEmbed('The one-word sentence game has been manually reset!')] });
        }

        const current = getCurrentSentence();
        const embed = createEmbed({
            color: 0x5865F2,
            title: '📖 One-Word Sentence in Progress',
            description: current ? `> **"${current}"**` : '*(No sentence currently in progress. Start one by typing a word in <#' + ONE_WORD_CHANNEL_ID + '>!)*'
        });

        await message.reply({ embeds: [embed] });
    },

    async slashExecute(interaction, client) {
        const sub = interaction.options.getString('action') || 'view';

        if (sub === 'reset') {
            if (!hasAdmin(interaction.member)) {
                return interaction.reply({ embeds: [errorEmbed('Only staff/admins can reset the sentence game.')], ephemeral: true });
            }
            resetSentence();
            return interaction.reply({ embeds: [successEmbed('The one-word sentence game has been manually reset!')] });
        }

        const current = getCurrentSentence();
        const embed = createEmbed({
            color: 0x5865F2,
            title: '📖 One-Word Sentence in Progress',
            description: current ? `> **"${current}"**` : '*(No sentence currently in progress. Start one by typing a word in <#' + ONE_WORD_CHANNEL_ID + '>!)*'
        });

        await interaction.reply({ embeds: [embed] });
    }
};
