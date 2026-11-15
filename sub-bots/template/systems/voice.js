// Sub-Bot Voice & Music System (Lag-Free Music & Sound Effects Engine)
const dns = require('dns');
try { dns.setDefaultResultOrder('ipv4first'); } catch (e) {}

const {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    AudioPlayerStatus,
    VoiceConnectionStatus,
    getVoiceConnection,
    StreamType,
    entersState
} = require('@discordjs/voice');
const { Readable } = require('stream');
const path = require('path');
const fs = require('fs');
const config = require('../config');

const FISH_AUDIO_API_KEY = process.env.FISH_AUDIO_API_KEY || 'd3b53f4ff57141feb025dd42b9b25fd3';
const activeConnections = new Map(); // guildId -> { connection, player, musicResource, musicProc, isMusicPlaying, superForced }
const guildVolumes = new Map();

function isTTSSuperForced(guildId) {
    const session = activeConnections.get(guildId);
    return session ? !!session.superForced : false;
}

function setSuperForced(guildId, val = true) {
    const session = activeConnections.get(guildId);
    if (session) {
        session.superForced = val;
    }
}

/**
 * Ensure active voice connection exists for a guild
 */
async function ensureVC(guildId, client, member = null) {
    let session = activeConnections.get(guildId);
    if (session && session.connection && session.connection.state.status !== VoiceConnectionStatus.Destroyed) {
        return session;
    }

    let targetChannel = null;
    if (client) {
        try {
            const guild = client.guilds.cache.get(guildId) || await client.guilds.fetch(guildId).catch(() => null);
            if (guild) {
                targetChannel = guild.channels.cache.get('1544153689302896702') || await guild.channels.fetch('1544153689302896702').catch(() => null);
            }
        } catch (e) {}
    }

    if (!targetChannel && member && member.voice && member.voice.channel) {
        targetChannel = member.voice.channel;
    }

    if (!targetChannel || !targetChannel.isVoiceBased()) {
        console.error(`[SUB-BOT VOICE] No valid voice channel found for guild ${guildId}`);
        return null;
    }

    console.log(`[SUB-BOT VOICE] Auto-connecting to VC: "${targetChannel.name}" (${targetChannel.id})`);
    return await joinVC(targetChannel);
}

/**
 * Join a Voice Channel
 */
async function joinVC(voiceChannel) {
    const guildId = voiceChannel.guild.id;

    const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: voiceChannel.guild.id,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator,
        selfDeaf: false,
        selfMute: false,
    });

    const player = createAudioPlayer();

    player.on(AudioPlayerStatus.Playing, () => console.log(`[SUB-BOT VOICE] Audio playing in ${voiceChannel.name}`));
    player.on(AudioPlayerStatus.Idle, () => console.log('[SUB-BOT VOICE] Audio player idle'));
    player.on('error', error => console.error('[SUB-BOT VOICE ERROR]', error.message));

    connection.subscribe(player);

    try {
        await entersState(connection, VoiceConnectionStatus.Ready, 15_000);
        console.log(`[SUB-BOT VOICE] Connected to voice channel ${voiceChannel.name}`);
    } catch (e) {
        console.warn(`[SUB-BOT VOICE] Connection warning:`, e.message);
    }

    const session = {
        connection,
        player,
        musicResource: null,
        musicProc: null,
        isMusicPlaying: false,
        superForced: false,
    };

    activeConnections.set(guildId, session);

    connection.on(VoiceConnectionStatus.Disconnected, async () => {
        try {
            await Promise.race([
                entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
                entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
            ]);
        } catch (error) {
            try { connection.destroy(); } catch (e) {}
            activeConnections.delete(guildId);
            console.log(`[SUB-BOT VOICE] Voice disconnected. Auto-reconnecting in 3s...`);
            setTimeout(() => {
                ensureVC(guildId, voiceChannel.client);
            }, 3000);
        }
    });

    return session;
}

/**
 * Leave Voice Channel
 */
function leaveVC(guildId) {
    const session = activeConnections.get(guildId);
    if (session) {
        try {
            if (session.musicProc) session.musicProc.kill();
            session.connection.destroy();
        } catch (e) {}
        activeConnections.delete(guildId);
        return true;
    }
    return false;
}

/**
 * Set Volume (0-200%)
 */
function setVolume(guildId, percentage) {
    const vol = Math.max(0, Math.min(200, parseInt(percentage, 10) || 100));
    guildVolumes.set(guildId, vol);

    const session = activeConnections.get(guildId);
    if (session && session.musicResource && session.musicResource.volume) {
        session.musicResource.volume.setVolume(vol / 100);
    }
    return vol;
}

function getVolume(guildId) {
    return guildVolumes.has(guildId) ? guildVolumes.get(guildId) : 100;
}

/**
 * Stop currently playing music
 */
function stopMusic(guildId) {
    const session = activeConnections.get(guildId);
    if (!session) return false;

    try {
        if (session.musicProc) {
            try { session.musicProc.kill(); } catch (e) {}
            session.musicProc = null;
        }
        session.isMusicPlaying = false;
        session.superForced = false;
        session.musicResource = null;
        session.player.stop(true);
        return true;
    } catch (e) {
        console.error('[SUB-BOT VOICE] Error stopping music:', e.message);
        return false;
    }
}

