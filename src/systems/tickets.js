// LumeBot — Ticket System
const {
    ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle,
    ChannelType, PermissionFlagsBits
} = require('discord.js');
const config = require('../config');
const db = require('../database/db');
const { createEmbed, successEmbed, errorEmbed } = require('../utils/embeds');

const TICKET_TYPES = {
    support: { label: '🎫 Support Ticket', prefix: 'support', description: 'Get help from our staff team' },
    role: { label: '🏷️ Role Request', prefix: 'role', description: 'Request a role from staff' },
    giveaway: { label: '🎉 Giveaway Ticket', prefix: 'giveaway', description: 'Host a giveaway or claim a giveaway prize' },
    others: { label: '📝 Others', prefix: 'others', description: 'Other inquiries or requests' },
    staff: { label: '🛡️ Server Staff Application', prefix: 'staff', description: 'Apply for Server Staff position' },
    dev: { label: '💻 Minecraft Developer Application', prefix: 'dev', description: 'Apply for Minecraft Server Developer position' },
};

const APPLICATION_QUESTIONS = {
    staff: [
        { key: 'age_tz', question: 'What is your **Age & Timezone**?' },
        { key: 'exp', question: 'What is your **previous staff experience**?' },
        { key: 'why', question: 'Why do you want to **join our staff team**?' },
        { key: 'hours', question: 'How many **hours per day/week** can you contribute?' }
    ],
    dev: [
        { key: 'portfolio', question: 'What is your **portfolio / past work / GitHub**?' },
        { key: 'exp', question: 'What is your experience with **Plugins, Mods, and Configs** (Java, Skript, Spigot/Paper, etc.)?' },
        { key: 'tz_avail', question: 'What is your **Timezone & availability**?' },
        { key: 'why', question: 'Why do you want to **develop for our server**?' }
    ]
};

const activeApplications = new Map(); // channelId -> { type, step, answers: [], userId }

async function handleApplicationResponse(message) {
    if (!message.guild || message.author.bot) return false;
    const app = activeApplications.get(message.channel.id);
    if (!app || app.userId !== message.author.id) return false;

    const questions = APPLICATION_QUESTIONS[app.type];
    if (!questions) return false;

    // Save answer
    app.answers.push({
        question: questions[app.step].question.replace(/\*\*/g, ''),
        answer: message.content
    });

    app.step += 1;

    // Next question or complete
    if (app.step < questions.length) {
        const nextQ = questions[app.step];
        const qEmbed = createEmbed({
            color: config.COLORS.INFO || 0x5865F2,
            title: `📝 Application Question ${app.step + 1} of ${questions.length}`,
            description: `✅ **Answer saved!**\n\nNext Question:\n👉 **${nextQ.question}**`,
            footer: `Step ${app.step + 1}/${questions.length} • Please reply in this channel below`
        });
        await message.channel.send({ embeds: [qEmbed] }).catch(() => {});
        return true;
    }

    // Finished all questions!
    activeApplications.delete(message.channel.id);

    const summaryFields = app.answers.map((a, i) => ({
        name: `Q${i + 1}: ${a.question}`,
        value: a.answer.length > 1024 ? a.answer.slice(0, 1021) + '...' : a.answer,
        inline: false
    }));

    const pingRoleId = settings.ticketPingRoles?.[0] || '1544153685985071106';

    const summaryEmbed = createEmbed({
        color: config.COLORS.SUCCESS || 0x57F287,
        title: `📋 ${app.type === 'staff' ? 'Server Staff' : 'Minecraft Developer'} Application Completed`,
        description: `Thank you ${message.author}! Your application details have been recorded below.\n\nStaff (<@&${pingRoleId}>) will review your application shortly!`,
        fields: summaryFields,
        footer: 'LumeBot Application System'
    });

    await message.channel.send({
        content: `<@&${pingRoleId}>`,
        embeds: [summaryEmbed]
    }).catch(() => {});

    return true;
}

