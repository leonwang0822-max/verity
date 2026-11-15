// LumeBot — Voice & TTS System (Exact Timestamp Music Resumption & Auto-VC Reconnect Engine)
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
const config = require('../config');

const FISH_AUDIO_API_KEY = process.env.FISH_AUDIO_API_KEY || 'd3b53f4ff57141feb025dd42b9b25fd3';
const PERMANENT_VC_ID = '1544153689302896701'; // 😃・Verity's VC (main bot). Music VC is sub-bot only.

const activeConnections = new Map(); // guildId -> { connection, player, musicResource, musicProc, isMusicPlaying, musicStartedAt, lastMusicQuery, lastLocalTrack, voiceChannelId, textChannelId }

/**
 * Ensure active voice connection exists for a guild (auto-joins if disconnected)
 */
async function ensureVC(guildId, client = null, member = null) {
    let session = activeConnections.get(guildId);
    if (session && session.connection && session.connection.state.status !== VoiceConnectionStatus.Destroyed) {
        return session;
    }

    console.log(`[VOICE AUTO-RECONNECT] Verity not in VC for guild ${guildId}. Auto-connecting now...`);

    let targetChannel = null;
    if (client) {
        const guild = client.guilds.cache.get(guildId) || await client.guilds.fetch(guildId).catch(() => null);
        if (guild) {
            targetChannel = guild.channels.cache.get(PERMANENT_VC_ID) || await guild.channels.fetch(PERMANENT_VC_ID).catch(() => null);
        }
    }
    if (!targetChannel && member && member.voice && member.voice.channel) {
        targetChannel = member.voice.channel;
    }

    if (!targetChannel) return null;

    const defaultText = targetChannel.guild.channels.cache.find(c => c.isTextBased()) || targetChannel;
    await joinVC(targetChannel, defaultText);
    return activeConnections.get(guildId) || null;
}

/**
 * Join a Voice Channel
 */
async function joinVC(voiceChannel, textChannel) {
    const guildId = voiceChannel.guild.id;

    const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: voiceChannel.guild.id,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator,
        selfDeaf: false,
        selfMute: false,
    });

    const player = createAudioPlayer();

    player.on(AudioPlayerStatus.Playing, () => console.log('[VOICE PLAYER] Playing audio out loud in VC!'));
    player.on(AudioPlayerStatus.Idle, () => console.log('[VOICE PLAYER] Audio player state idle.'));
    player.on('error', error => console.error('[VOICE PLAYER ERROR]', error.message));

    connection.subscribe(player);

    connection.on('debug', console.log);
    connection.on('error', console.error);

    try {
        await entersState(connection, VoiceConnectionStatus.Ready, 15_000);
        console.log(`[VOICE] Successfully connected to voice channel ${voiceChannel.name}`);
    } catch (e) {
        console.warn(`[VOICE] Connection state warning for ${voiceChannel.name}:`, e.message);
    }

    activeConnections.set(guildId, {
        connection,
        player,
        musicResource: null,
        musicProc: null,
        isMusicPlaying: false,
        musicStartedAt: 0,
        lastMusicQuery: null,
        lastLocalTrack: null,
        voiceChannelId: voiceChannel.id,
        textChannelId: textChannel.id,
    });

    connection.on(VoiceConnectionStatus.Disconnected, async (oldState, newState) => {
        try {
            await Promise.race([
                entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
                entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
            ]);
            console.log(`[VOICE RECONNECT] Successfully reconnected to voice channel ${voiceChannel.name}!`);
        } catch (error) {
            console.log(`[VOICE DISCONNECT] Connection permanently lost for guild ${guildId}. Cleaning up.`);
            try { connection.destroy(); } catch (e) {}
            activeConnections.delete(guildId);
        }
    });

    connection.on(VoiceConnectionStatus.Destroyed, () => {
        activeConnections.delete(guildId);
    });

    return { connection, player };
}

/**
 * Leave a Voice Channel
 */
