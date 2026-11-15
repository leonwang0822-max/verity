// Verity — Application Management Command
// Allows members with role 1531896115052417115 to privately open or close Staff and Developer applications.

const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const db = require('../../database/db');
const { createEmbed, errorEmbed } = require('../../utils/embeds');
const { sendLog } = require('../../systems/logging');
const config = require('../../config');

const REQUIRED_ROLE_ID = '1531896115052417115';

function hasAppPermission(member) {
    if (!member) return false;
    if (member.id === config.DEV_USER_ID || member.id === '1488316093964746872') return true;
    if (member.guild && member.guild.ownerId === member.id) return true;
    return member.roles && member.roles.cache.has(REQUIRED_ROLE_ID);
}

module.exports = {
    name: 'application',
    aliases: ['applications', 'applystatus', 'appstatus'],
    description: 'Privately open or close Staff and Developer applications (Role 1531896115052417115 required)',
    category: 'staff',
    slashData: new SlashCommandBuilder()
        .setName('application')
        .setDescription('Privately open or close Staff and Developer applications')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option =>
            option.setName('type')
                .setDescription('Select application type')
                .setRequired(true)
                .addChoices(
                    { name: '🛡️ Server Staff Application', value: 'staff' },
                    { name: '💻 Developer Application', value: 'dev' }
                )
        )
        .addStringOption(option =>
            option.setName('status')
                .setDescription('Open or close this application type')
                .setRequired(true)
                .addChoices(
                    { name: '🟢 Open Applications', value: 'open' },
                    { name: '🔴 Close Applications', value: 'close' }
                )
        ),

    async execute(message, args, client) {
        // Strict Role Check
        if (!hasAppPermission(message.member)) {
            return message.reply({
                embeds: [errorEmbed(`❌ You must have the <@&${REQUIRED_ROLE_ID}> role to use this command.`)]
            }).then(msg => {
                setTimeout(() => msg.delete().catch(() => {}), 6000);
            }).catch(() => {});
        }

        const typeArg = (args[0] || '').toLowerCase();
        const statusArg = (args[1] || '').toLowerCase();

        // If no arguments provided, show current status overview
        if (!typeArg || !['staff', 'dev'].includes(typeArg)) {
            const staffOpen = db.getApplicationStatus('staff');
            const devOpen = db.getApplicationStatus('dev');

            const statusEmbed = createEmbed({
                color: config.COLORS.INFO || 0x5865F2,
                title: '📋 Application Status Overview',
                description: `Current availability of server applications:\n\n` +
                    `• **🛡️ Server Staff Applications:** ${staffOpen ? '🟢 **OPEN**' : '🔴 **CLOSED**'}\n` +
                    `• **💻 Developer Applications:** ${devOpen ? '🟢 **OPEN**' : '🔴 **CLOSED**'}\n\n` +
                    `*Usage to update:* \`?application <staff|dev> <open|close>\``,
                footer: 'Verity Application System'
            });

            return message.reply({ embeds: [statusEmbed] });
        }

        if (!statusArg || !['open', 'close', 'closed'].includes(statusArg)) {
            return message.reply({
                embeds: [errorEmbed('Please specify a valid status: `open` or `close`.\nExample: `?application staff open` or `?application dev close`')]
            });
        }

        const isOpen = statusArg === 'open';
        const typeName = typeArg === 'staff' ? 'Server Staff' : 'Developer';

        db.setApplicationStatus(typeArg, isOpen);
        db.addModLog({
            action: isOpen ? 'APPLICATION_OPEN' : 'APPLICATION_CLOSE',
            moderatorId: message.author.id,
            targetId: typeArg,
            reason: `${typeName} Applications ${isOpen ? 'Opened' : 'Closed'}`
        });

        sendLog(
            message.guild,
            `Application Status Changed`,
            `**Type:** ${typeName} Application\n**Status:** ${isOpen ? '🟢 OPEN' : '🔴 CLOSED'}\n**Moderator:** ${message.author}`
        );

        const resultEmbed = createEmbed({
            color: isOpen ? config.COLORS.SUCCESS : config.COLORS.WARNING,
            title: `${isOpen ? '🟢' : '🔴'} ${typeName} Applications ${isOpen ? 'Opened' : 'Closed'}`,
            description: `**${typeName} Applications** are now **${isOpen ? 'OPEN' : 'CLOSED'}**!\n\n` +
                (isOpen
                    ? `Users can now apply through the application panel.`
                    : `New submissions for this role are temporarily blocked.`),
            footer: 'Verity Application Management'
        });

        return message.reply({ embeds: [resultEmbed] });
    },

    async slashExecute(interaction, client) {
        // Strict Role Check
        if (!hasAppPermission(interaction.member)) {
            return interaction.reply({
                embeds: [errorEmbed(`❌ You must have the <@&${REQUIRED_ROLE_ID}> role to use this command.`)],
                flags: MessageFlags.Ephemeral
            });
        }

        const type = interaction.options.getString('type');
        const status = interaction.options.getString('status');

        const isOpen = status === 'open';
        const typeName = type === 'staff' ? 'Server Staff' : 'Developer';

        db.setApplicationStatus(type, isOpen);
        db.addModLog({
            action: isOpen ? 'APPLICATION_OPEN' : 'APPLICATION_CLOSE',
            moderatorId: interaction.user.id,
            targetId: type,
            reason: `${typeName} Applications ${isOpen ? 'Opened' : 'Closed'}`
        });

        sendLog(
            interaction.guild,
            `Application Status Changed`,
            `**Type:** ${typeName} Application\n**Status:** ${isOpen ? '🟢 OPEN' : '🔴 CLOSED'}\n**Moderator:** ${interaction.user}`
        );

        const resultEmbed = createEmbed({
            color: isOpen ? config.COLORS.SUCCESS : config.COLORS.WARNING,
            title: `${isOpen ? '🟢' : '🔴'} ${typeName} Applications ${isOpen ? 'Opened' : 'Closed'}`,
            description: `**${typeName} Applications** are now **${isOpen ? 'OPEN' : 'CLOSED'}**!\n\n` +
                (isOpen
                    ? `Users can now apply through the application panel.`
                    : `New submissions for this role are temporarily blocked.`),
            footer: 'Verity Application Management'
        });

        // Display strictly privately (Ephemeral)
        return interaction.reply({
            embeds: [resultEmbed],
            flags: MessageFlags.Ephemeral
        });
    }
};
