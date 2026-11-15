// LumeBot — Setup Panel Handler (Select Menu, Buttons, Modals)
const {
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    ChannelType,
    PermissionFlagsBits
} = require('discord.js');
const { successEmbed, errorEmbed } = require('../utils/embeds');
const { hasManager, hasAdmin } = require('../utils/permissions');
const db = require('../database/db');
const { buildSetupPanel } = require('../commands/manager/setup');

async function handleSetupInteraction(client, interaction) {
    try {
        if (!hasAdmin(interaction.member) && !hasManager(interaction.member) && !interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return interaction.reply({ embeds: [errorEmbed('You must be a Server Manager to configure settings.')], ephemeral: true }).catch(() => {});
        }

        const guildId = interaction.guild.id;

        // ─── Button: Refresh Status ───
        if (interaction.isButton() && interaction.customId === 'setup_refresh') {
            const panel = buildSetupPanel(interaction.guild);
            return interaction.update(panel).catch(() => {});
        }

        // ─── Button: Deploy Ticket Panel ───
        if (interaction.isButton() && interaction.customId === 'setup_send_ticket_panel') {
            const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
            const { createEmbed } = require('../utils/embeds');
            const config = require('../config');

            await interaction.deferReply({ ephemeral: true }).catch(() => {});

            const embed = createEmbed({
                color: config.COLORS.TICKET,
                title: '🎫 Support & Appeals Ticket Portal',
                description: `Need assistance, want to appeal a mute/warn, or request a role?\nSelect the appropriate category from the dropdown menu below to open a private ticket.`,
                fields: [
                    { name: '💬 Support', value: 'General server support & inquiries', inline: true },
                    { name: '🏷️ Role Request', value: 'Request level/special roles', inline: true },
                    { name: '🔒 Appeals / Others', value: 'Mute appeals & general issues', inline: true }
                ],
                footer: 'LumeBot Ticket Portal • Click below to open'
            });

            const btnSupport = new ButtonBuilder().setCustomId('ticket_create_support').setLabel('Support Ticket').setEmoji('💬').setStyle(ButtonStyle.Primary);
            const btnRole = new ButtonBuilder().setCustomId('ticket_create_role').setLabel('Role Request').setEmoji('🏷️').setStyle(ButtonStyle.Secondary);
            const btnOthers = new ButtonBuilder().setCustomId('ticket_create_others').setLabel('Appeal / Others').setEmoji('🔒').setStyle(ButtonStyle.Danger);

            const row = new ActionRowBuilder().addComponents(btnSupport, btnRole, btnOthers);
            await interaction.channel.send({ embeds: [embed], components: [row] });
            return interaction.editReply({ embeds: [successEmbed('Ticket panel successfully deployed to this channel!')] }).catch(() => {});
        }

        // ─── Select Menu Selection ───
        if (interaction.isStringSelectMenu() && interaction.customId === 'setup_select_menu') {
            const choice = interaction.values[0];
            const settings = db.getSettings(guildId);

            if (choice === 'setup_prefix') {
                const modal = new ModalBuilder()
                    .setCustomId('modal_setup_prefix')
                    .setTitle('Configure Command Prefix');

                const input = new TextInputBuilder()
                    .setCustomId('input_prefix')
                    .setLabel('Command Prefix (e.g. ?, !, .)')
                    .setStyle(TextInputStyle.Short)
                    .setValue(settings.prefix || '?')
                    .setMaxLength(5)
                    .setRequired(true);

                modal.addComponents(new ActionRowBuilder().addComponents(input));
                return interaction.showModal(modal);
            }

            if (choice === 'setup_roles') {
                const modal = new ModalBuilder()
                    .setCustomId('modal_setup_roles')
                    .setTitle('Configure Manager & Access Roles');

                const managerRoleInput = new TextInputBuilder()
                    .setCustomId('input_manager_role')
                    .setLabel('Bot Manager Role ID or @mention')
                    .setStyle(TextInputStyle.Short)
                    .setValue(settings.managerRoleId || '')
                    .setPlaceholder('e.g. 1531896115052417115')
                    .setRequired(false);

                const accessRoleInput = new TextInputBuilder()
                    .setCustomId('input_access_role')
                    .setLabel('Staff / Access Role ID or @mention')
                    .setStyle(TextInputStyle.Short)
                    .setValue(settings.accessRoleId || '')
                    .setPlaceholder('e.g. 1531893528077140038')
                    .setRequired(false);

                modal.addComponents(
                    new ActionRowBuilder().addComponents(managerRoleInput),
                    new ActionRowBuilder().addComponents(accessRoleInput)
                );
                return interaction.showModal(modal);
            }

            if (choice === 'setup_welcome') {
                const modal = new ModalBuilder()
                    .setCustomId('modal_setup_welcome')
                    .setTitle('Configure Welcome Channel');

                const input = new TextInputBuilder()
                    .setCustomId('input_welcome_channel')
                    .setLabel('Welcome Channel ID or #mention')
                    .setStyle(TextInputStyle.Short)
                    .setValue(settings.welcomeChannel || '')
                    .setPlaceholder('e.g. 1529735375881506929')
                    .setRequired(false);

                modal.addComponents(new ActionRowBuilder().addComponents(input));
                return interaction.showModal(modal);
            }

            if (choice === 'setup_logs') {
                const modal = new ModalBuilder()
                    .setCustomId('modal_setup_logs')
                    .setTitle('Configure Server Log Channel');

                const input = new TextInputBuilder()
                    .setCustomId('input_log_channel')
                    .setLabel('Log Channel ID or #mention')
                    .setStyle(TextInputStyle.Short)
                    .setValue(settings.logChannel || '')
                    .setPlaceholder('e.g. 1531896115052417115')
                    .setRequired(false);

                modal.addComponents(new ActionRowBuilder().addComponents(input));
                return interaction.showModal(modal);
            }

            if (choice === 'setup_autorole') {
                const modal = new ModalBuilder()
                    .setCustomId('modal_setup_autorole')
                    .setTitle('Configure Join Auto-Role');

                const input = new TextInputBuilder()
                    .setCustomId('input_autorole_id')
                    .setLabel('Auto-Role ID or @mention')
                    .setStyle(TextInputStyle.Short)
                    .setValue(settings.autoroleId || '')
                    .setPlaceholder('e.g. 1531894454796161075')
                    .setRequired(false);

                modal.addComponents(new ActionRowBuilder().addComponents(input));
                return interaction.showModal(modal);
            }

            if (choice === 'setup_tickets') {
                const modal = new ModalBuilder()
                    .setCustomId('modal_setup_tickets')
                    .setTitle('Configure Ticket System');

                const categoryInput = new TextInputBuilder()
                    .setCustomId('input_ticket_category')
                    .setLabel('Ticket Category Channel ID')
                    .setStyle(TextInputStyle.Short)
                    .setValue(settings.ticketCategory || '')
                    .setRequired(false);

                const transcriptInput = new TextInputBuilder()
                    .setCustomId('input_ticket_transcript')
                    .setLabel('Ticket Transcript Channel ID')
                    .setStyle(TextInputStyle.Short)
                    .setValue(settings.ticketTranscriptChannel || '')
                    .setRequired(false);

                modal.addComponents(
                    new ActionRowBuilder().addComponents(categoryInput),
                    new ActionRowBuilder().addComponents(transcriptInput)
                );
                return interaction.showModal(modal);
            }

            if (choice === 'setup_leveling') {
                const modal = new ModalBuilder()
                    .setCustomId('modal_setup_leveling')
                    .setTitle('Configure Leveling System');

                const enabledInput = new TextInputBuilder()
                    .setCustomId('input_leveling_enabled')
                    .setLabel('Enable Leveling? (type true or false)')
                    .setStyle(TextInputStyle.Short)
                    .setValue(settings.levelingEnabled ? 'true' : 'false')
                    .setRequired(true);

                const channelInput = new TextInputBuilder()
                    .setCustomId('input_levelup_channel')
                    .setLabel('Level Up Channel ID (leave empty for same)')
                    .setStyle(TextInputStyle.Short)
                    .setValue(settings.levelUpChannel || '')
                    .setRequired(false);

                modal.addComponents(
                    new ActionRowBuilder().addComponents(enabledInput),
                    new ActionRowBuilder().addComponents(channelInput)
                );
                return interaction.showModal(modal);
            }

            if (choice === 'setup_autoban') {
                await interaction.deferReply({ ephemeral: true }).catch(() => {});
                const { createAutoBanChannel } = require('./autoban');
                const channel = await createAutoBanChannel(interaction.guild);
                db.updateSettings(guildId, { autoBanChannelId: channel.id });

                const panel = buildSetupPanel(interaction.guild);
                await interaction.editReply({ embeds: [successEmbed(`Created Honeypot Trap Channel ${channel}! Anyone typing in it will be automatically softbanned & purged.`)] }).catch(() => {});
                return interaction.message?.edit(panel).catch(() => {});
            }

            if (choice === 'setup_ai') {
                const modal = new ModalBuilder()
                    .setCustomId('modal_setup_ai')
                    .setTitle('Configure AI Verity Engine');

                const providerInput = new TextInputBuilder()
                    .setCustomId('input_ai_provider')
                    .setLabel('AI Engine Provider (gpt or claude)')
                    .setStyle(TextInputStyle.Short)
                    .setValue(settings.aiProvider || 'gpt')
                    .setRequired(true);

                modal.addComponents(new ActionRowBuilder().addComponents(providerInput));
                return interaction.showModal(modal);
            }
        }

        // ─── Modal Submissions ───
        if (interaction.isModalSubmit()) {
            const id = interaction.customId;

            if (id === 'modal_setup_prefix') {
                const prefix = interaction.fields.getTextInputValue('input_prefix').trim();
                db.updateSettings(guildId, { prefix });
                await interaction.reply({ embeds: [successEmbed(`Command prefix updated to \`${prefix}\`.`)], ephemeral: true }).catch(() => {});
            }

            if (id === 'modal_setup_roles') {
                const mgr = interaction.fields.getTextInputValue('input_manager_role').replace(/[<@&>]/g, '').trim();
                const acc = interaction.fields.getTextInputValue('input_access_role').replace(/[<@&>]/g, '').trim();
                db.updateSettings(guildId, { managerRoleId: mgr || null, accessRoleId: acc || null });
                await interaction.reply({ embeds: [successEmbed('Manager and Staff/Access roles updated successfully!')], ephemeral: true }).catch(() => {});
            }

            if (id === 'modal_setup_welcome') {
                const raw = interaction.fields.getTextInputValue('input_welcome_channel').replace(/[<#>] /g, '').trim();
                db.updateSettings(guildId, { welcomeChannel: raw || null });
                await interaction.reply({ embeds: [successEmbed(`Welcome channel updated to ${raw ? `<#${raw}>` : '`None`'}.`)], ephemeral: true }).catch(() => {});
            }

            if (id === 'modal_setup_logs') {
                const raw = interaction.fields.getTextInputValue('input_log_channel').replace(/[<#>] /g, '').trim();
                db.updateSettings(guildId, { logChannel: raw || null });
                await interaction.reply({ embeds: [successEmbed(`Audit log channel updated to ${raw ? `<#${raw}>` : '`None`'}.`)], ephemeral: true }).catch(() => {});
            }

            if (id === 'modal_setup_autorole') {
                const raw = interaction.fields.getTextInputValue('input_autorole_id').replace(/[<@&>] /g, '').trim();
                db.updateSettings(guildId, { autoroleId: raw || null });
                await interaction.reply({ embeds: [successEmbed(`Auto-role updated to ${raw ? `<@&${raw}>` : '`None`'}.`)], ephemeral: true }).catch(() => {});
            }

            if (id === 'modal_setup_tickets') {
                const cat = interaction.fields.getTextInputValue('input_ticket_category').trim();
                const trans = interaction.fields.getTextInputValue('input_ticket_transcript').trim();
                db.updateSettings(guildId, { ticketCategory: cat || null, ticketTranscriptChannel: trans || null });
                await interaction.reply({ embeds: [successEmbed('Ticket system configuration updated!')], ephemeral: true }).catch(() => {});
            }

            if (id === 'modal_setup_leveling') {
                const enabledStr = interaction.fields.getTextInputValue('input_leveling_enabled').trim().toLowerCase();
                const channelStr = interaction.fields.getTextInputValue('input_levelup_channel').trim();
                db.updateSettings(guildId, {
                    levelingEnabled: enabledStr === 'true' || enabledStr === 'yes' || enabledStr === '1',
                    levelUpChannel: channelStr || null
                });
                await interaction.reply({ embeds: [successEmbed('Leveling system configuration updated!')], ephemeral: true }).catch(() => {});
            }

            if (id === 'modal_setup_ai') {
                const provider = interaction.fields.getTextInputValue('input_ai_provider').trim().toLowerCase();
                const valid = ['gpt', 'claude'].includes(provider) ? provider : 'gpt';
                db.updateSettings(guildId, { aiProvider: valid });
                await interaction.reply({ embeds: [successEmbed(`AI Engine provider updated to \`${valid.toUpperCase()}\`.`)], ephemeral: true }).catch(() => {});
            }

            // Try updating the setup panel message if present
            if (interaction.message) {
                const panel = buildSetupPanel(interaction.guild);
                await interaction.message.edit(panel).catch(() => {});
            }
        }
    } catch (err) {
        console.error('[SETUP HANDLER] Error:', err);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ embeds: [errorEmbed(`Setup Error: ${err.message}`)], ephemeral: true }).catch(() => {});
        }
    }
}

module.exports = { handleSetupInteraction };