function leaveVC(guildId) {
    const active = activeConnections.get(guildId);
    if (active) {
        try {
            if (active.musicProc) active.musicProc.kill();
            active.connection.destroy();
        } catch (e) {}
        activeConnections.delete(guildId);
        return true;
    }
    const conn = getVoiceConnection(guildId);
    if (conn) {
        try {
            conn.destroy();
        } catch (e) {}
        return true;
    }
    return false;
}

/**
 * Get active voice session info for a guild
 */
function getVCSession(guildId) {
    return activeConnections.get(guildId) || null;
}

const guildVolumes = new Map();

function setVolume(guildId, percentage) {
    const vol = Math.max(0, Math.min(200, parseInt(percentage, 10) || 100));
    guildVolumes.set(guildId, vol);
    console.log(`[VOICE] Volume for guild ${guildId} set to ${vol}%`);

    const session = activeConnections.get(guildId);
    if (session && session.musicResource && session.musicResource.volume) {
        session.musicResource.volume.setVolume(vol / 100);
    }
    return vol;
}

function getVolume(guildId) {
    return guildVolumes.has(guildId) ? guildVolumes.get(guildId) : 100;
}

const speechQueues = new Map(); // guildId -> Array<{ rawText, resolve }>
const isProcessingQueue = new Map(); // guildId -> boolean
const MAX_TTS_CHAR_LIMIT = 150;

/**
 * Queue speech request
 */
async function speakText(guildId, rawText) {
    return new Promise((resolve) => {
        if (!speechQueues.has(guildId)) {
            speechQueues.set(guildId, []);
        }
        speechQueues.get(guildId).push({ rawText, resolve });
        processSpeechQueue(guildId);
    });
}

async function processSpeechQueue(guildId) {
    if (isProcessingQueue.get(guildId)) return;
    const queue = speechQueues.get(guildId);
    if (!queue || queue.length === 0) return;

    isProcessingQueue.set(guildId, true);

    while (queue.length > 0) {
        const item = queue.shift();
        const success = await executeSpeakText(guildId, item.rawText);
        item.resolve(success);
    }

    isProcessingQueue.set(guildId, false);
}

/**
 * Executes TTS: Stops music during speech and resumes music from EXACT timestamp when speech finishes
 */
