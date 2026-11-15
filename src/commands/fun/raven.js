// Verity — Raven Command
// Sends current raven image with a "Change Image" button underneath

const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const {
    getRavenImagePath,
    getRavenButtonRow,
    saveRavenImage,
    handleRavenButton,
    isAuthorized
} = require('../../systems/ravenImage');

module.exports = {
    name: 'raven',
    aliases: ['ravenpic', 'ravenimage'],
    description: 'Raven image',
    category: 'fun',
    slashData: new SlashCommandBuilder()
        .setName('raven')
        .setDescription('Raven image')
        .addAttachmentOption(opt =>
            opt.setName('image')
                .setDescription('New image')
                .setRequired(false)
        ),

    execute: async (message, args, client) => {
        const canEdit = isAuthorized(message.author.id);

        // Check if an image was attached or passed as link
        const directAttachment = message.attachments.find(a =>
            a.contentType?.startsWith('image/') || /\.(png|jpe?g|webp|gif)$/i.test(a.name)
        );
        const directUrl = args[0] && /^https?:\/\/.*\.(png|jpe?g|webp|gif)/i.test(args[0]) ? args[0] : null;

        if (canEdit && (directAttachment || directUrl)) {
            try {
                const targetUrl = directAttachment ? directAttachment.url : directUrl;
                const buffer = await saveRavenImage(targetUrl);
                const attachment = new AttachmentBuilder(buffer, { name: 'raven.png' });
                const row = getRavenButtonRow();

                return message.reply({
                    content: '<@948379389131898901>',
                    allowedMentions: { users: ['948379389131898901'] },
                    files: [attachment],
                    components: [row]
                }).catch(() => null);
            } catch (err) {
                return message.reply(`Failed: ${err.message}`).catch(() => {});
            }
        }

        // Send current image with "Change Image" button
        const imagePath = getRavenImagePath();
        const attachment = new AttachmentBuilder(imagePath, { name: 'raven.png' });
        const row = getRavenButtonRow();

        return message.reply({
            content: '<@948379389131898901>',
            allowedMentions: { users: ['948379389131898901'] },
            files: [attachment],
            components: [row]
        }).catch(() => null);
    },

    slashExecute: async (interaction, client) => {
        const canEdit = isAuthorized(interaction.user.id);
        const attachmentOption = interaction.options.getAttachment('image');

        if (canEdit && attachmentOption) {
            await interaction.deferReply();
            try {
                const buffer = await saveRavenImage(attachmentOption.url);
                const attachment = new AttachmentBuilder(buffer, { name: 'raven.png' });
                const row = getRavenButtonRow();
                return interaction.editReply({
                    content: '<@948379389131898901>',
                    allowedMentions: { users: ['948379389131898901'] },
                    files: [attachment],
                    components: [row]
                });
            } catch (err) {
                return interaction.editReply(`Failed: ${err.message}`);
            }
        }

        const imagePath = getRavenImagePath();
        const attachment = new AttachmentBuilder(imagePath, { name: 'raven.png' });
        const row = getRavenButtonRow();

        await interaction.reply({
            content: '<@948379389131898901>',
            allowedMentions: { users: ['948379389131898901'] },
            files: [attachment],
            components: [row]
        });
    }
};
