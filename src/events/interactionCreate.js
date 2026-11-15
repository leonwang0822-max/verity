// Verity — Interaction Create Event Handler

const { MessageFlags } = require('discord.js');
const { errorEmbed } = require('../utils/embeds');
const { hasAdmin, hasManager } = require('../utils/permissions');
const { createTicket, closeTicket } = require('../systems/tickets');
const { handleSetupInteraction } = require('../systems/setupHandler');

module.exports = {
    once: false,
    async execute(client, interaction) {
        try {
            // ─── Slash Commands ───
            if (interaction.isChatInputCommand()) {
                const command = client.commands.get(interaction.commandName);
                if (!command) return;

                // Permission checks
                if (command.category === 'staff' && !hasAdmin(interaction.member)) {
                    return interaction.reply({ embeds: [errorEmbed('You do not have permission to use this command.')], flags: MessageFlags.Ephemeral }).catch(() => {});
                }
                if (command.category === 'manager' && !hasManager(interaction.member)) {
                    return interaction.reply({ embeds: [errorEmbed('Only bot managers can use this command.')], flags: MessageFlags.Ephemeral }).catch(() => {});
                }

                try {
                    await command.slashExecute(interaction, client);
                } catch (error) {
                    console.error(`[SLASH] Error in /${interaction.commandName}:`, error);
                    const reply = { embeds: [errorEmbed(`An error occurred: ${error.message}`)], flags: MessageFlags.Ephemeral };
                    if (interaction.replied || interaction.deferred) {
                        await interaction.followUp(reply).catch(() => {});
                    } else {
                        await interaction.reply(reply).catch(() => {});
                    }
                }
            }

            // ─── Button Interactions ───
            else if (interaction.isButton()) {
                if (interaction.customId === 'free_admin_claim') {
                    return interaction.reply({
                        content: 'https://klipy.com/gifs/rickroll-never-gonna-give-you-up-9',
                        flags: MessageFlags.Ephemeral
                    }).catch(() => {});
                }
                if (interaction.customId === 'raven_change_image' || interaction.customId === 'raven_upload_btn') {
                    const { handleRavenButton } = require('../systems/ravenImage');
                    return handleRavenButton(client, interaction);
                }
                if (interaction.customId === 'leonw_change_image' || interaction.customId === 'leonw_upload_btn') {
                    const { handleLeonwButton } = require('../systems/leonwImage');
                    return handleLeonwButton(client, interaction);
                }
                if (interaction.customId.startsWith('setup_')) {
                    return handleSetupInteraction(client, interaction);
                }
                if (interaction.customId === 'ticket_close') {
                    await closeTicket(interaction);
                } else if (interaction.customId === 'ticket_claim') {
                    const { claimTicket } = require('../systems/tickets');
                    await claimTicket(interaction, interaction.member);
                } else if (interaction.customId === 'ticket_ai_yes') {
                    const { handleTicketAISelection } = require('../systems/tickets');
                    await handleTicketAISelection(interaction, true);
                } else if (interaction.customId === 'ticket_ai_no') {
                    const { handleTicketAISelection } = require('../systems/tickets');
                    await handleTicketAISelection(interaction, false);
                } else if (interaction.customId.startsWith('ticket_create_')) {
                    const type = interaction.customId.replace('ticket_create_', '');
                    await createTicket(interaction, type);
                }
            }

            // ─── Select Menu Interactions ───
            else if (interaction.isStringSelectMenu()) {
                if (interaction.customId.startsWith('setup_')) {
                    return handleSetupInteraction(client, interaction);
                }
            }

            // ─── Modal Submissions ───
            else if (interaction.isModalSubmit()) {
                if (interaction.customId.startsWith('modal_setup_')) {
                    return handleSetupInteraction(client, interaction);
                }
            }
        } catch (err) {
            console.error('[INTERACTION] Unhandled error:', err);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ embeds: [errorEmbed('An unexpected error occurred.')], flags: MessageFlags.Ephemeral }).catch(() => {});
            }
        }
    },
};