/**
 * Play a local audio file (mygal.mp3, farex.mp3, sigma.mp3, tacos.mp3) into VC
 */
async function playAudioFile(guildId, client, member, filePath) {
    let session = await ensureVC(guildId, client, member);
    if (!session) {
        console.error('[SUB-BOT VOICE] Could not connect to VC for audio file.');
        return false;
    }

    if (!fs.existsSync(filePath)) {
        console.error('[SUB-BOT VOICE] Audio file not found:', filePath);
        return false;
    }

    console.log(`[SUB-BOT VOICE] Playing audio file into VC: ${filePath}`);

    try {
        if (session.musicProc) {
            try { session.musicProc.kill(); } catch (e) {}
        }

        const { spawn } = require('child_process');
        const ffmpegPath = getFFmpegPath();
        const currentVol = getVolume(guildId);

        const ffmpegProcess = spawn(ffmpegPath, [
            '-i', filePath,
            '-filter:a', 'volume=2.0',
            '-f', 's16le',
            '-ar', '48000',
            '-ac', '2',
            'pipe:1'
        ], { stdio: ['ignore', 'pipe', 'pipe'] });

        ffmpegProcess.stderr.on('data', data => {
            const str = data.toString().trim();
            if (str.includes('Error') || str.includes('Invalid')) console.error('[SUB-BOT FFMPEG STDERR]', str);
        });

        const resource = createAudioResource(ffmpegProcess.stdout, { inputType: StreamType.Raw, inlineVolume: true });
        resource.volume.setVolume(currentVol / 100);

        session.musicResource = resource;
        session.musicProc = ffmpegProcess;
        session.isMusicPlaying = true;

        session.player.play(resource);

        ffmpegProcess.on('close', () => {
            session.isMusicPlaying = false;
            session.musicProc = null;
            session.musicResource = null;
        });

        return true;
    } catch (e) {
        console.error('[SUB-BOT VOICE] Error playing local audio file:', e.message);
        return false;
    }
}

function getFFmpegPath() {
    if (process.env.FFMPEG_PATH && fs.existsSync(process.env.FFMPEG_PATH)) {
        return process.env.FFMPEG_PATH;
    }
    try {
        const staticPath = require('ffmpeg-static');
        if (staticPath && fs.existsSync(staticPath)) return staticPath;
    } catch (e) {}
    const candidates = [
        '/opt/verity-bot/node_modules/ffmpeg-static/ffmpeg',
        '/usr/local/bin/ffmpeg',
        '/usr/bin/ffmpeg',
        path.resolve(__dirname, '../../../node_modules/ffmpeg-static/ffmpeg')
    ];
    for (const p of candidates) {
        if (fs.existsSync(p)) return p;
    }
    return 'ffmpeg';
}

function getYtDlpPath() {
    if (process.env.YTDLP_PATH && fs.existsSync(process.env.YTDLP_PATH)) {
        return process.env.YTDLP_PATH;
    }
    const candidates = [
        '/opt/verity-bot/bin/yt-dlp',
        path.resolve(__dirname, '../../../bin/yt-dlp'),
        path.join(process.cwd(), 'bin/yt-dlp'),
        '/usr/local/bin/yt-dlp',
        '/usr/bin/yt-dlp'
    ];
    for (const p of candidates) {
        if (fs.existsSync(p)) return p;
    }
    return 'yt-dlp';
}

function getCookiesPath() {
    const candidates = [
        path.join(process.cwd(), 'cookies.txt'),
        path.resolve(__dirname, '../../../cookies.txt'),
        '/opt/verity-bot/cookies.txt',
        '/root/LumeBot/cookies.txt'
    ];
    for (const p of candidates) {
        if (fs.existsSync(p)) return p;
    }
    return null;
}

const TRACK_FILENAME_MAP = {
    mygal: 'mygal.mp3',
    farex: 'farex.mp3',
    sigma: 'sigma.mp3',
    tacos: 'PLS DONATE HYPE TRAIN (TACOS!) (feat. Quataun Music.mp3',
    meow: 'meow.mp3',
    wedding1: '1.wav',
    wedding2: '2.wav',
    wedding3: '3.wav',
};

function getTrackFilePath(trackKey) {
    const filename = TRACK_FILENAME_MAP[trackKey];
    if (!filename) return null;
    const candidates = [
        path.join(process.cwd(), filename),
        path.resolve(__dirname, '../../..', filename),
        path.join('/opt/verity-bot', filename),
        path.join('/root/LumeBot', filename)
    ];
    for (const p of candidates) {
        if (fs.existsSync(p)) return p;
    }
    return candidates[0];
}

async function playTrackWithIntro(guildId, client, member, trackKey) {
    const filePath = getTrackFilePath(trackKey);
    if (!filePath) {
        console.error(`[SUB-BOT VOICE] Unknown track key: ${trackKey}`);
        return false;
    }
    return await playAudioFile(guildId, client, member, filePath);
}