async function executeSpeakText(guildId, rawText) {
    let session = await ensureVC(guildId);
    if (!session) return false;

    if (session.superForced) {
        console.log(`[VOICE] Superforce active: blocking TTS speech for guild ${guildId}`);
        return false;
    }

    // Clean text for TTS
    let clean = rawText
        .replace(/<@!?\d+>/g, '')
        .replace(/<#\d+>/g, '')
        .replace(/<:\w+:\d+>/g, '')
        .replace(/https?:\/\/\S+/g, 'link')
        .replace(/[`*_~#]/g, '')
        .replace(/\[REACT:[^\]]+\]/gi, '')
        .trim();

    if (!clean) return false;
    
    if (clean.length > MAX_TTS_CHAR_LIMIT) {
        clean = clean.slice(0, MAX_TTS_CHAR_LIMIT) + '...';
    }

    console.log(`[VOICE QUEUE] Generating TTS for guild ${guildId} (${clean.length} chars): "${clean}"`);

    let audioBuffer = null;

    // Try 1: Fish Audio API
    try {
        const response = await fetch('https://api.fish.audio/v1/tts', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${FISH_AUDIO_API_KEY}`,
                'Content-Type': 'application/json',
                'model': 's2.1-pro-free',
            },
            body: JSON.stringify({
                text: clean,
                reference_id: '8d21b053e2804e2a890e1cf62f267b6f',
                format: 'mp3',
            }),
        });

        if (response.ok) {
            const arrayBuf = await response.arrayBuffer();
            audioBuffer = Buffer.from(arrayBuf);
            console.log(`[VOICE] Fish Audio TTS success! Size: ${audioBuffer.length} bytes`);
        } else {
            const errText = await response.text().catch(() => '');
            console.warn(`[VOICE] Fish Audio API status ${response.status}: ${errText}`);
        }
    } catch (e) {
        console.error('[VOICE] Fish Audio request failed:', e.message);
    }

    if (!audioBuffer || audioBuffer.length === 0) {
        console.error('[VOICE] Could not generate audio stream.');
        return false;
    }

    if (session.ttsPaused) {
        console.log(`[VOICE] Skipping TTS for guild ${guildId} because TTS is paused.`);
        return false;
    }

    // Save active music track state & calculate exact timestamp offset before stopping music
    const savedMusicQuery = session.lastMusicQuery;
    const savedLocalTrack = session.lastLocalTrack;
    let resumeOffsetSec = 0;

    if (session.isMusicPlaying && session.musicStartedAt > 0) {
        resumeOffsetSec = Math.max(0, Math.floor((Date.now() - session.musicStartedAt) / 1000));
        console.log(`[VOICE] Music paused at ${resumeOffsetSec}s mark for TTS speech.`);
        if (session.musicProc) {
            try { session.musicProc.kill(); } catch (e) {}
            session.musicProc = null;
        }
        session.isMusicPlaying = false;
    }

    try {
        const { spawn } = require('child_process');
        const ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';
        const currentVol = getVolume(guildId);

        const ffmpegProcess = spawn(ffmpegPath, [
            '-i', 'pipe:0',
            '-filter:a', 'volume=1.8',
            '-f', 's16le',
            '-ar', '48000',
            '-ac', '2',
            'pipe:1'
        ], { stdio: ['pipe', 'pipe', 'pipe'] });

        ffmpegProcess.stderr.on('data', () => {});

        const inputStream = Readable.from(audioBuffer);
        inputStream.pipe(ffmpegProcess.stdin);

        const ttsResource = createAudioResource(ffmpegProcess.stdout, { inputType: StreamType.Raw, inlineVolume: true });
        ttsResource.volume.setVolume(currentVol / 100);

        // Play TTS speech resource out loud
        session.player.play(ttsResource);
        console.log(`[VOICE] Playing TTS speech out loud in VC (${audioBuffer.length} bytes input)`);

        try {
            await entersState(session.player, AudioPlayerStatus.Playing, 5_000).catch(() => {});
            await entersState(session.player, AudioPlayerStatus.Idle, 30_000);
        } catch (e) {
            console.log('[VOICE QUEUE] TTS speech playback completed.');
        }

        // EXACT TIMESTAMP RESUME: Resume music playback from exact second offset where it was paused
        if (savedLocalTrack || savedMusicQuery) {
            console.log(`[VOICE AUTO-RESUME] Speech finished! Resuming music from exact ${resumeOffsetSec}s timestamp...`);
            setTimeout(async () => {
                const s = activeConnections.get(guildId);
                if (s && !s.isMusicPlaying) {
                    if (savedLocalTrack) {
                        await playAudioFile(guildId, savedLocalTrack, resumeOffsetSec);
                    } else if (savedMusicQuery) {
                        await playMusicStream(guildId, savedMusicQuery, false, resumeOffsetSec);
                    }
                }
            }, 300);
        }

        return true;
    } catch (pe) {
        console.error('[VOICE] Speech execution error:', pe.message);
        return false;
    }
}

/**
 * Play a local audio file into VC with timestamp offset support and auto-reconnect
 */
