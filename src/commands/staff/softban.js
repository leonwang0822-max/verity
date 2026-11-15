const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { canModerate } = require('../../utils/permissions');
const { resolveUser } = require('../../utils/resolver');
const db = require('../../database/db');
const { sendLog } = require('../../systems/logging');

module.exports = {
    name: 'softban',
    aliases: ['sb'],
    description: 'Ban then immediately unban a user to purge their messages.',
    category: 'staff',
    slashData: new SlashCommandBuilder()
        .setName('softban')
        .setDescription('Ban then immediately unban to purge messages.')
        .addUserOption(o => o.setName('user').setDescription('The user').setRequired(true))
        .addStringOption(o => o.setName('reason').setDescription('Reason for softban').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    async execute(message, args, client) {
        if (!args[0]) return message.reply({ embeds: [errorEmbed('Please specify a user by mention, ID, or name.\nExample: `?softban Spammer spamming`')] });

        const target = await resolveUser(client, message.guild, args[0]);
        if (!target) return message.reply({ embeds: [errorEmbed(`Could not find any user matching \`${args[0]}\`.`)] });

        const member = message.guild.members.cache.get(target.id);
        if (member && !canModerate(message.member, member)) {
            return message.reply({ embeds: [errorEmbed('You cannot moderate this user.')] });
        }

        const reason = args.slice(1).join(' ') || 'No reason provided';

        try {
            // DM the user
            await target.send(`You have been softbanned from **${message.guild.name}**. Reason: ${reason}`).catch(() => {});
            // Ban with message deletion then immediately unban
            await message.guild.members.ban(target.id, { deleteMessageSeconds: 604800, reason: `[Softban] ${reason}` });
            await message.guild.members.unban(target.id, 'Softban — auto-unban');
            db.addModLog({ action: 'SOFTBAN', moderatorId: message.author.id, targetId: target.id, reason });
            sendLog(message.guild, 'User Softbanned', `**User:** ${target.tag} (${target.id})\n**Moderator:** ${message.author}\n**Reason:** ${reason}`);
            return message.reply({ embeds: [successEmbed(`Softbanned ${target.tag}. Their messages have been cleared.`)] });
        } catch (e) {
            return message.reply({ embeds: [errorEmbed(`Failed to softban: ${e.message}`)] });
        }
    },

    async slashExecute(interaction, client) {
        const target = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'No reason provided';

        const member = interaction.guild.members.cache.get(target.id);
        if (member && !canModerate(interaction.member, member)) {
            return interaction.reply({ embeds: [errorEmbed('You cannot moderate this user.')], ephemeral: true });
        }

        try {
            await target.send(`You have been softbanned from **${interaction.guild.name}**. Reason: ${reason}`).catch(() => {});
            await interaction.guild.members.ban(target.id, { deleteMessageSeconds: 604800, reason: `[Softban] ${reason}` });
            await interaction.guild.members.unban(target.id, 'Softban — auto-unban');
            db.addModLog({ action: 'SOFTBAN', moderatorId: interaction.user.id, targetId: target.id, reason });
            sendLog(interaction.guild, 'User Softbanned', `**User:** ${target.tag} (${target.id})\n**Moderator:** ${interaction.user}\n**Reason:** ${reason}`);
            return interaction.reply({ embeds: [successEmbed(`Softbanned ${target.tag}. Their messages have been cleared.`)] });
        } catch (e) {
            return interaction.reply({ embeds: [errorEmbed(`Failed to softban: ${e.message}`)], ephemeral: true });
        }
    },
};
