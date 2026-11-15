const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { approveTicket } = require('../../systems/tickets');

module.exports = {
    name: 'approve',
    aliases: ['approveticket', 'acceptapp'],
    description: 'Approve a staff application ticket, grant Trial Moderator role, and prompt for closing.',
    category: 'staff',
    slashData: new SlashCommandBuilder()
        .setName('approve')
        .setDescription('Approve a staff application ticket, grant Trial Moderator role, and prompt for closing.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

    async execute(message, args, client) {
        await approveTicket(message, message.member);
    },

    async slashExecute(interaction, client) {
        await approveTicket(interaction, interaction.member);
    }
};