async function playAudioFile(guildId, filePath, startOffsetSeconds = 0) {
    let session = await ensureVC(guildId);
    if (!session) {
        console.error('[VOICE] Could not auto-connect to VC for guild:', guildId);
        return false;
    }

    const fs = require('fs');
    const path = require('path');
    let targetPath = filePath;
    if (!fs.existsSync(targetPath)) {
        const altPath = path.join(process.cwd(), path.basename(filePath));
        if (fs.existsSync(altPath)) targetPath = altPath;
    }

    if (!fs.existsSync(targetPath)) {
        console.error('[VOICE] Audio file not found:', filePath);
        return false;
    }

    console.log(`[VOICE] Playing local audio file into VC (offset ${startOffsetSeconds}s): ${targetPath}`);

    try {
        if (session.musicProc) {
            try { session.musicProc.kill(); } catch (e) {}
        }

        const { spawn } = require('child_process');
        const ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';
        const currentVol = getVolume(guildId);

        const ffmpegArgs = [];
        if (startOffsetSeconds > 0) {
            ffmpegArgs.push('-ss', `${startOffsetSeconds}`);
        }
        ffmpegArgs.push(
            '-i', filePath,
            '-filter:a', 'volume=2.0',
            '-f', 's16le',
            '-ar', '48000',
            '-ac', '2',
            'pipe:1'
        );

        const ffmpegProcess = spawn(ffmpegPath, ffmpegArgs, { stdio: ['ignore', 'pipe', 'pipe'] });

        ffmpegProcess.stderr.on('data', () => {});

        const resource = createAudioResource(ffmpegProcess.stdout, { inputType: StreamType.Raw, inlineVolume: true });
        resource.volume.setVolume(currentVol / 100);

        session.musicResource = resource;
        session.musicProc = ffmpegProcess;
        session.isMusicPlaying = true;
        session.musicStartedAt = Date.now() - (startOffsetSeconds * 1000);
        session.lastLocalTrack = filePath;
        session.lastMusicQuery = null;

        session.player.play(resource);
        console.log(`[VOICE STREAM] Playing track "${filePath}" starting at ${startOffsetSeconds}s`);

        ffmpegProcess.on('close', () => {
            console.log(`[VOICE STREAM] Local track ${filePath} finished.`);
            session.isMusicPlaying = false;
            session.musicProc = null;
            session.musicResource = null;
        });

        return true;
    } catch (e) {
        console.error('[VOICE] Local file playback error:', e.message);
        return false;
    }
}

/**
 * Force play audio file
 */
async function forcePlayAudioFile(guildId, filePath) {
    const session = await ensureVC(guildId);
    if (!session) return false;

    session.ttsPaused = true;
    return await playAudioFile(guildId, filePath, 0);
}

/**
 * Resume TTS and unpause voice state
 */
function resumeTTS(guildId) {
    const session = activeConnections.get(guildId);
    if (!session) return false;

    session.ttsPaused = false;
    session.superForced = false;
    console.log(`[VOICE] Resumed TTS for guild ${guildId}`);
    return true;
}

/**
 * Check if TTS is paused for a guild
 */
function isTTSPaused(guildId) {
    const session = activeConnections.get(guildId);
    return session ? !!session.ttsPaused : false;
}

function isTTSSuperForced(guildId) {
    const session = activeConnections.get(guildId);
    return session ? !!session.superForced : false;
}

function setSuperForced(guildId, val = true) {
    const session = activeConnections.get(guildId);
    if (session) {
        session.superForced = val;
        if (val) session.ttsPaused = true;
    }
}

const path = require('path');

const TRACK_INTROS = {
    mygal: { text: "do yall wanan here my favourite song?", file: path.join(process.cwd(), "mygal.mp3") },
    farex: { text: "FAREX PULL MY PEARL", file: path.join(process.cwd(), "farex.mp3") },
    sigma: { text: "you guys are all sigma boys", file: path.join(process.cwd(), "sigma.mp3") },
    tacos: { text: "PLS DONATE HYPE TRAIN TACOS", file: path.join(process.cwd(), "PLS DONATE HYPE TRAIN (TACOS!) (feat. Quataun Music.mp3") },
    meow: { text: "meow meow meow", file: path.join(process.cwd(), "meow.mp3") },
    wedding1: { text: "wedding 1", file: path.join(process.cwd(), "1.wav") },
    wedding2: { text: "wedding 2", file: path.join(process.cwd(), "2.wav") },
    wedding3: { text: "wedding 3", file: path.join(process.cwd(), "3.wav") },
};

/**
 * Play a track with a TTS intro line preceding it
 */
async function playTrackWithIntro(guildId, trackKey, isForce = false) {
    const track = TRACK_INTROS[trackKey];
    if (!track) return false;

    const session = await ensureVC(guildId);
    if (!session) return false;

    if (isForce) {
        session.ttsPaused = true;
    }

    // Play track file directly without any TTS speech intro
    return await playAudioFile(guildId, track.file, 0);
}

/**
 * Skip currently playing music track
 */
