const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed, modEmbed } = require('../../utils/embeds');
const { canModerate } = require('../../utils/permissions');
const db = require('../../database/db');
const config = require('../../config');
const { sendLog } = require('../../systems/logging');

const { resolveMember } = require('../../utils/resolver');

module.exports = {
  name: 'kick',
  aliases: ['k'],
  description: 'Kicks a user from the server',
  category: 'staff',
  slashData: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kicks a user from the server')
    .addUserOption(option => option.setName('user').setDescription('The user to kick').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('The reason for kicking'))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.KickMembers)) return message.reply({ embeds: [errorEmbed('You do not have permission to use this command.')] });
    if (!args[0]) return message.reply({ embeds: [errorEmbed('Please mention a user, or provide their name/ID.\nExample: `?kick LeonW` or `?kick 123456789`')] });

    const target = await resolveMember(message.guild, args[0]);
    if (!target) return message.reply({ embeds: [errorEmbed(`Could not find any user matching \`${args[0]}\`.`)] });
    if (!canModerate(message.member, target)) return message.reply({ embeds: [errorEmbed('You cannot kick this user.')] });

    const reason = args.slice(1).join(' ') || 'No reason provided';
    
    try {
      await target.send({ embeds: [modEmbed('Kicked', `You have been kicked from ${message.guild.name}. Reason: ${reason}`)] }).catch(() => {});
      await target.kick(reason);
      await db.addModLog({ action: 'Kick', moderatorId: message.author.id, targetId: target.id, reason });
      await sendLog(message.guild, 'User Kicked', `**User:** ${target.user.tag}\n**Moderator:** ${message.author.tag}\n**Reason:** ${reason}`, [], config.COLORS.MODERATION);
      return message.reply({ embeds: [successEmbed(`Kicked ${target.user.tag} successfully.`)] });
    } catch (err) {
      return message.reply({ embeds: [errorEmbed('Failed to kick the user.')] });
    }
  },
  async slashExecute(interaction, client) {
    const target = interaction.options.getMember('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    if (!target) return interaction.reply({ embeds: [errorEmbed('Invalid user provided.')], ephemeral: true });
    if (!canModerate(interaction.member, target)) return interaction.reply({ embeds: [errorEmbed('You cannot kick this user.')], ephemeral: true });

    try {
      await target.send({ embeds: [modEmbed('Kicked', `You have been kicked from ${interaction.guild.name}. Reason: ${reason}`)] }).catch(() => {});
      await target.kick(reason);
      await db.addModLog({ action: 'Kick', moderatorId: interaction.user.id, targetId: target.id, reason });
      await sendLog(interaction.guild, 'User Kicked', `**User:** ${target.user.tag}\n**Moderator:** ${interaction.user.tag}\n**Reason:** ${reason}`, [], config.COLORS.MODERATION);
      return interaction.reply({ embeds: [successEmbed(`Kicked ${target.user.tag} successfully.`)] });
    } catch (err) {
      return interaction.reply({ embeds: [errorEmbed('Failed to kick the user.')], ephemeral: true });
    }
  }
};
