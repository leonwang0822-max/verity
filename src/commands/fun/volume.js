const { SlashCommandBuilder } = require('discord.js');
const { setVolume, getVolume } = require('../../systems/voice');

module.exports = {
    name: 'volume',
    aliases: ['vol'],
    description: 'Set or check the voice playback & TTS volume level (0-200%)',
    category: 'fun',
    slashData: new SlashCommandBuilder()
        .setName('volume')
        .setDescription('Set or check the voice playback & TTS volume level (0-200%)')
        .addIntegerOption(option => 
            option.setName('level')
                .setDescription('Volume level percentage (0 to 200)')
                .setRequired(false)
                .setMinValue(0)
                .setMaxValue(200)
        ),

    async execute(message, args, client) {
        const guildId = message.guild.id;

        if (!args[0]) {
            const currentVol = getVolume(guildId);
            return message.reply(`🔊 Current voice volume is set to **${currentVol}%**.`);
        }

        const level = parseInt(args[0], 10);
        if (isNaN(level) || level < 0 || level > 200) {
            return message.reply('❌ Please specify a valid volume level between `0` and `200`%. Example: `?volume 150`');
        }

        const newVol = setVolume(guildId, level);
        return message.reply(`🔊 Voice playback & TTS volume set to **${newVol}%**!`);
    },

    async slashExecute(interaction, client) {
        const guildId = interaction.guild.id;
        const level = interaction.options.getInteger('level');

        if (level === null || level === undefined) {
            const currentVol = getVolume(guildId);
            return interaction.reply({ content: `🔊 Current voice volume is set to **${currentVol}%**.`, ephemeral: true });
        }

        const newVol = setVolume(guildId, level);
        return interaction.reply({ content: `🔊 Voice playback & TTS volume set to **${newVol}%**!` });
    }
};