// Send the ticket panel to a channel
async function sendTicketPanel(channel) {
    const embed = createEmbed({
        color: config.COLORS.TICKET,
        title: '🎫 Create a Ticket',
        description: 'Select a ticket type below to open a new ticket.\nOur staff team will assist you as soon as possible!',
        footer: 'LumeBot Ticket System',
    });

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('ticket_create_support')
            .setLabel('Support Ticket')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🎫'),
        new ButtonBuilder()
            .setCustomId('ticket_create_role')
            .setLabel('Role Request')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('🏷️'),
        new ButtonBuilder()
            .setCustomId('ticket_create_giveaway')
            .setLabel('Giveaway')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🎉'),
        new ButtonBuilder()
            .setCustomId('ticket_create_others')
            .setLabel('Others')
            .setStyle(ButtonStyle.Success)
            .setEmoji('📝')
    );

    await channel.send({ embeds: [embed], components: [row] });
}

// Send Application Panel to a channel
async function sendApplicationPanel(channel) {
    const embed = createEmbed({
        color: config.COLORS.TICKET || 0x5865F2,
        title: '📋 Staff & Developer Applications',
        description: 'Interested in joining our team?\nClick a button below to apply for **Server Staff** or **Minecraft Server Developer**!\n\nA private application channel will be opened under the tickets category.',
        footer: 'LumeBot Application System',
    });

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('ticket_create_staff')
            .setLabel('Apply for Server Staff')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🛡️'),
        new ButtonBuilder()
            .setCustomId('ticket_create_dev')
            .setLabel('Apply for Minecraft Developer')
            .setStyle(ButtonStyle.Success)
            .setEmoji('💻')
    );

    await channel.send({ embeds: [embed], components: [row] });
}

// Helper to safely reply/edit interaction without crashing on expired token
async function safeReply(interaction, payload) {
    try {
        if (interaction.deferred || interaction.replied) {
            return await interaction.editReply(payload);
        } else {
            return await interaction.reply(payload);
        }
    } catch (e) {
        console.error('[TICKET] safeReply failed:', e.message);
    }
}

const { MessageFlags } = require('discord.js');