/**
 * Stream music from YouTube, Spotify, Apple Music, or search query
 */
async function playMusicStream(guildId, client, member, input) {
    let session = await ensureVC(guildId, client, member);
    if (!session) return { success: false, reason: 'Could not connect to a voice channel. Join a VC first!' };

    let searchTarget = input.replace(/^(?:[?!/]\w+\s+)+/, '').trim();
    const urlMatch = searchTarget.match(/(https?:\/\/[^\s]+)/i);
    const extractedUrl = urlMatch ? urlMatch[1] : searchTarget;

    if (extractedUrl.includes('spotify.com')) {
        try {
            const res = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(extractedUrl)}`, { headers: { 'User-Agent': 'Mozilla/5.0' } });
            if (res.ok) {
                const data = await res.json();
                if (data.title) searchTarget = `ytsearch1:${data.title} ${data.author_name || ''}`;
            }
        } catch (e) {}
    } else if (extractedUrl.includes('music.apple.com')) {
        try {
            const res = await fetch(extractedUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
            const html = await res.text();
            const match = html.match(/<title>(.*?)<\/title>/i);
            if (match && match[1]) {
                const titleStr = match[1].replace(/Apple Music|Song by/ig, '').trim();
                searchTarget = `ytsearch1:${titleStr}`;
            }
        } catch (e) {}
    } else if (!extractedUrl.startsWith('http://') && !extractedUrl.startsWith('https://') && !searchTarget.startsWith('ytsearch')) {
        searchTarget = `ytsearch1:${searchTarget}`;
    }

    const ytdlpPath = getYtDlpPath();
    const { execFileSync, spawn } = require('child_process');
    let trackTitle = 'Music Stream';
    let mediaUrl = '';
    try {
        const info = execFileSync(ytdlpPath, [
            '--no-playlist',
            '--js-runtimes', 'node',
            '--extractor-args', 'youtube:player_client=android',
            '-f', '18',
            '--no-warnings',
            '--default-search', 'ytsearch1',
            '-O', '%(title)s\n%(url)s',
            searchTarget,
        ], { timeout: 20000, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
        const lines = info.split('\n').map(s => s.trim()).filter(Boolean);
        mediaUrl = lines.length ? lines[lines.length - 1] : '';
        if (lines.length > 1) trackTitle = lines.slice(0, -1).join(' ').slice(0, 120) || trackTitle;
        if (!mediaUrl.startsWith('http')) {
            return { success: false, reason: 'YouTube did not return audio for that.' };
        }
    } catch (e) {
        const stderr = (e.stderr || '').toString();
        const line = stderr.split('\n').map(s => s.trim()).filter(s => s.includes('ERROR:')).pop();
        const reason = (line || 'Could not get that video from YouTube.').replace(/^ERROR:\s*/, '').slice(0, 180);
        console.warn('[SUB-BOT MUSIC] Resolve failed:', reason);
        return { success: false, reason };
    }

    if (session.musicProc) {
        try { session.musicProc.kill(); } catch (e) {}
    }

    try {
        const ffmpegPath = getFFmpegPath();
        const currentVol = getVolume(guildId);
        console.log(`[SUB-BOT MUSIC] Playing "${trackTitle}"`);
        const ffmpegProc = spawn(ffmpegPath, [
            '-hide_banner',
            '-loglevel', 'error',
            '-i', mediaUrl,
            '-filter:a', 'volume=1.5',
            '-f', 's16le',
            '-ar', '48000',
            '-ac', '2',
            'pipe:1'
        ], { stdio: ['ignore', 'pipe', 'pipe'] });

        ffmpegProc.stderr.on('data', d => {
            const str = d.toString().trim();
            if (str && (str.includes('Error') || str.includes('Invalid'))) console.error('[SUB-BOT FFMPEG STDERR]', str.slice(0, 300));
        });
        ffmpegProc.stdout.on('error', () => {});
        ffmpegProc.on('error', err => console.error('[SUB-BOT FFMPEG PROC ERROR]', err.message));

        const resource = createAudioResource(ffmpegProc.stdout, { inputType: StreamType.Raw, inlineVolume: true });
        resource.volume.setVolume(currentVol / 100);

        session.musicResource = resource;
        session.musicProc = ffmpegProc;
        session.isMusicPlaying = true;
        session.player.play(resource);

        ffmpegProc.on('close', () => {
            console.log('[SUB-BOT MUSIC] Audio stream closed.');
            if (session.musicProc === ffmpegProc) {
                session.isMusicPlaying = false;
                session.musicProc = null;
                session.musicResource = null;
            }
        });

        return { success: true, title: trackTitle };
    } catch (err) {
        console.error('[SUB-BOT MUSIC ERROR]', err.message);
        return { success: false, reason: err.message };
    }
}

module.exports = {
    ensureVC,
    joinVC,
    leaveVC,
    setVolume,
    getVolume,
    stopMusic,
    playAudioFile,
    playTrackWithIntro,
    playMusicStream,
    isTTSSuperForced,
    setSuperForced,
};
