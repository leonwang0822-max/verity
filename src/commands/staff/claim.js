const { SlashCommandBuilder } = require('discord.js');
const { claimTicket } = require('../../systems/tickets');

module.exports = {
    name: 'claim',
    aliases: ['claimticket'],
    description: 'Claim a ticket channel as staff and rename the channel with claimed-.',
    category: 'staff',
    slashData: new SlashCommandBuilder()
        .setName('claim')
        .setDescription('Claim a ticket channel as staff and rename the channel with claimed-.'),

    async execute(message, args, client) {
        await claimTicket(message, message.member);
    },

    async slashExecute(interaction, client) {
        await claimTicket(interaction, interaction.member);
    }
};