function skipTTS(guildId) {
    const session = activeConnections.get(guildId);
    if (!session) return false;

    try {
        if (session.musicProc) {
            session.musicProc.kill();
            session.musicProc = null;
        }
        session.isMusicPlaying = false;
        session.musicResource = null;
        session.lastMusicQuery = null;
        session.lastLocalTrack = null;
        session.musicStartedAt = 0;
        session.player.stop(true);
        console.log(`[VOICE QUEUE] Skipped current background music for guild ${guildId}`);
        return true;
    } catch (e) {
        console.error('[VOICE QUEUE] Error skipping track:', e.message);
        return false;
    }
}

/**
 * Stream music from YouTube, Spotify, Apple Music, or search terms into VC with timestamp resumption & auto-reconnect
 */
async function playMusicStream(guildId, input, isForce = false, startOffsetSeconds = 0) {
    let session = await ensureVC(guildId);
    if (!session) return { success: false, reason: 'Verity could not auto-connect to voice channel.' };

    let searchTarget = input.replace(/^(?:[?!/]\w+\s+)+/, '').trim();
    const urlMatch = searchTarget.match(/(https?:\/\/[^\s]+)/i);
    const extractedUrl = urlMatch ? urlMatch[1] : searchTarget;

    // 1. Spotify Link Resolver
    if (extractedUrl.includes('spotify.com')) {
        try {
            const res = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(extractedUrl)}`, { headers: { 'User-Agent': 'Mozilla/5.0' } });
            if (res.ok) {
                const data = await res.json();
                if (data.title) {
                    searchTarget = `ytsearch1:${data.title} ${data.author_name || ''}`;
                }
            }
        } catch (e) {
            console.error('[SPOTIFY RESOLVER ERROR]', e.message);
        }
    } 
    // 2. Apple Music Link Resolver
    else if (extractedUrl.includes('music.apple.com')) {
        try {
            const res = await fetch(extractedUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } });
            const html = await res.text();
            const match = html.match(/<title>(.*?)<\/title>/i);
            if (match && match[1]) {
                const titleStr = match[1]
                    .replace(/Apple[\s\u00A0]Music/ig, '')
                    .replace(/Song by/ig, '')
                    .replace(/[^\w\s.,?!'"()[\]+-]/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim();
                searchTarget = `ytsearch1:${titleStr}`;
            }
        } catch (e) {
            console.error('[APPLE MUSIC RESOLVER ERROR]', e.message);
        }
    }
    // 3. Direct HTTP/HTTPS URLs
    else if (extractedUrl.startsWith('http://') || extractedUrl.startsWith('https://')) {
        searchTarget = extractedUrl;
    }
    // 4. Plain text search terms
    else if (!searchTarget.startsWith('ytsearch')) {
        searchTarget = `ytsearch1:${searchTarget}`;
    }

    console.log(`[VOICE MUSIC] Processing stream target for guild ${guildId} (offset ${startOffsetSeconds}s): "${searchTarget}"`);

    let trackTitle = 'Music Stream';
    try {
        const { execSync } = require('child_process');
        const ytdlpPath = process.env.YTDLP_PATH || 'yt-dlp';
        const infoJson = execSync(`"${ytdlpPath}" --js-runtimes node -j --no-playlist --default-search "ytsearch1" "${searchTarget.replace(/"/g, '\\"')}"`, { timeout: 15000, stdio: ['ignore', 'pipe', 'ignore'] }).toString();
        const info = JSON.parse(infoJson);
        trackTitle = info.title || trackTitle;
    } catch (e) {
        console.warn('[VOICE MUSIC] Title lookup warning:', e.message);
    }

    if (isForce) {
        session.ttsPaused = true;
    }

    if (session.musicProc) {
        try { session.musicProc.kill(); } catch (e) {}
    }

    try {
        const { spawn } = require('child_process');
        const ytdlpPath = process.env.YTDLP_PATH || 'yt-dlp';
        const ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';

        const currentVol = getVolume(guildId);

        const ytdlpArgs = [
            '--js-runtimes', 'node',
            '--extractor-args', 'youtube:player_client=android,ios,web',
            '-f', 'ba/b',
            '-o', '-',
            '--no-playlist',
            '--default-search', 'ytsearch1',
        ];

        const fs = require('fs');
        const cookieCandidates = ['/opt/verity-bot/cookies.txt', path.join(process.cwd(), 'cookies.txt')];
        for (const cp of cookieCandidates) {
            if (fs.existsSync(cp)) {
                ytdlpArgs.push('--cookies', cp);
                break;
            }
        }
        
        // Pass timestamp offset if resuming mid-song
        if (startOffsetSeconds > 0) {
            ytdlpArgs.push('--download-sections', `*${startOffsetSeconds}-inf`);
        }
        ytdlpArgs.push(searchTarget);

        const ytdlpProc = spawn(ytdlpPath, ytdlpArgs, { stdio: ['ignore', 'pipe', 'ignore'] });

        const ffmpegArgs = [];
        if (startOffsetSeconds > 0) {
            ffmpegArgs.push('-ss', `${startOffsetSeconds}`);
        }
        ffmpegArgs.push(
            '-i', 'pipe:0',
            '-filter:a', 'volume=1.5',
            '-f', 's16le',
            '-ar', '48000',
            '-ac', '2',
            'pipe:1'
        );

        const ffmpegProc = spawn(ffmpegPath, ffmpegArgs, { stdio: ['pipe', 'pipe', 'pipe'] });

        ytdlpProc.on('error', e => console.error('[YTDLP PROC ERROR]', e.message));
        ytdlpProc.stdout.on('error', () => {});
        ffmpegProc.on('error', e => console.error('[FFMPEG PROC ERROR]', e.message));
        ffmpegProc.stdin.on('error', () => {});
        ffmpegProc.stdout.on('error', () => {});

        ytdlpProc.stdout.pipe(ffmpegProc.stdin);

        const resource = createAudioResource(ffmpegProc.stdout, { inputType: StreamType.Raw, inlineVolume: true });
        resource.volume.setVolume(currentVol / 100);

        session.musicResource = resource;
        session.musicProc = ffmpegProc;
        session.isMusicPlaying = true;
        session.musicStartedAt = Date.now() - (startOffsetSeconds * 1000);
        session.lastMusicQuery = input;
        session.lastLocalTrack = null;

        session.player.play(resource);
        console.log(`[VOICE MUSIC] Playing music stream "${trackTitle}" starting at ${startOffsetSeconds}s mark`);

        ffmpegProc.on('close', () => {
            console.log(`[VOICE MUSIC] Music stream finished: "${trackTitle}"`);
            session.isMusicPlaying = false;
            session.musicProc = null;
            session.musicResource = null;
        });

        return { success: true, title: trackTitle };
    } catch (err) {
        console.error('[VOICE MUSIC ERROR]', err.message);
        return { success: false, reason: err.message };
    }
}

