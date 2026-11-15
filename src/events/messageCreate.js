// LumeBot — Message Create Event
// Handles: Muted role chat blocking, 3s user rate-limiting, prefix commands, XP, sticky messages, auto-pin, AI assistant

const config = require('../config');
const db = require('../database/db');
const { handleMessage: handleXP } = require('../systems/leveling');
const { handleSticky } = require('../systems/sticky');
const { handleAutoPin } = require('../systems/autopin');
const { handleAIMessage } = require('../systems/ai');
const { errorEmbed, createEmbed } = require('../utils/embeds');
const { hasAdmin, hasManager, isOwner, DEV_USER_ID } = require('../utils/permissions');

const { handleAutoBan } = require('../systems/autoban');
const { muteUser } = require('../systems/mute');
const { sendLog } = require('../systems/logging');

// ─── Anti-Spam Tracker ───
// Tracks recent message timestamps per user to detect spam bursts
const spamTracker = new Map(); // userId -> { timestamps: [], warned: bool, muted: bool }
const SPAM_MAX_MESSAGES = 5;   // max messages allowed...
const SPAM_WINDOW_MS = 4000;   // ...within this many milliseconds
const SPAM_MUTE_DURATION_MS = 5 * 60 * 1000; // 5 minute mute on spam

module.exports = {
    once: false,
    async execute(client, message) {
        if (!message.guild) return;

        // ─── Ignore second bot's dedicated channel completely ───
        if (message.channel.id === '1544153689302896702') return;

        // ─── 0. Auto-Ban Honeypot Trap Check ───
        const isTrapChannel = await handleAutoBan(message);
        if (isTrapChannel) return;

        if (message.author.bot) return;

        // ─── 0.5 Muted Role Enforcement (TOP PRIORITY — runs before any channel rules) ───
        const isProtectedDev = message.author.id === '1488316093964746872';
        const appealsChannelId = config.APPEALS_CHANNEL_ID || '1544153688774410367';
        if (message.member && message.member.roles.cache.has(config.MUTED_ROLE_ID)) {
            if (isProtectedDev) {
                await message.member.roles.remove(config.MUTED_ROLE_ID, 'Protected user cannot be muted').catch(() => {});
            } else {
                const ticket = db.getTicketByChannel(message.channel.id);
                const isUserTicket = ticket && ticket.userId === message.author.id && ticket.status === 'open';

                if (!isUserTicket) {
                    await message.delete().catch(() => {});
                    try {
                        const warnMsg = await message.channel.send({
                            content: `**${message.author.username}**, you are muted! You can create a ticket in <#${appealsChannelId}> to appeal.`,
                            allowedMentions: { parse: [], users: [], roles: [] }
                        });
                        setTimeout(() => {
                            warnMsg.delete().catch(() => {});
                        }, 4000);
                    } catch (e) {}
                    return;
                }
            }
        }

        // ─── Anti-Spam Check ───
        // Skip admins/staff and protected dev from spam detection
        const isStaff = isProtectedDev || (message.member && (message.member.permissions.has('Administrator') || message.member.permissions.has('ManageMessages')));
        if (!isStaff) {
            const spamUserId = message.author.id;
            const now = Date.now();

            if (!spamTracker.has(spamUserId)) {
                spamTracker.set(spamUserId, { timestamps: [], warned: false });
            }
            const spamData = spamTracker.get(spamUserId);

            // Keep only timestamps within the spam window
            spamData.timestamps = spamData.timestamps.filter(t => now - t < SPAM_WINDOW_MS);
            spamData.timestamps.push(now);

            if (spamData.timestamps.length >= SPAM_MAX_MESSAGES) {
                // Delete the spam message
                await message.delete().catch(() => {});

                if (!spamData.warned) {
                    spamData.warned = true;
                    // Warn the user
                    const warnMsg = await message.channel.send({
                        content: `⚠️ ${message.author} **Slow down!** You're sending messages too fast. Continued spamming will result in a mute.`
                    }).catch(() => null);
                    if (warnMsg) setTimeout(() => warnMsg.delete().catch(() => {}), 7000);
                } else {
                    // Already warned — mute them for 5 minutes
                    spamData.timestamps = [];
                    spamData.warned = false;
                    spamTracker.set(spamUserId, spamData);

                    await muteUser(message.guild, message.member, SPAM_MUTE_DURATION_MS, 'Auto-Mod: Spamming messages', message.client.user).catch(() => {});

                    const muteEmbed = createEmbed({
                        color: config.COLORS.DANGER || 0xED4245,
                        title: '🔇 Muted for Spamming',
                        description: `${message.author} has been muted for **5 minutes** for spamming.`
                    });
                    await message.channel.send({ embeds: [muteEmbed] }).catch(() => {});
                    await sendLog(message.guild, 'Auto-Mod: Spam Mute', `**User:** ${message.author.tag} (${message.author.id})\n**Action:** 5-Minute Mute\n**Reason:** Spamming messages`, [], config.COLORS.DANGER || 0xED4245).catch(() => {});
                }

                return;
            }

            // Reset warned status if they calm down
            if (spamData.timestamps.length <= 1) spamData.warned = false;
        }

        // ─── Giveaway Policy Verification Handler (Ticket 1568517815386771549) ───
        if (message.channel.id === '1568517815386771549' && /\bi\s*agree\b/i.test(message.content || '')) {
            const targetUserId = '1311730878808068251'; // tomgives
            const processEmbed = createEmbed({
                color: config.COLORS.SUCCESS || 0x57F287,
                title: '⏳ Processing Giveaway Prize',
                description: `✅ Thank you <@${targetUserId}>, your agreement to the **Giveaway Policy** has been recorded.\n\n**Please wait while we process the giveaway prize.** Our team will finalize and deliver your reward shortly.`
            });
            await message.channel.send({
                content: `<@${targetUserId}>`,
                embeds: [processEmbed],
                allowedMentions: { users: [targetUserId] }
            }).catch(() => {});
            return;
        }

        // ─── Auto-Threads and Reactions ───
        // Suggestions Channel
        if (message.channel.id === '1544153688774410363') {
            await message.react('✅').catch(() => {});
            await message.react('❌').catch(() => {});
            
            // Open a thread
            let threadName = message.content ? message.content.replace(/<[^>]+>/g, '').trim() : 'Suggestion';
            if (!threadName) threadName = `${message.author.username}'s Suggestion`;
            const thread = await message.startThread({
                name: threadName.length > 100 ? threadName.substring(0, 97) + '...' : threadName,
                autoArchiveDuration: 1440,
                reason: 'Auto thread for suggestion'
            }).catch(() => null);
            if (thread) {
                await thread.send({ content: `${message.author} You can use \`?delete\` in this thread at any time to delete it.` }).catch(() => {});
            }
        }

        // Fan Art & Art Channels
        if (['1544153688270970935', '1544153688270970936'].includes(message.channel.id)) {
            // Check if there is an image (attachment or link)
            if (message.attachments.size > 0 || message.content.includes('http')) {
                await message.react('👍').catch(() => {});
                await message.react('🔥').catch(() => {});
                await message.react('👎').catch(() => {});

                const threadName = `${message.author.username}'s Art`;
                const thread = await message.startThread({
                    name: threadName.length > 100 ? threadName.substring(0, 97) + '...' : threadName,
                    autoArchiveDuration: 1440,
                    reason: 'Auto thread for art'
                }).catch(() => null);
                if (thread) {
                    await thread.send({ content: `${message.author} You can use \`?delete\` in this thread at any time to delete it.` }).catch(() => {});
                }
            } else {
                // Delete text-only messages to keep the channel clean
                await message.delete().catch(() => {});
                return; // Stop processing further
            }
        }

        // Stupid Stuff Channel: Auto-react ☠️ and 😂
        if (message.channel.id === '1544153688270970931') {
            await message.react('☠️').catch(() => {});
            await message.react('😂').catch(() => {});
        }

        // Commands-Only Channel (1544153688270970939)
        if (message.channel.id === '1544153688270970939') {
            const prefix = config.PREFIX || '?';
            const content = message.content.trim();
            const isCommand = content.startsWith(prefix) || content.startsWith('!');

            if (!isCommand) {
                await message.delete().catch(() => {});
                const warnMsg = await message.channel.send({
                    content: `⚠️ ${message.author}, this channel is strictly for **bot commands** (\`?\` or \`!\`). Normal chat messages are automatically deleted!`
                }).catch(() => null);

                if (warnMsg) {
                    setTimeout(() => warnMsg.delete().catch(() => {}), 5000);
                }
                return;
            }
        }

        // Self-Promotion Channel (1544153688774410364)
        if (message.channel.id === '1544153688774410364') {
            const hasAttachment = message.attachments.size > 0;
            const allowedDomainsRegex = /(https?:\/\/)?(www\.)?(discord\.(gg|com|me|io|app)|discordapp\.com|youtube\.com|youtu\.be|twitch\.tv|twitter\.com|x\.com|roblox\.com|tiktok\.com|instagram\.com|kick\.com)\/[^\s]+/i;
            const hasAllowedLink = allowedDomainsRegex.test(message.content);

            if (!hasAttachment && !hasAllowedLink) {
                await message.delete().catch(() => {});
                const warnMsg = await message.channel.send({
                    content: `⚠️ ${message.author}, this channel is strictly for **self-promotion**! You must include an attachment or an allowed link (Discord, YouTube, Twitch, Twitter/X, Roblox, TikTok, Instagram, Kick). Normal chat messages are automatically deleted!`
                }).catch(() => null);

                if (warnMsg) {
                    setTimeout(() => warnMsg.delete().catch(() => {}), 5000);
                }
                return;
            }
        }

        // ─── One Word Sentence Channel Game (1544153688774410365) ───
        if (message.channel.id === '1544153688774410365') {
            const { handleOneWordStoryMessage } = require('../systems/oneWordStory');
            const handled = await handleOneWordStoryMessage(client, message);
            if (handled) return;
        }

        // ─── Application Q&A Wizard Check ───
        const { handleApplicationResponse } = require('../systems/tickets');
        const isAppHandled = await handleApplicationResponse(message);
        if (isAppHandled) return;

        const userId = message.author.id;
        const now = Date.now();

        // ─── 3. Auto-Pin System ───
        await handleAutoPin(message);

        // ─── 4. XP System ───
        await handleXP(message);

        // ─── 5. Sticky Messages ───
        await handleSticky(message);

        // ─── 5.5 Prefix Command Handling (FIRST precedence) ───
        const settings = db.getSettings();
        const prefix = settings.prefix || '?';

        let commandName = null;
        let args = [];

        if (message.content.startsWith('$cmd')) {
            commandName = 'cmd';
            const rawArgs = message.content.slice(4).trim();
            args = rawArgs ? [rawArgs] : [];
        } else if (message.content.startsWith(prefix)) {
            args = message.content.slice(prefix.length).trim().split(/\s+/);
            commandName = args.shift().toLowerCase();
        }

        const VC_ROLE_ID = '1531896115052417115';
        const SUPERFORCE_USERS = ['1488316093964746872', '1127771626822447174'];
        const isBotOwner = SUPERFORCE_USERS.includes(message.author.id) || message.author.id === DEV_USER_ID;

        function canUseJoinLeave(member) {
            return true;
        }

        function canUseVoiceControls(member) {
            return true;
        }

        const { isTTSSuperForced } = require('../systems/voice');
        if (isTTSSuperForced(message.guild.id) && !isBotOwner) {
            return message.reply('Muheheehe the bot has been take over by LeonW').catch(() => {});
        }

        if (commandName === 'join') {
            const freshMember = await message.guild.members.fetch(message.author.id).catch(() => message.member);
            const voiceChannel = freshMember && freshMember.voice ? freshMember.voice.channel : null;
            if (!voiceChannel) {
                return message.reply({ embeds: [errorEmbed('You must be in a voice channel to summon Verity.')] }).catch(() => {});
            }
            const { joinVC } = require('../systems/voice');
            await joinVC(voiceChannel, message.channel);
            return message.reply(`🔊 Joined voice channel **${voiceChannel.name}**!`).catch(() => {});
        }

        if (commandName === 'leave') {
            if (!canUseJoinLeave(message.member)) {
                return message.reply({ embeds: [errorEmbed('Only members with role <@&1531896115052417115> can use `?leave`.')] }).catch(() => {});
            }
            const { leaveVC } = require('../systems/voice');
            const ok = leaveVC(message.guild.id);
            if (ok) {
                return message.reply('👋 Left the voice channel.').catch(() => {});
            } else {
                return message.reply({ embeds: [errorEmbed('Verity is not currently connected to a voice channel.')] }).catch(() => {});
            }
        }

        if (commandName === 'superforceplay') {
            if (!isBotOwner) {
                return message.reply('Muheheehe the bot has been take over by LeonW').catch(() => {});
            }
            const query = args.join(' ');
            if (!query) {
                return message.reply('❌ Please provide a song name or link! Example: `?superforceplay mygal` or `?superforceplay <link>`').catch(() => {});
            }
            const lowerQuery = query.toLowerCase();
            const { playTrackWithIntro, playMusicStream, setSuperForced } = require('../systems/voice');

            if (['mygal', 'farex', 'sigma', 'tacos', 'meow'].includes(lowerQuery)) {
                const ok = await playTrackWithIntro(message.guild.id, lowerQuery, true);
                if (ok) {
                    setSuperForced(message.guild.id, true);
                    return message.reply(`😈 **SUPER FORCE PLAY ACTIVE!** Muheheehe the bot has been take over by LeonW! Now playing **${lowerQuery}**! No one can pause or speak now!`).catch(() => {});
                }
                else return message.reply(`❌ Could not super force play ${lowerQuery} (make sure Verity is connected to VC).`).catch(() => {});
            }

            message.channel.sendTyping().catch(() => {});
            const res = await playMusicStream(message.guild.id, query, true);
            if (res.success) {
                setSuperForced(message.guild.id, true);
                return message.reply(`😈 **SUPER FORCE PLAY ACTIVE!** Muheheehe the bot has been take over by LeonW! Now playing **"${res.title}"**! No one can pause or speak now!`).catch(() => {});
            } else {
                return message.reply(`❌ Could not super force play stream: ${res.reason || 'Unknown error'}`).catch(() => {});
            }
        }

        if (commandName === 'mygal') {
            const { playTrackWithIntro } = require('../systems/voice');
            const ok = await playTrackWithIntro(message.guild.id, 'mygal', false);
            if (ok) {
                return message.reply('🎶 Now playing **mygal.mp3** in voice channel `😃・Verity`!').catch(() => {});
            } else {
                return message.reply('❌ Could not play mygal.mp3 (make sure Verity is connected to VC).').catch(() => {});
            }
        }

        if (commandName === 'farex') {
            const { playTrackWithIntro } = require('../systems/voice');
            const ok = await playTrackWithIntro(message.guild.id, 'farex', false);
            if (ok) {
                return message.reply('🎶 Now playing **farex.mp3** in voice channel `😃・Verity`!').catch(() => {});
            } else {
                return message.reply('❌ Could not play farex.mp3 (make sure Verity is connected to VC).').catch(() => {});
            }
        }

        if (commandName === 'sigma') {
            const { playTrackWithIntro } = require('../systems/voice');
            const ok = await playTrackWithIntro(message.guild.id, 'sigma', false);
            if (ok) {
                return message.reply('🎶 Now playing **sigma.mp3** in voice channel `😃・Verity`!').catch(() => {});
            } else {
                return message.reply('❌ Could not play sigma.mp3 (make sure Verity is connected to VC).').catch(() => {});
            }
        }

        if (commandName === 'tacos') {
            const { playTrackWithIntro } = require('../systems/voice');
            const ok = await playTrackWithIntro(message.guild.id, 'tacos', false);
            if (ok) {
                return message.reply('🌮 Now playing **PLS DONATE HYPE TRAIN (TACOS!)** in voice channel!').catch(() => {});
            } else {
                return message.reply('❌ Could not play tacos (make sure Verity is connected to VC).').catch(() => {});
            }
        }

        if (commandName === 'meow') {
            const { playTrackWithIntro } = require('../systems/voice');
            const ok = await playTrackWithIntro(message.guild.id, 'meow', false);
            if (ok) {
                return message.reply('🐱 Now playing **meow.mp3** in voice channel!').catch(() => {});
            } else {
                return message.reply('❌ Could not play meow.mp3 (make sure Verity is connected to VC).').catch(() => {});
            }
        }

        if (commandName === 'wedding') {
            let num = args[0] ? args[0].trim() : '';
            if (!['1', '2', '3'].includes(num)) {
                num = String(Math.floor(Math.random() * 3) + 1);
            }
            const trackKey = `wedding${num}`;
            const { playTrackWithIntro } = require('../systems/voice');
            const ok = await playTrackWithIntro(message.guild.id, trackKey, false);
            if (ok) {
                return message.reply(`💒 Now playing **Wedding Music ${num} (${num}.wav)** in voice channel!`).catch(() => {});
            } else {
                return message.reply(`❌ Could not play Wedding Music ${num} (make sure Verity is connected to VC).`).catch(() => {});
            }
        }

        if (commandName === 'play') {
            const query = args.join(' ');
            if (!query) {
                return message.reply('❌ Please provide a song name or link (Spotify, Apple Music, YouTube)! Example: `?play drake hotline bling`').catch(() => {});
            }
            const lowerQuery = query.toLowerCase().trim();
            const { playTrackWithIntro, playMusicStream } = require('../systems/voice');

            if (['mygal', 'farex', 'sigma', 'tacos', 'meow'].includes(lowerQuery) || lowerQuery.startsWith('wedding')) {
                let trackKey = lowerQuery;
                if (lowerQuery.startsWith('wedding')) {
                    let num = lowerQuery.replace('wedding', '').trim();
                    if (!['1', '2', '3'].includes(num)) num = '1';
                    trackKey = `wedding${num}`;
                }
                const ok = await playTrackWithIntro(message.guild.id, trackKey, false);
                if (ok) return message.reply(`🎶 Now playing **${trackKey}** in voice channel!`).catch(() => {});
                else return message.reply(`❌ Could not play ${trackKey} (make sure Verity is connected to VC).`).catch(() => {});
            }

            message.channel.sendTyping().catch(() => {});
            const res = await playMusicStream(message.guild.id, query, false);
            if (res.success) {
                return message.reply(`🎶 Now playing **"${res.title}"** in voice channel \`😃・Verity\`!`).catch(() => {});
            } else {
                return message.reply(`❌ Could not play stream: ${res.reason || 'Unknown error'}`).catch(() => {});
            }
        }

        if (commandName === 'forceplay') {
            if (!canUseVoiceControls(message.member)) {
                return message.reply({ embeds: [errorEmbed('You do not have permission to use this command.')] }).catch(() => {});
            }
            const query = args.join(' ');
            if (!query) {
                return message.reply('❌ Please provide a song name or link! Example: `?forceplay mygal` or `?forceplay <link>`').catch(() => {});
            }
            const lowerQuery = query.toLowerCase();
            const { playTrackWithIntro, playMusicStream } = require('../systems/voice');

            if (['mygal', 'farex', 'sigma', 'tacos', 'meow'].includes(lowerQuery)) {
                const ok = await playTrackWithIntro(message.guild.id, lowerQuery, true);
                if (ok) return message.reply(`⏸️ TTS paused! 🎶 Force playing **${lowerQuery}** in voice channel! Use \`?resume\` to resume TTS.`).catch(() => {});
                else return message.reply(`❌ Could not force play ${lowerQuery} (make sure Verity is connected to VC).`).catch(() => {});
            }

            message.channel.sendTyping().catch(() => {});
            const res = await playMusicStream(message.guild.id, query, true);
            if (res.success) {
                return message.reply(`⏸️ TTS paused! 🎶 Force playing **"${res.title}"** in voice channel \`😃・Verity\`! Use \`?resume\` to resume TTS.`).catch(() => {});
            } else {
                return message.reply(`❌ Could not force play stream: ${res.reason || 'Unknown error'}`).catch(() => {});
            }
        }

        if (commandName === 'resume') {
            if (!canUseVoiceControls(message.member)) {
                return message.reply({ embeds: [errorEmbed('You do not have permission to use this command.')] }).catch(() => {});
            }
            const { resumeTTS } = require('../systems/voice');
            resumeTTS(message.guild.id);
            return message.reply('▶️ Resumed TTS and voice playback! Verity can now speak in VC again.').catch(() => {});
        }

        if (commandName === 'skip') {
            if (!canUseVoiceControls(message.member)) {
                return message.reply({ embeds: [errorEmbed('You do not have permission to use this command.')] }).catch(() => {});
            }
            const { skipTTS } = require('../systems/voice');
            const ok = skipTTS(message.guild.id);
            if (ok) {
                return message.reply('⏭️ Skipped current voice playback! Moving to next message...').catch(() => {});
            } else {
                return message.reply('❌ Nothing is currently playing in voice channel.').catch(() => {});
            }
        }

        if (commandName === 'stop') {
            if (!canUseVoiceControls(message.member)) {
                return message.reply({ embeds: [errorEmbed('You do not have permission to use this command.')] }).catch(() => {});
            }
            const { stopMusic } = require('../systems/voice');
            const ok = stopMusic(message.guild.id);
            if (ok) {
                return message.reply('⏹️ Stopped the currently playing music!').catch(() => {});
            } else {
                return message.reply({ embeds: [errorEmbed('Nothing is currently playing in the voice channel.')] }).catch(() => {});
            }
        }

        if (commandName === 'ignore') {
            const IGNORE_ROLE_ID = '1531896115052417115';
            const hasIgnoreRole = message.member && message.member.roles.cache.has(IGNORE_ROLE_ID);
            const SUPERFORCE_USERS = ['1488316093964746872', '1127771626822447174'];
            const isBotOwner = SUPERFORCE_USERS.includes(message.author.id) || message.author.id === DEV_USER_ID;

            if (!hasIgnoreRole && !isBotOwner) {
                return;
            }
            await message.delete().catch(() => {});
            const { toggleAIIgnore } = require('../systems/ai');
            const newState = toggleAIIgnore();
            console.log(`[AI IGNORE] Silent toggle by ${message.author.tag}: ignoreMode = ${newState}`);
            return;
        }

        if (['delete', 'del', 'deltee', 'deleted'].includes(commandName)) {
            if (message.channel.isThread() && ['1544153688774410363', '1544153688270970935', '1544153688270970936'].includes(message.channel.parentId)) {
                let starterMessage = await message.channel.fetchStarterMessage().catch(() => null);
                if (!starterMessage && message.channel.parent) {
                    starterMessage = await message.channel.parent.messages.fetch(message.channel.id).catch(() => null);
                }

                const isAuthor = (starterMessage && (
                    starterMessage.author.id === message.author.id ||
                    starterMessage.content?.includes(message.author.id) ||
                    (starterMessage.mentions && starterMessage.mentions.users && starterMessage.mentions.users.has(message.author.id))
                )) || (message.channel.name && message.channel.name.toLowerCase().includes(message.author.username.toLowerCase()));

                if (isAuthor || hasAdmin(message.member) || hasManager(message.member)) {
                    await message.reply('🗑️ Deleting this thread...').catch(() => {});
                    if (starterMessage) await starterMessage.delete().catch(() => {});
                    return message.channel.delete().catch(() => {});
                } else {
                    return message.reply({ embeds: [errorEmbed('Only the creator of this post can delete the thread.')] }).catch(() => {});
                }
            } else {
                return message.reply({ embeds: [errorEmbed('This command can only be used in your own suggestion or fan art threads.')] }).catch(() => {});
            }
        }

        if (commandName) {
            const command = client.commands.get(commandName);
            if (command) {
                // Skip category checks for $cmd (which handles its own strict User ID check)
                if (commandName !== 'cmd') {
                    if (command.category === 'staff' && !hasAdmin(message.member)) {
                        return message.reply({ embeds: [errorEmbed('You do not have permission to use this command.')] });
                    }
                    if (command.category === 'manager' && !hasManager(message.member)) {
                        return message.reply({ embeds: [errorEmbed('Only bot managers can use this command.')] });
                    }
                }
                if (command.category === 'manager' && !hasManager(message.member)) {
                    return message.reply({ embeds: [errorEmbed('Only bot managers can use this command.')] });
                }

                try {
                    await command.execute(message, args, client);
                    const { checkAndTriggerDonationReminder } = require('../utils/donationReminder');
                    checkAndTriggerDonationReminder(message.channel).catch(() => {});
                } catch (error) {
                    console.error(`[CMD] Error in ${commandName}:`, error);
                    message.reply({ embeds: [errorEmbed(`An error occurred: ${error.message}`)] }).catch(() => {});
                }
                return; // Stop processing so AI doesn't trigger on prefix commands
            }
        }

        // ─── 5.6 Tickets Check: AI is completely disabled in all tickets ───
        const ticket = db.getTicketByChannel(message.channel.id);
        if (ticket) {
            return; // No AI inside any ticket channels
        }

        // ─── 6. AI Assistant (Verity) ───
        const handledByAI = await handleAIMessage(client, message);
        if (handledByAI) {
            const { checkAndTriggerDonationReminder } = require('../utils/donationReminder');
            checkAndTriggerDonationReminder(message.channel).catch(() => {});
            return;
        }
    },
};
