// Verity — Setup Panel Command
const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder
} = require('discord.js');
const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const { hasManager, hasAdmin } = require('../../utils/permissions');
const db = require('../../database/db');
const config = require('../../config');

function buildSetupPanel(guild) {
    const settings = db.getSettings();

    const embed = createEmbed({
        color: config.COLORS.PRIMARY,
        title: `⚙️ ${guild.name} — Verity Setup & Configuration Panel`,
        description: `Welcome to the **Verity Interactive Setup Manager**!\nUse the dropdown menu below to select and configure features for this server.`,
        fields: [
            {
                name: '📌 Command Prefix',
                value: `\`${settings.prefix || '?'}\``,
                inline: true
            },
            {
                name: '👑 Manager Role',
                value: settings.managerRoleId ? `<@&${settings.managerRoleId}>` : '❌ Default / Admin',
                inline: true
            },
            {
                name: '🛡️ Access / Staff Role',
                value: settings.accessRoleId ? `<@&${settings.accessRoleId}>` : '❌ Default / ManageGuild',
                inline: true
            },
            {
                name: '👋 Welcome Channel',
                value: settings.welcomeChannel ? `<#${settings.welcomeChannel}>` : '❌ Not Set',
                inline: true
            },
            {
                name: '📝 Log Channel',
                value: settings.logChannel ? `<#${settings.logChannel}>` : '❌ Not Set',
                inline: true
            },
            {
                name: '🏷️ Join Auto-Role',
                value: settings.autoroleId ? `<@&${settings.autoroleId}>` : '❌ Not Set',
                inline: true
            },
            {
                name: '🎫 Ticket Category',
                value: settings.ticketCategory ? `<#${settings.ticketCategory}>` : '❌ Not Set',
                inline: true
            },
            {
                name: '📈 Leveling System',
                value: settings.levelingEnabled ? '✅ Enabled' : '❌ Disabled',
                inline: true
            },
            {
                name: '🚨 Security Trap Channel',
                value: settings.autoBanChannelId ? `<#${settings.autoBanChannelId}>` : '❌ Not Set',
                inline: true
            },
            {
                name: '🤖 AI Engine',
                value: `\`${(settings.aiProvider || 'gpt').toUpperCase()}\``,
                inline: true
            }
        ],
        footer: 'Verity Interactive Setup • Select an option below'
    });

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('setup_select_menu')
        .setPlaceholder('⚙️ Choose a setting to configure...')
        .addOptions([
            {
                label: 'Prefix',
                description: 'Set custom text command prefix',
                value: 'setup_prefix',
                emoji: '📌'
            },
            {
                label: 'Manager & Access Roles',
                description: 'Set Manager & Staff/Bot Access roles for this server',
                value: 'setup_roles',
                emoji: '👑'
            },
            {
                label: 'Welcome Channel',
                description: 'Set channel for new member welcome messages',
                value: 'setup_welcome',
                emoji: '👋'
            },
            {
                label: 'Log Channel',
                description: 'Set channel for server audit logs',
                value: 'setup_logs',
                emoji: '📝'
            },
            {
                label: 'Auto-Role',
                description: 'Set role automatically given to new members',
                value: 'setup_autorole',
                emoji: '🏷️'
            },
            {
                label: 'Ticket System',
                description: 'Set category and transcript channel for tickets',
                value: 'setup_tickets',
                emoji: '🎫'
            },
            {
                label: 'Leveling System',
                description: 'Enable/disable XP leveling & set level-up channel',
                value: 'setup_leveling',
                emoji: '📈'
            },
            {
                label: 'Security Trap (Honeypot)',
                description: 'Create/set softban security trap channel for scam bots',
                value: 'setup_autoban',
                emoji: '🚨'
            },
            {
                label: 'AI Verity Engine',
                description: 'Switch AI engine (GPT / Claude)',
                value: 'setup_ai',
                emoji: '🤖'
            }
        ]);

    const selectRow = new ActionRowBuilder().addComponents(selectMenu);

    const refreshBtn = new ButtonBuilder()
        .setCustomId('setup_refresh')
        .setLabel('Refresh Status')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🔄');

    const panelBtn = new ButtonBuilder()
        .setCustomId('setup_send_ticket_panel')
        .setLabel('Deploy Ticket Panel')
        .setStyle(ButtonStyle.Success)
        .setEmoji('🎫');

    const buttonRow = new ActionRowBuilder().addComponents(refreshBtn, panelBtn);

    return { embeds: [embed], components: [selectRow, buttonRow] };
}

module.exports = {
    name: 'setup',
    aliases: ['configure', 'config', 'settings'],
    description: 'Open the interactive Verity setup and configuration panel.',
    category: 'manager',
    slashData: new SlashCommandBuilder()
        .setName('setup')
        .setDescription('Open the interactive Verity setup panel.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(message, args, client) {
        if (!hasAdmin(message.member) && !hasManager(message.member) && !message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return message.reply({ embeds: [errorEmbed('You must be a Server Manager or Administrator to use the setup panel.')] });
        }

        const panel = buildSetupPanel(message.guild);
        return message.reply(panel);
    },

    async slashExecute(interaction, client) {
        if (!hasAdmin(interaction.member) && !hasManager(interaction.member) && !interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return interaction.reply({ embeds: [errorEmbed('You must be a Server Manager or Administrator to use the setup panel.')], ephemeral: true });
        }

        const panel = buildSetupPanel(interaction.guild);
        return interaction.reply(panel);
    },

    buildSetupPanel,
};
