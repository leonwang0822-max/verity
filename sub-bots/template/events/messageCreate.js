// Sub-Bot Message Handler (Strictly Music & Soundboard Bot - No AI Chat, No TTS)
const config = require('../config');
const { playMusicStream, playTrackWithIntro, stopMusic, setVolume, getVolume, leaveVC, ensureVC, isTTSSuperForced, setSuperForced } = require('../systems/voice');

const SUPERFORCE_USERS = ['1488316093964746872', '1127771626822447174'];

module.exports = async function handleMessageCreate(message, client) {
    if (message.author.bot) return;

    const targetChannelId = config.channelId || '1544153689302896702';

    // STRICT SCOPING: Ignore any message sent outside the dedicated channel
    if (message.guild && message.channel.id !== targetChannelId) {
        return;
    }

    const prefix = config.prefix || '?';

    // Strictly ignore any non-command chat messages (No AI chat responses)
    if (!message.content.startsWith(prefix)) {
        return;
    }

    const hasSuperForceAccess = SUPERFORCE_USERS.includes(message.author.id);
    const args = message.content.slice(prefix.length).trim().split(/\s+/);
    const command = args.shift().toLowerCase();

    console.log(`[SUB-BOT MUSIC CMD] ${message.author.tag} in #${message.channel.name}: "${message.content}"`);

    // Superforce lock check
    if (isTTSSuperForced(message.guild.id) && !hasSuperForceAccess) {
        return message.reply('Muheheehe the bot has been take over by LeonW').catch(() => {});
    }

    // ?superforceplay <song/link>
    if (command === 'superforceplay') {
        if (!hasSuperForceAccess) {
            return message.reply('Muheheehe the bot has been take over by LeonW').catch(() => {});
        }
        const query = args.join(' ');
        if (!query) {
            return message.reply(`❌ Please provide a song name or link! Example: \`${prefix}superforceplay mygal\` or \`${prefix}superforceplay <link>\``).catch(() => {});
        }
        const lowerQuery = query.toLowerCase();
        if (['mygal', 'farex', 'sigma', 'tacos', 'meow'].includes(lowerQuery)) {
            const ok = await playTrackWithIntro(message.guild.id, client, message.member, lowerQuery);
            if (ok) {
                setSuperForced(message.guild.id, true);
                return message.reply(`😈 **SUPER FORCE PLAY ACTIVE!** Now playing **${lowerQuery}**!`).catch(() => {});
            } else {
                return message.reply(`❌ Could not super force play ${lowerQuery}.`).catch(() => {});
            }
        }

        message.channel.sendTyping().catch(() => {});
        const res = await playMusicStream(message.guild.id, client, message.member, query);
        if (res.success) {
            setSuperForced(message.guild.id, true);
            return message.reply(`😈 **SUPER FORCE PLAY ACTIVE!** Now playing **"${res.title}"**!`).catch(() => {});
        } else {
            return message.reply(`❌ Could not super force play: ${res.reason || 'Unknown error'}`).catch(() => {});
        }
    }

    // Voice: ?join / ?connect
    if (command === 'join' || command === 'connect') {
        const session = await ensureVC(message.guild.id, client, message.member);
        if (session) {
            return message.reply('🔊 Joined voice channel!');
        } else {
            return message.reply('❌ Please join a voice channel first so I can join you!');
        }
    }

    // Music: ?play <song>
    if (command === 'play' || command === 'p') {
        const query = args.join(' ');
        if (!query) return message.reply(`❌ Please provide a song name or link! Example: \`${prefix}play drake\``);

        message.channel.sendTyping().catch(() => {});
        const res = await playMusicStream(message.guild.id, client, message.member, query);
        if (res.success) {
            return message.reply(`🎶 Now playing **"${res.title}"** in voice channel!`);
        } else {
            return message.reply(`❌ Could not play music: ${res.reason || 'Unknown error'}`);
        }
    }

    // Sound Effects: ?mygal, ?farex, ?sigma, ?tacos, ?meow, ?wedding
    if (['mygal', 'farex', 'sigma', 'tacos', 'meow'].includes(command)) {
        const ok = await playTrackWithIntro(message.guild.id, client, message.member, command);
        if (ok) {
            return message.reply(`🎶 Now playing **${command}** in voice channel!`);
        } else {
            return message.reply(`❌ Could not play ${command} (make sure you are in a voice channel).`);
        }
    }

    if (command === 'wedding') {
        let num = args[0] ? args[0].trim() : '';
        if (!['1', '2', '3'].includes(num)) {
            num = String(Math.floor(Math.random() * 3) + 1);
        }
        const trackKey = `wedding${num}`;
        const ok = await playTrackWithIntro(message.guild.id, client, message.member, trackKey);
        if (ok) {
            return message.reply(`💒 Now playing **Wedding Music ${num} (${num}.wav)** in voice channel!`);
        } else {
            return message.reply(`❌ Could not play Wedding Music ${num}.`);
        }
    }

        if (command === 'raven') {
        return message.reply('https://leonw.dev/raven.png').catch(() => {});
    }

    // Music: ?stop / ?stfu
    if (command === 'stop' || command === 'stfu') {
        const ok = stopMusic(message.guild.id);
        if (ok) return message.reply('⏹️ Stopped music playback!');
        else return message.reply('❌ Nothing is currently playing.');
    }

    // Music: ?leave
    if (command === 'leave') {
        const ok = leaveVC(message.guild.id);
        if (ok) return message.reply('👋 Left the voice channel.');
        else return message.reply('❌ Not currently in a voice channel.');
    }

    // Music: ?volume <0-200>
    if (command === 'volume' || command === 'vol') {
        if (!args[0]) {
            return message.reply(`🔊 Current volume: **${getVolume(message.guild.id)}%**`);
        }
        const vol = parseInt(args[0], 10);
        if (isNaN(vol) || vol < 0 || vol > 200) {
            return message.reply(`❌ Volume must be between 0 and 200. Example: \`${prefix}volume 120\``);
        }
        const newVol = setVolume(message.guild.id, vol);
        return message.reply(`🔊 Volume set to **${newVol}%**!`);
    }

    // Help: ?help
    if (command === 'help') {
        return message.reply(`🎵 **${config.botName} Music Commands:**\n` +
            `• \`${prefix}play <song/link>\` - Play music in voice channel\n` +
            `• \`${prefix}join\` - Connect to voice channel\n` +
            `• \`${prefix}stop\` - Stop music playback\n` +
            `• \`${prefix}volume <0-200>\` - Adjust playback volume\n` +
            `• \`${prefix}tacos\` / \`${prefix}farex\` / \`${prefix}mygal\` / \`${prefix}sigma\` / \`${prefix}wedding [1-3]\` - Sound effects\n` +
            `• \`${prefix}leave\` - Make bot leave voice channel`);
    }
};