/**
 * Auto-join permanent VC on startup
 */
async function autoJoinPermanentVC(client) {
    try {
        const channel = await client.channels.fetch(PERMANENT_VC_ID).catch(() => null);
        if (!channel || !channel.isVoiceBased()) return;

        const session = activeConnections.get(channel.guild.id);
        if (!session) {
            console.log(`[VOICE] Auto-joining permanent VC: "${channel.name}"...`);
            const defaultTextChannel = channel.guild.channels.cache.find(c => c.isTextBased()) || channel;
            await joinVC(channel, defaultTextChannel);
        }
    } catch (e) {
        console.error('[VOICE] Permanent VC auto-join error:', e.message);
    }
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
        session.musicResource = null;
        session.lastMusicQuery = null;
        session.lastLocalTrack = null;
        session.musicStartedAt = 0;
        session.player.stop(true);
        console.log(`[VOICE] Stopped music playback for guild ${guildId}`);
        return true;
    } catch (e) {
        console.error('[VOICE] Error stopping music:', e.message);
        return false;
    }
}

module.exports = {
    joinVC,
    leaveVC,
    getVCSession,
    ensureVC,
    speakText,
    playAudioFile,
    forcePlayAudioFile,
    playTrackWithIntro,
    playMusicStream,
    resumeTTS,
    isTTSPaused,
    isTTSSuperForced,
    setSuperForced,
    setVolume,
    getVolume,
    skipTTS,
    stopMusic,
    autoJoinPermanentVC,
};
