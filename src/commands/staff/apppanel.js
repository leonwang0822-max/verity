const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { sendApplicationPanel } = require('../../systems/tickets');
const { successEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    name: 'apppanel',
    aliases: ['applicationpanel', 'applypanel'],
    description: 'Send the Staff & Developer Application Panel to a channel',
    category: 'staff',
    slashData: new SlashCommandBuilder()
        .setName('apppanel')
        .setDescription('Send the Staff & Developer Application Panel to a channel')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addChannelOption(option => 
            option.setName('channel')
                .setDescription('The channel to send the application panel to (defaults to current channel or #applications)')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(false)
        ),

    async execute(message, args, client) {
        let targetChannel = message.mentions.channels.first();

        if (!targetChannel && args[0]) {
            targetChannel = message.guild.channels.cache.get(args[0]);
        }

        if (!targetChannel) {
            // Default to requested channel ID 1544153688270970930 if not specified
            targetChannel = message.guild.channels.cache.get('1544153688270970930') || message.channel;
        }

        try {
            await sendApplicationPanel(targetChannel);
            await message.reply({ embeds: [successEmbed(`Application panel successfully sent to ${targetChannel}!`)] }).catch(() => {});
        } catch (err) {
            console.error('[APPPANEL ERROR]', err);
            await message.reply({ embeds: [errorEmbed(`Failed to send application panel: ${err.message}`)] }).catch(() => {});
        }
    },

    async slashExecute(interaction, client) {
        const channelOption = interaction.options.getChannel('channel');
        const targetChannel = channelOption || interaction.guild.channels.cache.get('1544153688270970930') || interaction.channel;

        try {
            await sendApplicationPanel(targetChannel);
            await interaction.reply({ embeds: [successEmbed(`Application panel successfully sent to ${targetChannel}!`)], ephemeral: true }).catch(() => {});
        } catch (err) {
            console.error('[APPPANEL ERROR]', err);
            await interaction.reply({ embeds: [errorEmbed(`Failed to send application panel: ${err.message}`)], ephemeral: true }).catch(() => {});
        }
    }
};
