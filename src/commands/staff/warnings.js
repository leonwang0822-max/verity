const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { errorEmbed } = require('../../utils/embeds');
const db = require('../../database/db');
const config = require('../../config');

module.exports = {
  name: 'warnings',
  aliases: ['warns'],
  description: 'View warnings for a user',
  category: 'staff',
  slashData: new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('View warnings for a user')
    .addUserOption(option => option.setName('user').setDescription('The user to view warnings for').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) return message.reply({ embeds: [errorEmbed('You do not have permission to use this command.')] });
    const target = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
    if (!target) return message.reply({ embeds: [errorEmbed('Please mention a valid user or provide their ID.')] });

    try {
      const warnings = await db.getWarnings(target.id);
      if (!warnings || warnings.length === 0) {
        const embed = new EmbedBuilder().setColor(config.COLORS.SUCCESS).setDescription(`${target.user.tag} has no warnings.`);
        return message.reply({ embeds: [embed] });
      }

      let warnText = warnings.map((w, i) => `**${i + 1}.** Reason: ${w.reason} - Mod: <@${w.moderatorId}>`).join('\n');
      const embed = new EmbedBuilder().setColor(config.COLORS.WARNING).setTitle(`Warnings for ${target.user.tag}`).setDescription(warnText);
      return message.reply({ embeds: [embed] });
    } catch (err) {
      return message.reply({ embeds: [errorEmbed('Failed to fetch warnings.')] });
    }
  },
  async slashExecute(interaction, client) {
    const target = interaction.options.getMember('user');
    if (!target) return interaction.reply({ embeds: [errorEmbed('Invalid user provided.')], ephemeral: true });

    try {
      const warnings = await db.getWarnings(target.id);
      if (!warnings || warnings.length === 0) {
        const embed = new EmbedBuilder().setColor(config.COLORS.SUCCESS).setDescription(`${target.user.tag} has no warnings.`);
        return interaction.reply({ embeds: [embed] });
      }

      let warnText = warnings.map((w, i) => `**${i + 1}.** Reason: ${w.reason} - Mod: <@${w.moderatorId}>`).join('\n');
      const embed = new EmbedBuilder().setColor(config.COLORS.WARNING).setTitle(`Warnings for ${target.user.tag}`).setDescription(warnText);
      return interaction.reply({ embeds: [embed] });
    } catch (err) {
      return interaction.reply({ embeds: [errorEmbed('Failed to fetch warnings.')], ephemeral: true });
    }
  }
};
