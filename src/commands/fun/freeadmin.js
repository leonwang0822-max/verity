// Verity Bot — Free Admin Command (Rickroll Troll)
const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    name: 'freeadmin',
    aliases: ['admin', 'getadmin', 'claimadmin'],
    description: 'Click the button below for free admin',
    category: 'fun',
    slashData: new SlashCommandBuilder()
        .setName('freeadmin')
        .setDescription('Click the button below for free admin'),

    async execute(message, args, client) {
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('free_admin_claim')
                .setLabel('Claim Free Admin')
                .setStyle(ButtonStyle.Success)
                .setEmoji('👑')
        );

        return message.channel.send({
            content: 'Click the button below for free admin',
            components: [row]
        }).catch(() => {});
    },

    async slashExecute(interaction, client) {
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('free_admin_claim')
                .setLabel('Claim Free Admin')
                .setStyle(ButtonStyle.Success)
                .setEmoji('👑')
        );

        return interaction.reply({
            content: 'Click the button below for free admin',
            components: [row]
        }).catch(() => {});
    }
};
