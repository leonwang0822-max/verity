// Verity — LeonW Command
// Sends current leonw media (leonwedits.mp4) with a "Change Image" button underneath

const path = require('path');
const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const {
    getLeonwImagePath,
    getLeonwButtonRow,
    saveLeonwImage,
    handleLeonwButton,
    isAuthorized
} = require('../../systems/leonwImage');

module.exports = {
    name: 'leonw',
    aliases: ['leonwpic', 'leonwimage'],
    description: 'LeonW video/image',
    category: 'fun',
    slashData: new SlashCommandBuilder()
        .setName('leonw')
        .setDescription('LeonW video/image')
        .addAttachmentOption(opt =>
            opt.setName('image')
                .setDescription('New video or image')
                .setRequired(false)
        ),

    execute: async (message, args, client) => {
        const canEdit = isAuthorized(message.author.id);

        // Check if a video/image was attached or passed as link
        const directAttachment = message.attachments.find(a =>
            a.contentType?.startsWith('image/') ||
            a.contentType?.startsWith('video/') ||
            /\.(mp4|mov|webm|png|jpe?g|webp|gif)$/i.test(a.name)
        );
        const directUrl = args[0] && /^https?:\/\/.*\.(mp4|mov|webm|png|jpe?g|webp|gif)/i.test(args[0]) ? args[0] : null;

        if (canEdit && (directAttachment || directUrl)) {
            try {
                const targetUrl = directAttachment ? directAttachment.url : directUrl;
                const { buffer, fileName } = await saveLeonwImage(targetUrl);
                const attachment = new AttachmentBuilder(buffer, { name: fileName });
                const row = getLeonwButtonRow();

                return message.reply({
                    content: '<@1488316093964746872>',
                    allowedMentions: { users: ['1488316093964746872'] },
                    files: [attachment],
                    components: [row]
                }).catch(() => null);
            } catch (err) {
                return message.reply(`Failed: ${err.message}`).catch(() => {});
            }
        }

        // Send current media with "Change Image" button
        const mediaPath = getLeonwImagePath();
        const attachment = new AttachmentBuilder(mediaPath, { name: path.basename(mediaPath) });
        const row = getLeonwButtonRow();

        return message.reply({
            content: '<@1488316093964746872>',
            allowedMentions: { users: ['1488316093964746872'] },
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
                const { buffer, fileName } = await saveLeonwImage(attachmentOption.url);
                const attachment = new AttachmentBuilder(buffer, { name: fileName });
                const row = getLeonwButtonRow();
                return interaction.editReply({
                    content: '<@1488316093964746872>',
                    allowedMentions: { users: ['1488316093964746872'] },
                    files: [attachment],
                    components: [row]
                });
            } catch (err) {
                return interaction.editReply(`Failed: ${err.message}`);
            }
        }

        await interaction.deferReply();
        const mediaPath = getLeonwImagePath();
        const attachment = new AttachmentBuilder(mediaPath, { name: path.basename(mediaPath) });
        const row = getLeonwButtonRow();

        await interaction.editReply({
            content: '<@1488316093964746872>',
            allowedMentions: { users: ['1488316093964746872'] },
            files: [attachment],
            components: [row]
        });
    }
};
