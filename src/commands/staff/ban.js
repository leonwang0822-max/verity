const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed, modEmbed } = require('../../utils/embeds');
const { canModerate } = require('../../utils/permissions');
const db = require('../../database/db');
const config = require('../../config');
const { sendLog } = require('../../systems/logging');

const { resolveUser } = require('../../utils/resolver');

module.exports = {
  name: 'ban',
  aliases: ['b'],
  description: 'Bans a user from the server',
  category: 'staff',
  slashData: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Bans a user from the server')
    .addUserOption(option => option.setName('user').setDescription('The user to ban').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('The reason for banning'))
    .addIntegerOption(option => option.setName('delete_messages').setDescription('Days of messages to delete (0-7)').setMinValue(0).setMaxValue(7))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) return message.reply({ embeds: [errorEmbed('You do not have permission to use this command.')] });
    if (!args[0]) return message.reply({ embeds: [errorEmbed('Please mention a user, or provide their name/ID.\nExample: `?ban Spammer` or `?ban 123456789`')] });

    const targetUser = await resolveUser(client, message.guild, args[0]);
    if (!targetUser) return message.reply({ embeds: [errorEmbed(`Could not find any user matching \`${args[0]}\`.`)] });
    if (targetUser.id === '1488316093964746872') return message.reply({ embeds: [errorEmbed('You cannot ban this user.')] });

    const targetMember = message.guild.members.cache.get(targetUser.id);
    if (targetMember && !canModerate(message.member, targetMember)) return message.reply({ embeds: [errorEmbed('You cannot ban this user.')] });

    const reason = args.slice(1).join(' ') || 'No reason provided';
    
    try {
      await targetUser.send({ embeds: [modEmbed('Banned', `You have been banned from ${message.guild.name}. Reason: ${reason}`)] }).catch(() => {});
      await message.guild.members.ban(targetUser.id, { reason, deleteMessageSeconds: 0 });
      await db.addModLog({ action: 'Ban', moderatorId: message.author.id, targetId: targetUser.id, reason });
      await sendLog(message.guild, 'User Banned', `**User:** ${targetUser.tag}\n**Moderator:** ${message.author.tag}\n**Reason:** ${reason}`, [], config.COLORS.MODERATION);
      return message.reply({ embeds: [successEmbed(`Banned ${targetUser.tag} successfully.`)] });
    } catch (err) {
      return message.reply({ embeds: [errorEmbed('Failed to ban the user.')] });
    }
  },
  async slashExecute(interaction, client) {
    const target = interaction.options.getMember('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const deleteDays = interaction.options.getInteger('delete_messages') || 0;

    if (!target) return interaction.reply({ embeds: [errorEmbed('Invalid user provided.')], ephemeral: true });
    if (!canModerate(interaction.member, target)) return interaction.reply({ embeds: [errorEmbed('You cannot ban this user.')], ephemeral: true });

    try {
      await target.send({ embeds: [modEmbed('Banned', `You have been banned from ${interaction.guild.name}. Reason: ${reason}`)] }).catch(() => {});
      await target.ban({ reason, deleteMessageSeconds: deleteDays * 86400 });
      await db.addModLog({ action: 'Ban', moderatorId: interaction.user.id, targetId: target.id, reason });
      await sendLog(interaction.guild, 'User Banned', `**User:** ${target.user.tag}\n**Moderator:** ${interaction.user.tag}\n**Reason:** ${reason}`, [], config.COLORS.MODERATION);
      return interaction.reply({ embeds: [successEmbed(`Banned ${target.user.tag} successfully.`)] });
    } catch (err) {
      return interaction.reply({ embeds: [errorEmbed('Failed to ban the user.')], ephemeral: true });
    }
  }
};