// Create a new ticket channel
async function createTicket(interaction, type) {
    // Immediately defer reply to avoid 3-second interaction timeout
    if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral }).catch(() => {});
    }

    const settings = db.getSettings();
    const guild = interaction.guild;
    const member = interaction.member;

    // Check application status if user is applying for staff or dev
    if (type === 'staff' || type === 'dev') {
        const isOpen = db.getApplicationStatus(type);
        if (!isOpen) {
            const typeName = type === 'staff' ? 'Server Staff' : 'Minecraft Developer';
            const closedEmbed = createEmbed({
                color: config.COLORS.WARNING || 0xFEE75C,
                title: `⛔ ${typeName} Applications Closed`,
                description: `Hello ${member}!\n\nWe are **currently not accepting ${typeName} applications** as applications are currently closed!\n\nThank you for your interest in joining our team. Please check back later when applications reopen!`,
                footer: 'Verity Application System'
            });

            return safeReply(interaction, {
                embeds: [closedEmbed],
            });
        }
    }

    // Check if user already has an open ticket of this type
    const existingTickets = Object.values(db.getAllTickets()).filter(
        t => t.userId === member.id && t.type === type && t.status === 'open'
    );
    if (existingTickets.length > 0) {
        return safeReply(interaction, {
            embeds: [errorEmbed(`You already have an open ${type} ticket: <#${existingTickets[0].channelId}>`)],
        });
    }

    // Increment ticket counter
    const ticketNum = db.incrementTicketCounter(type);
    const typeInfo = TICKET_TYPES[type] || TICKET_TYPES.support;
    const displayName = member.displayName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const channelName = `${typeInfo.prefix}-${displayName}-${ticketNum}`;

    // Build permission overwrites
    const permissionOverwrites = [
        { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
        { id: member.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles] },
        { id: guild.members.me.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ReadMessageHistory] },
    ];

    // Add admin role access
    if (guild.roles.cache.has(config.ADMIN_ROLE_ID)) {
        permissionOverwrites.push({
            id: config.ADMIN_ROLE_ID,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
        });
    }
    if (guild.roles.cache.has(config.MANAGER_ROLE_ID)) {
        permissionOverwrites.push({
            id: config.MANAGER_ROLE_ID,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
        });
    }

    // Configure role access based on ticket type (Applications vs Normal Tickets)
    const isApp = ['staff', 'dev'].includes(type);

    let requiredTicketRoles = [];
    const ticketPingRole = settings.ticketPingRoles?.[0] || '1544153685985071106';
    const pingContent = `${member} <@&${ticketPingRole}>`;

    if (isApp) {
        // Application tickets allow view permissions to management/higher rank roles
        requiredTicketRoles = [
            '1544153686022951005', // Manager
            '1544153686022951007', // Co-Owner
            '1544153686022951008', // Kanaloa
            '1544153686022951009'  // Lume
        ];
    } else {
        // Normal tickets include Trial Moderators, staff roles, and management
        requiredTicketRoles = [
            '1544153686010363923', // Trial Moderator
            '1544153686022951002', // Moderator
            '1544153686022951004', // Admin
            '1544153686022951003', // VerityBot Access
            '1544153686022951005', // Manager
            '1544153685985071106', // ticket ping
            '1544153686022951007', // Co-Owner
            '1544153686022951008', // Kanaloa
            '1544153686022951009'  // Lume
        ];
        if (settings.ticketPingRoles && settings.ticketPingRoles.length > 0) {
            for (const roleId of settings.ticketPingRoles) {
                if (!requiredTicketRoles.includes(roleId)) {
                    requiredTicketRoles.push(roleId);
                }
            }
        }
    }

    for (const roleId of requiredTicketRoles) {
        if (guild.roles.cache.has(roleId)) {
            permissionOverwrites.push({
                id: roleId,
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles],
            });
        }
    }

    // Validate parent category if set
    let parentCategory = null;
    if (settings.ticketCategory) {
        const cat = guild.channels.cache.get(settings.ticketCategory);
        if (cat && cat.type === ChannelType.GuildCategory) {
            parentCategory = cat.id;
        }
    }

    try {
        const channel = await guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            parent: parentCategory,
            permissionOverwrites,
        });

        const isApp = ['staff', 'dev'].includes(type);

        // Save ticket to database
        const ticket = db.createTicket({
            userId: member.id,
            type,
            channelId: channel.id,
            channelName,
        });

        // Send ticket welcome message
        let welcomeDesc = `Welcome ${member}!\n\nPlease describe your ${type === 'role' ? 'role request' : type === 'support' ? 'issue' : 'inquiry'} below and our staff team will assist you shortly.\n\n**Ticket ID:** \`${ticket.id}\``;
        if (type === 'giveaway') {
            welcomeDesc = `Welcome ${member}!\n\nWhether you want to **host a giveaway** or **claim a giveaway prize**, please describe the details below and our staff team will assist you shortly.\n\n**Ticket ID:** \`${ticket.id}\``;
        } else if (type === 'staff') {
            welcomeDesc = `Welcome ${member}!\n\nThank you for applying for **Server Staff**!\nPlease answer the questions below and our staff team will review your application shortly.\n\n**Application ID:** \`${ticket.id}\``;
        } else if (type === 'dev') {
            welcomeDesc = `Welcome ${member}!\n\nThank you for applying for **Minecraft Developer**!\nPlease answer the questions below and our staff team will review your application shortly.\n\n**Application ID:** \`${ticket.id}\``;
        }

        const ticketEmbed = createEmbed({
            color: config.COLORS.TICKET,
            title: `${typeInfo.label}`,
            description: welcomeDesc,
            footer: 'Click below to manage or close this ticket',
        });

        const closeBtn = new ButtonBuilder()
            .setCustomId('ticket_close')
            .setLabel('Close Ticket')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🔒');

        const claimBtn = new ButtonBuilder()
            .setCustomId('ticket_claim')
            .setLabel('Claim Ticket')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🖐️');

        const row = new ActionRowBuilder().addComponents(claimBtn, closeBtn);

        // Ping applicant and designated staff roles outside embed so they receive notifications
        await channel.send({
            content: pingContent,
            embeds: [ticketEmbed],
            components: [row],
        });

        // ─── If Application: Send Question 1 ───
        if (isApp) {
            activeApplications.set(channel.id, {
                type,
                step: 0,
                answers: [],
                userId: member.id
            });

            const questions = APPLICATION_QUESTIONS[type];
            if (questions && questions[0]) {
                const firstQ = questions[0];
                const qEmbed = createEmbed({
                    color: config.COLORS.INFO || 0x5865F2,
                    title: `📝 Application Question 1 of ${questions.length}`,
                    description: `👉 **${firstQ.question}**`,
                    footer: `Step 1/${questions.length} • Please reply in this channel below`
                });
                await channel.send({ embeds: [qEmbed] }).catch(() => {});
            }
        }

        await safeReply(interaction, {
            embeds: [successEmbed(`Your ticket has been created: ${channel}`)],
        });
    } catch (e) {
        console.error('[TICKET] Failed to create ticket:', e);
        await safeReply(interaction, {
            embeds: [errorEmbed('Failed to create ticket. Please contact an administrator.')],
        });
    }
}

