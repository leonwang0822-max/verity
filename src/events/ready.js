// Verity — Ready Event
const { updateBotPresence } = require('../utils/presence');
const { checkExpiredMutes } = require('../systems/mute');
const { enforceAllLockedRoles } = require('../systems/lockedRoles');
const config = require('../config');

const MAIN_BOT_VC_ID   = '1544153689302896701'; // 😃・Verity's VC  (Main Bot home)
const MUSIC_BOT_VC_ID  = '1544153689302896702'; // 😃・Verity's Music VC (Music Bot only — Main Bot NEVER goes here)

const logger = require('../utils/logger');

module.exports = {
    name: 'ready',
    once: true,
    async execute(client) {
        logger.main(`🎉 Authenticated as ${client.user.tag} (ID: ${client.user.id})`);
        logger.main(`📡 Discord Gateway Ping: ${client.ws.ping}ms | Serving ${client.guilds.cache.size} authorized guild(s)`);

        // Strict Single-Server Enforcement: Auto-leave any unauthorized server
        for (const [id, guild] of client.guilds.cache) {
            if (id !== config.GUILD_ID) {
                logger.warn(`Auto-leaving unauthorized guild: "${guild.name}" (${id})`);
                await guild.leave().catch(() => {});
            } else {
                logger.main(`🏰 Active Guild: "${guild.name}" | Members: ${guild.memberCount} | Channels: ${guild.channels.cache.size}`);
            }
        }

        // Set bot presence status
        updateBotPresence(client);

        // Enforce locked role on startup and every 20 seconds silently
        await enforceAllLockedRoles(client);
        setInterval(() => {
            enforceAllLockedRoles(client);
        }, 20000);

        // Periodically check expired mutes every 15 seconds
        setInterval(() => {
            checkExpiredMutes(client).catch(err => {
                console.error('[MUTE] Interval error checking expired mutes:', err?.message || err);
            });
        }, 15000);

        // Initialize One-Word Story Game state
        const { initOneWordStory } = require('../systems/oneWordStory');
        initOneWordStory(client);

        // 24/7 Voice Channel Watchdog — Main Bot stays in 😃・Verity's VC ONLY
        const { joinVoiceChannel, VoiceConnectionStatus, entersState, getVoiceConnection } = require('@discordjs/voice');

        const { joinVC, getVCSession, leaveVC } = require('../systems/voice');

        const connectMainBotVC = async () => {
            try {
                const guild = client.guilds.cache.get(config.GUILD_ID);
                if (!guild) return;

                const me = await guild.members.fetch(client.user.id).catch(() => null);
                if (me && me.voice && me.voice.channelId === MUSIC_BOT_VC_ID) {
                    console.log('[BOT] Main bot detected in Music VC — force-moving to Verity\'s VC!');
                    leaveVC(guild.id);
                }

                const existingConn = getVoiceConnection(guild.id);
                const session = getVCSession(guild.id);
                const inHome = existingConn &&
                    existingConn.state.status !== VoiceConnectionStatus.Destroyed &&
                    existingConn.state.status !== VoiceConnectionStatus.Disconnected &&
                    existingConn.joinConfig &&
                    existingConn.joinConfig.channelId === MAIN_BOT_VC_ID &&
                    session && session.player &&
                    session.voiceChannelId === MAIN_BOT_VC_ID;
                if (inHome) return;

                const targetVC = guild.channels.cache.get(MAIN_BOT_VC_ID)
                    || await guild.channels.fetch(MAIN_BOT_VC_ID).catch(() => null);
                if (!targetVC) {
                    console.error('[BOT] Main Bot VC not found:', MAIN_BOT_VC_ID);
                    return;
                }

                console.log('[VOICE AUTO-RECONNECT] Connecting main bot to 😃・Verity\'s VC...');
                await joinVC(targetVC, targetVC);
            } catch (err) {
                console.error('[VOICE] Main Bot VC connect error:', err.message);
            }
        };

        // Initial connect
        await connectMainBotVC();

        // Watchdog every 20s — auto-reconnect if dropped, auto-eject if in wrong VC
        setInterval(connectMainBotVC, 20000);

        // Auto-react to existing messages in channel 1544153688270970931 (stupid-stuff)
        const backfillAutoReactions = async () => {
            try {
                const channel = client.channels.cache.get('1544153688270970931')
                    || await client.channels.fetch('1544153688270970931').catch(() => null);
                if (!channel || !channel.isTextBased()) return;

                console.log(`[AUTO-REACT] Fetching messages in #${channel.name || channel.id} to react ☠️ and 😂...`);
                let lastId;
                let totalChecked = 0;
                while (true) {
                    const options = { limit: 100 };
                    if (lastId) options.before = lastId;
                    const messages = await channel.messages.fetch(options).catch(() => null);
                    if (!messages || messages.size === 0) break;

                    for (const [, msg] of messages) {
                        try {
                            const hasSkull = msg.reactions.cache.some(r => r.emoji.name === '☠️' && r.me);
                            const hasJoy = msg.reactions.cache.some(r => r.emoji.name === '😂' && r.me);
                            if (!hasSkull) {
                                await msg.react('☠️').catch(() => {});
                                await new Promise(r => setTimeout(r, 300));
                            }
                            if (!hasJoy) {
                                await msg.react('😂').catch(() => {});
                                await new Promise(r => setTimeout(r, 300));
                            }
                            totalChecked++;
                        } catch (e) {}
                    }
                    lastId = messages.last().id;
                    if (messages.size < 100) break;
                }
                console.log(`[AUTO-REACT] Finished processing ${totalChecked} messages in #${channel.name || channel.id}!`);
            } catch (err) {
                console.error('[AUTO-REACT] Backfill error:', err.message);
            }
        };
        backfillAutoReactions();

        console.log('[BOT] Verity is live, connected to VC, and ready!');
    },
};
