const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createEmbed, errorEmbed } = require('../../utils/embeds');

const ACTIVITIES = {
    spellcast: { name: 'SpellCast', id: '852509694341283871', emoji: '🪄' },
    letter: { name: 'Letter League', id: '879863686565621790', emoji: '🔤' },
    checkers: { name: 'Checkers in the Park', id: '832013003968348200', emoji: '⚪' }
};

module.exports = {
    name: 'activity',
    aliases: ['startactivity', 'together'],
    description: 'Launch a Discord VC Activity (YouTube, Poker, Chess, Doodle, etc.)',
    category: 'fun',
    slashData: new SlashCommandBuilder()
        .setName('activity')
        .setDescription('Launch a Discord VC Activity (SpellCast, Letter League, Checkers)')
        .addStringOption(option =>
            option.setName('type')
                .setDescription('Select the activity to launch')
                .setRequired(true)
                .addChoices(
                    { name: '🪄 SpellCast', value: 'spellcast' },
                    { name: '🔤 Letter League', value: 'letter' },
                    { name: '⚪ Checkers in the Park', value: 'checkers' }
                )
        ),

    async execute(message, args, client) {
        const voiceChannel = message.member?.voice?.channel;
        if (!voiceChannel) {
            return message.reply({ embeds: [errorEmbed('You must be in a voice channel to launch an Activity!')] });
        }

        const typeInput = (args[0] || 'spellcast').toLowerCase();
        const activity = ACTIVITIES[typeInput] || ACTIVITIES.spellcast;

        try {
            const invite = await voiceChannel.createInvite({
                targetApplication: activity.id,
                targetType: 2, // Embedded Application
                maxAge: 86400,
                maxUses: 0
            });

            const embed = createEmbed({
                title: `${activity.emoji} Launch ${activity.name}`,
                description: `Click the button below to start **${activity.name}** in **${voiceChannel.name}**!`,
                color: 0x5865F2,
                footer: 'LumeBot Voice Activities'
            });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setLabel(`Start ${activity.name}`)
                    .setStyle(ButtonStyle.Link)
                    .setURL(invite.url)
                    .setEmoji(activity.emoji)
            );

            return message.reply({ embeds: [embed], components: [row] });
        } catch (err) {
            console.error('[ACTIVITY] Failed to create activity invite:', err);
            return message.reply({ embeds: [errorEmbed(`Failed to launch activity: ${err.message}`)] });
        }
    },

    async slashExecute(interaction, client) {
        const voiceChannel = interaction.member?.voice?.channel;
        if (!voiceChannel) {
            return interaction.reply({ embeds: [errorEmbed('You must be in a voice channel to launch an Activity!')], ephemeral: true });
        }

        const typeInput = interaction.options.getString('type');
        const activity = ACTIVITIES[typeInput] || ACTIVITIES.spellcast;

        try {
            const invite = await voiceChannel.createInvite({
                targetApplication: activity.id,
                targetType: 2,
                maxAge: 86400,
                maxUses: 0
            });

            const embed = createEmbed({
                title: `${activity.emoji} Launch ${activity.name}`,
                description: `Click the button below to start **${activity.name}** in **${voiceChannel.name}**!`,
                color: 0x5865F2,
                footer: 'LumeBot Voice Activities'
            });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setLabel(`Start ${activity.name}`)
                    .setStyle(ButtonStyle.Link)
                    .setURL(invite.url)
                    .setEmoji(activity.emoji)
            );

            return interaction.reply({ embeds: [embed], components: [row] });
        } catch (err) {
            console.error('[ACTIVITY] Failed to create activity invite:', err);
            return interaction.reply({ embeds: [errorEmbed(`Failed to launch activity: ${err.message}`)], ephemeral: true });
        }
    }
};
