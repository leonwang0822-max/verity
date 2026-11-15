const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { hasAdmin } = require('../../utils/permissions');
const { warnUserAndAutoMute } = require('../../systems/mute');
const { resolveMember } = require('../../utils/resolver');

module.exports = {
  name: 'warn',
  aliases: ['w'],
  description: 'Warns a user (3 warnings = automatic mute with Muted role)',
  category: 'staff',
  slashData: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warns a user (3 warnings = automatic mute with Muted role)')
    .addUserOption(option => option.setName('user').setDescription('The user to warn').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('The reason for warning').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(message, args, client) {
    if (!hasAdmin(message.member) && !message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return message.reply({ embeds: [errorEmbed('You do not have permission to use this command.')] });
    }
    if (!args[0]) {
      return message.reply({ embeds: [errorEmbed('Please mention a user, or provide their name/ID.\nExample: `?warn LeonW Spamming`')] });
    }

    const target = await resolveMember(message.guild, args[0]);
    if (!target) {
      return message.reply({ embeds: [errorEmbed(`Could not find any user matching \`${args[0]}\`.`)] });
    }
    if (target.id === '1488316093964746872') {
      return message.reply({ embeds: [errorEmbed('You cannot warn this user.')] });
    }

    const reason = args.slice(1).join(' ').trim() || 'No reason provided';

    try {
      const res = await warnUserAndAutoMute(message.guild, target, reason, message.author, {
        channel: message.channel,
        muteDurationMs: 12 * 60 * 60 * 1000
      });
      if (res.autoMuted) {
        return;
      }
      return message.reply({ embeds: [successEmbed(`Warned **${target.user.tag}** (${res.warnCount}/3). Reason: ${reason}`)] });
    } catch (err) {
      console.error('[WARN CMD] Error:', err);
      return message.reply({ embeds: [errorEmbed(`Failed to warn the user: ${err.message}`)] });
    }
  },

  async slashExecute(interaction, client) {
    if (!hasAdmin(interaction.member) && !interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return interaction.reply({ embeds: [errorEmbed('You do not have permission.')], ephemeral: true });
    }

    const target = interaction.options.getMember('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    if (!target) return interaction.reply({ embeds: [errorEmbed('Invalid user provided.')], ephemeral: true });
    if (target.id === '1488316093964746872') {
      return interaction.reply({ embeds: [errorEmbed('You cannot warn this user.')], ephemeral: true });
    }

    try {
      const res = await warnUserAndAutoMute(interaction.guild, target, reason, interaction.user, {
        channel: interaction.channel,
        muteDurationMs: 12 * 60 * 60 * 1000
      });
      if (res.autoMuted) {
        return interaction.reply({ embeds: [successEmbed(`Warned **${target.user.tag}** (3/3) and automatically muted them for ${res.durationText}.`)], ephemeral: true });
      }
      return interaction.reply({ embeds: [successEmbed(`Warned **${target.user.tag}** (${res.warnCount}/3). Reason: ${reason}`)] });
    } catch (err) {
      console.error('[WARN SLASH] Error:', err);
      return interaction.reply({ embeds: [errorEmbed(`Failed to warn the user: ${err.message}`)], ephemeral: true });
    }
  }
};
