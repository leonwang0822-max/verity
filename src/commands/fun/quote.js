const { SlashCommandBuilder, AttachmentBuilder, ContextMenuCommandBuilder, ApplicationCommandType } = require('discord.js');
const { generateQuoteImage } = require('../../systems/quote');

module.exports = {
    name: 'quote',
    category: 'fun',
    slashData: new SlashCommandBuilder()
        .setName('quote')
        .setDescription('Generate a quote image from text or a user')
        .addStringOption(option => 
            option.setName('text')
                .setDescription('The text to quote')
                .setRequired(false))
        .addUserOption(option =>
            option.setName('author')
                .setDescription('The author of the quote (defaults to you)')
                .setRequired(false)),
                
    // We also register a context menu command for easy message quoting!
    contextMenu: new ContextMenuCommandBuilder()
        .setName('Quote Message')
        .setType(ApplicationCommandType.Message),
        
    async slashExecute(interaction, client) {
        await interaction.deferReply();
        
        let targetUser = interaction.options.getUser('author') || interaction.user;
        let text = interaction.options.getString('text');
        
        // If no text, check if this is an application context menu command
        if (!text && interaction.isMessageContextMenuCommand && interaction.targetMessage) {
            text = interaction.targetMessage.content || '[Attachment/Embed]';
            targetUser = interaction.targetMessage.author;
        }

        if (!text) {
            return interaction.editReply('Please provide text to quote or use this command as a message context menu / reply.');
        }

        const buffer = await generateQuoteImage(targetUser.username, targetUser.displayName, text, targetUser.displayAvatarURL({ extension: 'png', size: 256 }));
        const attachment = new AttachmentBuilder(buffer, { name: 'quote.png' });
        
        await interaction.editReply({ files: [attachment] });
    },

    async execute(message, args, client) {
        let text = args.join(' ');
        let targetUser = message.author;

        // If replying to a message
        if (message.reference && message.reference.messageId) {
            try {
                const referenced = await message.channel.messages.fetch(message.reference.messageId);
                // If they provided text, quote the referenced user with the custom text.
                // If no text, quote the referenced message.
                if (!text) {
                    text = referenced.content || '[Attachment/Embed]';
                }
                targetUser = referenced.author;
            } catch (err) {
                // message fetch failed
            }
        }

        if (!text) {
            return message.reply('Please provide text or reply to a message to quote it.');
        }

        // Send a typing indicator while generating
        message.channel.sendTyping();
        
        const buffer = await generateQuoteImage(targetUser.username, targetUser.displayName, text, targetUser.displayAvatarURL({ extension: 'png', size: 256 }));
        const attachment = new AttachmentBuilder(buffer, { name: 'quote.png' });
        
        await message.reply({ files: [attachment] });
    }
};
