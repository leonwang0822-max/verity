const { createEmbed } = require('../../utils/embeds');
const { resetSentence, getCurrentSentence } = require('../../systems/oneWordStory');
const config = require('../../config');

module.exports = {
    name: 'resetstory',
    description: 'Reset the current one-word sentence progress and turn tracker',
    usage: '?resetstory',
    category: 'staff',
    async execute(message, args, client) {
        const previous = getCurrentSentence();
        resetSentence();

        const embed = createEmbed({
            color: config.COLORS.SUCCESS || 0x57F287,
            title: '🔄 One-Word Sentence Reset',
            description: `The one-word sentence progress and turn tracker have been reset by ${message.author}!\n\n` +
                         `📖 **Previous Words Cleared:** "${previous || '*(None)*'}"\n` +
                         `✨ **New Round:** Anyone can now start the new sentence!`,
            footer: config.BOT_FOOTER
        });

        return message.reply({ embeds: [embed] });
    }
};
