const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const db = require('../../database/db');
const { sendLog } = require('../../systems/logging');

module.exports = {
    name: 'purge',
    aliases: ['clear', 'prune'],
    description: 'Bulk delete messages.',
    category: 'staff',
    slashData: new SlashCommandBuilder()
        .setName('purge')
        .setDescription('Bulk delete messages.')
        .addIntegerOption(o => o.setName('amount').setDescription('Number of messages (1-100)').setMinValue(1).setMaxValue(100).setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(message, args, client) {
        const amount = parseInt(args[0]);
        if (!amount || amount < 1 || amount > 100) return message.reply({ embeds: [errorEmbed('Please specify a number between 1 and 100.')] });

        try {
            const deleted = await message.channel.bulkDelete(amount + 1, true); // +1 to include the command message
            db.addModLog({ action: 'PURGE', moderatorId: message.author.id, targetId: message.channel.id, reason: `${deleted.size - 1} messages` });
            sendLog(message.guild, 'Messages Purged', `**Channel:** ${message.channel}\n**Moderator:** ${message.author}\n**Count:** ${deleted.size - 1}`);
            const reply = await message.channel.send({ embeds: [successEmbed(`Deleted ${deleted.size - 1} messages.`)] });
            setTimeout(() => reply.delete().catch(() => {}), 3000);
        } catch (e) {
            return message.reply({ embeds: [errorEmbed('Failed to purge messages. Messages older than 14 days cannot be bulk deleted.')] });
        }
    },

    async slashExecute(interaction, client) {
        const amount = interaction.options.getInteger('amount');
        try {
            const deleted = await interaction.channel.bulkDelete(amount, true);
            db.addModLog({ action: 'PURGE', moderatorId: interaction.user.id, targetId: interaction.channel.id, reason: `${deleted.size} messages` });
            sendLog(interaction.guild, 'Messages Purged', `**Channel:** ${interaction.channel}\n**Moderator:** ${interaction.user}\n**Count:** ${deleted.size}`);
            return interaction.reply({ embeds: [successEmbed(`Deleted ${deleted.size} messages.`)], ephemeral: true });
        } catch (e) {
            return interaction.reply({ embeds: [errorEmbed('Failed to purge. Messages older than 14 days cannot be bulk deleted.')], ephemeral: true });
        }
    },
};
