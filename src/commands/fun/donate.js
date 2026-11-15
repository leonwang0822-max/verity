// LumeBot — Donate Command
const { createEmbed } = require('../../utils/embeds');

module.exports = {
    name: 'donate',
    description: 'Support Verity Bot server hosting with a donation.',
    category: 'fun',
    async execute(message, args, client) {
        // Automatically delete the user's ?donate command message instantly
        await message.delete().catch(() => {});

        const embed = createEmbed({
            color: '#FF69B4',
            title: '💖 Support Verity Bot Server Hosting!',
            description: `Hosting high-performance servers to keep Verity online 24/7 requires a lot of money and resources.\n\nIf you enjoy using the bot, please consider supporting us!\n\n👉 **Donate Here:** https://leonw.store/donate/1`,
            footer: 'Thank you so much for your support! 💖'
        });

        return message.channel.send({ embeds: [embed] }).catch(() => {});
    },

    async slashExecute(interaction, client) {
        const embed = createEmbed({
            color: '#FF69B4',
            title: '💖 Support Verity Bot Server Hosting!',
            description: `Hosting high-performance servers to keep Verity online 24/7 requires a lot of money and resources.\n\nIf you enjoy using the bot, please consider supporting us!\n\n👉 **Donate Here:** https://leonw.store/donate/1`,
            footer: 'Thank you so much for your support! 💖'
        });

        return interaction.reply({ embeds: [embed] }).catch(() => {});
    }
};
