const { SlashCommandBuilder } = require('discord.js');
const { getVCSession, playTrackWithIntro } = require('../../systems/voice');

module.exports = {
    name: 'tacos',
    aliases: ['taco', 'plsdonate'],
    description: 'Play PLS DONATE HYPE TRAIN TACOS sound in voice chat',
    category: 'fun',
    slashData: new SlashCommandBuilder()
        .setName('tacos')
        .setDescription('Play PLS DONATE HYPE TRAIN TACOS sound in voice chat'),

    async execute(message, args, client) {
        if (!message.member.voice.channel) {
            return message.reply('You must be in a voice channel to use this command!');
        }

        const session = getVCSession(message.guild.id);
        if (!session) {
            return message.reply('Verity is not in a voice channel! Use `?join` first.');
        }

        await message.reply('🌮 Playing **PLS DONATE HYPE TRAIN (TACOS!)** in VC!');
        await playTrackWithIntro(message.guild.id, 'tacos');
    },

    async slashExecute(interaction, client) {
        if (!interaction.member.voice.channel) {
            return interaction.reply({ content: 'You must be in a voice channel to use this command!', ephemeral: true });
        }

        const session = getVCSession(interaction.guild.id);
        if (!session) {
            return interaction.reply({ content: 'Verity is not in a voice channel! Use `/join` first.', ephemeral: true });
        }

        await interaction.reply('🌮 Playing **PLS DONATE HYPE TRAIN (TACOS!)** in VC!');
        await playTrackWithIntro(interaction.guild.id, 'tacos');
    }
};
