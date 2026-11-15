// LumeBot — Meow Sound Command
const { playTrackWithIntro } = require('../../systems/voice');
const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    name: 'meow',
    description: 'Play meow.mp3 sound effect in voice channel',
    async execute(message, args, client) {
        if (!message.guild) return;

        const ok = await playTrackWithIntro(message.guild.id, 'meow', false);
        if (ok) {
            return message.reply('🐱 Now playing **meow.mp3** in voice channel!').catch(() => {});
        } else {
            return message.reply({ embeds: [errorEmbed('Could not play meow.mp3 (make sure Verity is connected to VC).')] }).catch(() => {});
        }
    },

    async slashExecute(interaction, client) {
        if (!interaction.guild) return;

        const ok = await playTrackWithIntro(interaction.guild.id, 'meow', false);
        if (ok) {
            return interaction.reply({ content: '🐱 Now playing **meow.mp3** in voice channel!' }).catch(() => {});
        } else {
            return interaction.reply({ content: '❌ Could not play meow.mp3 (make sure Verity is connected to VC).', ephemeral: true }).catch(() => {});
        }
    }
};