// Close a ticket
async function closeTicket(interaction) {
    if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply({ ephemeral: true }).catch(() => {});
    }

    const ticket = db.getTicketByChannel(interaction.channel.id);
    if (!ticket) {
        return safeReply(interaction, {
            embeds: [errorEmbed('This is not a ticket channel.')],
        });
    }

    if (ticket.status === 'closed') {
        return safeReply(interaction, {
            embeds: [errorEmbed('This ticket is already closed.')],
        });
    }

    await safeReply(interaction, {
        embeds: [createEmbed({
            color: config.COLORS.WARNING,
            title: '🔒 Closing Ticket',
            description: 'Generating transcript and closing ticket...',
        })],
    });

    // Generate transcript
    const transcript = await generateTranscript(interaction.channel, ticket);

    // Send transcript to log channel if configured
    const settings = db.getSettings();
    if (settings.ticketTranscriptChannel) {
        const transcriptChannel = interaction.guild.channels.cache.get(settings.ticketTranscriptChannel);
        if (transcriptChannel) {
            const transcriptEmbed = createEmbed({
                color: config.COLORS.LOG,
                title: '📋 Ticket Transcript',
                fields: [
                    { name: 'Ticket', value: ticket.channelName, inline: true },
                    { name: 'Type', value: ticket.type, inline: true },
                    { name: 'Opened By', value: `<@${ticket.userId}>`, inline: true },
                    { name: 'Closed By', value: `${interaction.user}`, inline: true },
                    { name: 'Ticket ID', value: `\`${ticket.id}\``, inline: true },
                ],
                footer: `Closed at`,
            });

            try {
                await transcriptChannel.send({
                    embeds: [transcriptEmbed],
                    files: [{
                        attachment: Buffer.from(transcript, 'utf-8'),
                        name: `${ticket.channelName}-transcript.html`,
                    }],
                });
            } catch (e) {
                console.error('[TICKET] Failed to send transcript:', e.message);
            }
        }
    }

    // Try to DM the user with transcript
    try {
        const member = await interaction.guild.members.fetch(ticket.userId).catch(() => null);
        const user = member?.user || await interaction.client.users.fetch(ticket.userId).catch(() => null);
        if (user) {
            const dmEmbed = createEmbed({
                color: config.COLORS.INFO,
                title: '🎫 Ticket Closed & Transcript',
                description: `Your ticket **${ticket.channelName}** in **${interaction.guild.name}** has been closed by ${interaction.user.tag}.\n\n📁 **Attached is a full copy of your ticket transcript.**`,
                footer: 'Thank you for contacting us!',
            });
            await user.send({
                embeds: [dmEmbed],
                files: [{
                    attachment: Buffer.from(transcript, 'utf-8'),
                    name: `${ticket.channelName}-transcript.html`,
                }],
            }).catch(() => {});
        }
    } catch (e) { /* User might have DMs disabled */ }

    // Update ticket status
    db.updateTicket(ticket.id, { status: 'closed', closedAt: Date.now(), closedBy: interaction.user.id });

    // Delete the channel after a delay
    setTimeout(async () => {
        try {
            await interaction.channel.delete();
        } catch (e) {
            console.error('[TICKET] Failed to delete channel:', e.message);
        }
    }, 5000);
}

