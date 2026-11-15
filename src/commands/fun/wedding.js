const { playTrackWithIntro } = require('../../systems/voice');

module.exports = {
    name: 'wedding',
    description: 'Play wedding music track (1, 2, or 3)',
    category: 'fun',
    async execute(message, args) {
        if (!message.guild) return;

        let num = args[0] ? args[0].trim() : '';
        if (!['1', '2', '3'].includes(num)) {
            num = String(Math.floor(Math.random() * 3) + 1);
        }

        const trackKey = `wedding${num}`;
        const ok = await playTrackWithIntro(message.guild.id, trackKey, false);

        if (ok) {
            return message.reply(`💒 Now playing **Wedding Music ${num} (${num}.wav)** in voice channel!`).catch(() => {});
        } else {
            return message.reply(`❌ Could not play Wedding Music ${num} (make sure Verity is connected to VC).`).catch(() => {});
        }
    },
};