// Generate an HTML transcript of the ticket
async function generateTranscript(channel, ticket) {
    let messages = [];
    let lastId;

    while (true) {
        const options = { limit: 100 };
        if (lastId) options.before = lastId;

        const fetched = await channel.messages.fetch(options).catch(() => null);
        if (!fetched || fetched.size === 0) break;

        messages.push(...fetched.values());
        lastId = fetched.last().id;

        if (fetched.size < 100) break;
    }

    messages = messages.reverse();

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Transcript - ${ticket.channelName}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', sans-serif; background: #36393f; color: #dcddde; padding: 20px; }
        .header { background: #2f3136; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .header h1 { color: #fff; font-size: 1.5em; }
        .header p { color: #b9bbbe; margin-top: 5px; }
        .message { display: flex; padding: 8px 16px; margin: 4px 0; }
        .message:hover { background: #32353b; }
        .avatar { width: 40px; height: 40px; border-radius: 50%; margin-right: 16px; flex-shrink: 0; }
        .content { flex: 1; }
        .author { font-weight: 600; color: #fff; margin-right: 8px; }
        .timestamp { color: #72767d; font-size: 0.75em; }
        .text { margin-top: 4px; line-height: 1.4; word-break: break-word; }
        .embed { background: #2f3136; border-left: 4px solid #5865f2; padding: 12px; border-radius: 4px; margin-top: 8px; max-width: 520px; }
        .attachment { color: #00aff4; text-decoration: underline; margin-top: 4px; display: block; }
        .footer { text-align: center; color: #72767d; margin-top: 30px; padding: 20px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>📋 Transcript: ${ticket.channelName}</h1>
        <p>Type: ${ticket.type} | Opened by: User ID ${ticket.userId} | Messages: ${messages.length}</p>
        <p>Created: ${new Date(ticket.createdAt).toLocaleString()} | Generated: ${new Date().toLocaleString()}</p>
    </div>
    ${messages.map(m => `
    <div class="message">
        <img class="avatar" src="${m.author.displayAvatarURL({ size: 64 })}" alt="avatar">
        <div class="content">
            <span class="author" style="color: ${m.member?.displayHexColor || '#fff'}">${escapeHtml(m.author.tag)}</span>
            <span class="timestamp">${m.createdAt.toLocaleString()}</span>
            <div class="text">${escapeHtml(m.content) || '<em>No text content</em>'}</div>
            ${m.attachments.map(a => `<a class="attachment" href="${a.url}">${escapeHtml(a.name)}</a>`).join('')}
            ${m.embeds.map(e => `<div class="embed">${e.title ? `<strong>${escapeHtml(e.title)}</strong>` : ''}${e.description ? `<p>${escapeHtml(e.description)}</p>` : ''}</div>`).join('')}
        </div>
    </div>`).join('')}
    <div class="footer">
        <p>Generated by LumeBot | ${new Date().toLocaleString()}</p>
    </div>
</body>
</html>`;

    return html;
}

function escapeHtml(text) {
    if (!text) return '';
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Claim a ticket
async function claimTicket(interactionOrMessage, staffMember) {
    const channel = interactionOrMessage.channel;
    const isInteraction = Boolean(interactionOrMessage.isChatInputCommand || interactionOrMessage.isButton);

    // Defer interaction immediately to prevent 3s Discord interaction timeouts during AI summary generation
    if (isInteraction && !interactionOrMessage.deferred && !interactionOrMessage.replied) {
        await interactionOrMessage.deferReply({ flags: MessageFlags.Ephemeral }).catch(() => {});
    }

    const ticket = db.getTicketByChannel(channel.id);
    if (!ticket || ticket.status !== 'open') {
        const replyPayload = { embeds: [errorEmbed('This is not an open ticket channel.')] };
        if (isInteraction) {
            return safeReply(interactionOrMessage, replyPayload);
        } else {
            return channel.send(replyPayload);
        }
    }

    // Permission check for claiming ticket
    const { hasAdmin, hasManager } = require('../utils/permissions');
    const isStaff = hasAdmin(staffMember) || hasManager(staffMember) ||
                    staffMember.permissions?.has(PermissionFlagsBits.ManageGuild) ||
                    staffMember.permissions?.has(PermissionFlagsBits.ManageMessages) ||
                    staffMember.roles?.cache?.has(config.ADMIN_ROLE_ID) ||
                    staffMember.roles?.cache?.has(config.MANAGER_ROLE_ID);

    if (!isStaff) {
        const replyPayload = { embeds: [errorEmbed('You do not have permission to claim tickets.')] };
        if (isInteraction) {
            return safeReply(interactionOrMessage, replyPayload);
        } else {
            return channel.send(replyPayload);
        }
    }

    const staffUserTag = staffMember.user ? staffMember.user.tag : (staffMember.tag || staffMember);

    // If ticket is already claimed
    if (ticket.claimedBy) {
        const reClaimEmbed = createEmbed({
            color: config.COLORS.INFO || 0x5865F2,
            title: '🖐️ Ticket Claim Status',
            description: `This ticket has already been claimed by <@${ticket.claimedBy}>.`,
            footer: 'LumeBot Ticket Support'
        });

        if (isInteraction) {
            return safeReply(interactionOrMessage, { embeds: [reClaimEmbed] });
        } else {
            return channel.send({ embeds: [reClaimEmbed] });
        }
    }

    // First time claim: Rename the ticket channel to start with 'claimed-'
    let newChannelName = channel.name.startsWith('claimed-') ? channel.name : `claimed-${channel.name}`;
    if (newChannelName.length > 100) newChannelName = newChannelName.substring(0, 100);

    await channel.setName(newChannelName, `Ticket claimed by ${staffUserTag}`).catch(err => {
        console.error('[TICKET] Failed to rename channel on claim:', err.message);
    });

    // Save claim status and new channel name in database
    db.updateTicket(ticket.id, {
        claimedBy: staffMember.id,
        claimedAt: Date.now(),
        channelName: newChannelName,
    });

    const claimEmbed = createEmbed({
        color: config.COLORS.SUCCESS || 0x57F287,
        title: '🖐️ Ticket Claimed',
        description: `This ticket has been claimed by **${staffUserTag}** (<@${staffMember.id}>)!\nStaff will assist you shortly.`,
        footer: 'LumeBot Ticket Support'
    });

    // Send public claim notification in channel
    await channel.send({ embeds: [claimEmbed] }).catch(() => {});

    if (isInteraction) {
        return safeReply(interactionOrMessage, { embeds: [successEmbed(`You have claimed this ticket: ${channel}`)] });
    } else {
        return channel.send({ embeds: [claimEmbed] });
    }
}

// Approve an application ticket and grant Trial Moderator role 1533039130479689749
async function approveTicket(interactionOrMessage, staffMember) {
    const channel = interactionOrMessage.channel;
    const guild = interactionOrMessage.guild;
    const isInteraction = Boolean(interactionOrMessage.isChatInputCommand || interactionOrMessage.isButton);

    // Defer interaction immediately to prevent 3s Discord interaction timeouts
    if (isInteraction && !interactionOrMessage.deferred && !interactionOrMessage.replied) {
        await interactionOrMessage.deferReply({ flags: MessageFlags.Ephemeral }).catch(() => {});
    }

    const ticket = db.getTicketByChannel(channel.id);
    if (!ticket || ticket.status !== 'open') {
        const replyPayload = { embeds: [errorEmbed('This is not an open ticket channel.')] };
        if (isInteraction) return safeReply(interactionOrMessage, replyPayload);
        else return channel.send(replyPayload);
    }

    // Permission check
    const { hasAdmin, hasManager } = require('../utils/permissions');
    const isStaff = hasAdmin(staffMember) || hasManager(staffMember) ||
                    staffMember.permissions?.has(PermissionFlagsBits.ManageGuild) ||
                    staffMember.permissions?.has(PermissionFlagsBits.ManageRoles) ||
                    staffMember.roles?.cache?.has(config.ADMIN_ROLE_ID) ||
                    staffMember.roles?.cache?.has(config.MANAGER_ROLE_ID);

    if (!isStaff) {
        const replyPayload = { embeds: [errorEmbed('You do not have permission to approve applications.')] };
        if (isInteraction) return safeReply(interactionOrMessage, replyPayload);
        else return channel.send(replyPayload);
    }

    // Fetch applicant member
    const applicantMember = await guild.members.fetch(ticket.userId).catch(() => null);
    const TRIAL_MOD_ROLE_ID = '1533039130479689749';

    let roleGranted = false;
    if (applicantMember) {
        try {
            await applicantMember.roles.add(TRIAL_MOD_ROLE_ID);
            roleGranted = true;
        } catch (e) {
            console.error('[APPROVE ROLE ERROR]', e.message);
        }
    }

    // Mark ticket approved in DB
    db.updateTicket(ticket.id, {
        status: 'approved',
        approvedBy: staffMember.id,
        approvedAt: Date.now()
    });

    const staffUserTag = staffMember.user ? staffMember.user.tag : (staffMember.tag || staffMember);

    const approveEmbed = createEmbed({
        color: config.COLORS.SUCCESS || 0x57F287,
        title: '🎉 Application Approved!',
        description: `Congratulations ${applicantMember ? applicantMember : `<@${ticket.userId}>`}!\n\nYour application has been **APPROVED** by **${staffUserTag}**!\n` +
                     (roleGranted ? `\n🛡️ You have been officially granted the <@&${TRIAL_MOD_ROLE_ID}> role! Welcome to the team!\n` : '') +
                     `\n⚠️ *Please note: If you break rules or misuse your staff privileges, your permissions and role may be revoked at any time.*\n` +
                     `\n**Do you have any further questions before we close this ticket?**`,
        footer: 'LumeBot Staff Applications'
    });

    const closeBtn = new ButtonBuilder()
        .setCustomId('ticket_close')
        .setLabel('Close Ticket')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🔒');

    const row = new ActionRowBuilder().addComponents(closeBtn);

    // Send public message in channel with ping
    await channel.send({
        content: `${applicantMember ? applicantMember : `<@${ticket.userId}>`}`,
        embeds: [approveEmbed],
        components: [row]
    }).catch(() => {});

    if (isInteraction) {
        return safeReply(interactionOrMessage, { embeds: [successEmbed(`Successfully approved the application for <@${ticket.userId}>!`)] });
    }
}

module.exports = {
    TICKET_TYPES,
    APPLICATION_QUESTIONS,
    activeApplications,
    sendTicketPanel,
    sendApplicationPanel,
    createTicket,
    closeTicket,
    claimTicket,
    approveTicket,
    handleApplicationResponse,
};
