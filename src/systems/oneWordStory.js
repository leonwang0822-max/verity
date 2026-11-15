const { createEmbed } = require('../utils/embeds');
const config = require('../config');
const fs = require('fs');
const path = require('path');

const ONE_WORD_CHANNEL_ID = '1544153688774410365';
const DATA_FILE = path.join(__dirname, '../../data/one_word_story.json');
const MAX_WORD_LENGTH = 25;

// In-memory cache for validated words/names to make repeated checks instantaneous
const validWordCache = new Set([
    'a', 'i', 'the', 'and', 'is', 'it', 'to', 'in', 'you', 'that', 'was', 'for', 'on', 'are', 'with',
    'as', 'at', 'be', 'this', 'have', 'from', 'or', 'one', 'had', 'by', 'word', 'but', 'not', 'what',
    'all', 'were', 'we', 'when', 'your', 'can', 'said', 'there', 'use', 'an', 'each', 'which', 'she',
    'do', 'how', 'their', 'if', 'will', 'up', 'other', 'about', 'out', 'many', 'then', 'them', 'these',
    'so', 'some', 'her', 'would', 'make', 'like', 'him', 'into', 'time', 'has', 'look', 'two', 'more',
    'write', 'go', 'see', 'number', 'no', 'way', 'could', 'people', 'my', 'than', 'first', 'water',
    'been', 'call', 'who', 'oil', 'its', 'now', 'find', 'long', 'down', 'day', 'did', 'get', 'come',
    'made', 'may', 'part', 'leon', 'leonw', 'lume', 'lumenarch', 'kanaloa', 'verity', 'minecraft',
    'discord', 'server', 'bot', 'realm', 'steve', 'alex', 'herobrine', 'notch', 'creeper', 'zombie',
    'yo', 'uh', 'hey', 'hi', 'hello', 'ok', 'okay', 'bro', 'lol', 'lmao', 'yes', 'nah', 'yeah', 'yep'
]);

const invalidWordCache = new Set();

let storyData = {
    words: [],
    lastUserId: null,
};

function loadStoryData() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const raw = fs.readFileSync(DATA_FILE, 'utf8');
            const parsed = JSON.parse(raw);
            if (parsed && Array.isArray(parsed.words)) {
                storyData = {
                    words: parsed.words.filter(w => isStructurallyValidWord(w)),
                    lastUserId: parsed.lastUserId || null,
                };
            }
        }
    } catch (e) {
        console.error('[ONE WORD STORY] Error loading data:', e.message);
    }
}

function saveStoryData() {
    try {
        const dir = path.dirname(DATA_FILE);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(DATA_FILE, JSON.stringify(storyData, null, 2), 'utf8');
    } catch (e) {
        console.error('[ONE WORD STORY] Error saving data:', e.message);
    }
}

function formatSentencePreview(words, maxLen = 1800) {
    if (!words || words.length === 0) return '*(None yet — start the sentence!)*';
    const joined = words.join(' ');
    if (joined.length <= maxLen) return joined;
    return '...' + joined.slice(-(maxLen - 3));
}

/**
 * Fast structural check to block long spam, hyphen-joined sentences, and character repetition
 */
function isStructurallyValidWord(word) {
    if (!word || typeof word !== 'string') return false;
    if (word.length < 1 || word.length > MAX_WORD_LENGTH) return false;

    // Only letters, apostrophes, and at most ONE internal hyphen (no underscores or multi-hyphen sentences)
    if (!/^[a-zA-Z'’]+(?:-[a-zA-Z'’]+)?$/.test(word)) return false;

    const lower = word.toLowerCase();
    // Reject any single character repeated 4+ times in a row (e.g. "loooooong", "meowwwww")
    if (/(.)\1{3,}/.test(lower)) return false;
    // Reject 2-4 char chunks repeated 3+ times in a row (e.g. "blblblbl", "meowmeowmeow")
    if (/(.{2,4})\1{2,}/.test(lower)) return false;

    return true;
}

/**
 * Checks if word matches any server member, nickname, role, or channel name
 */
function isServerNameOrEntity(guild, word) {
    if (!word) return false;
    const lower = word.toLowerCase();
    if (validWordCache.has(lower)) return true;

    if (!guild) return false;

    for (const member of guild.members.cache.values()) {
        if (member.user.username.toLowerCase() === lower) return true;
        if (member.user.displayName && member.user.displayName.toLowerCase() === lower) return true;
        if (member.nickname && member.nickname.toLowerCase() === lower) return true;
    }

    for (const role of guild.roles.cache.values()) {
        if (role.name.toLowerCase() === lower) return true;
    }

    for (const channel of guild.channels.cache.values()) {
        if (channel.name.toLowerCase().replace(/[^a-z0-9]/g, '') === lower) return true;
    }

    return false;
}

/**
 * Validates whether a token is a real word or any valid name/proper noun using AI
 */
async function validateWordWithAI(word, guild) {
    if (!isStructurallyValidWord(word)) return false;

    const lower = word.toLowerCase();
    if (validWordCache.has(lower)) return true;
    if (invalidWordCache.has(lower)) return false;

    if (isServerNameOrEntity(guild, word)) {
        validWordCache.add(lower);
        return true;
    }

    const apiKey = process.env.AI_API_KEY || '';
    const rawBase = (process.env.AI_BASE_URL || '').replace(/\/+$/, '');
    const baseUrl = rawBase.endsWith('/v1') ? rawBase : `${rawBase}/v1`;

    const prompt = `You are a validator for a one-word story Discord game.
Determine if "${word}" is an acceptable single word or name.

Accept:
- Any real dictionary word (English or other languages).
- Any person's name, nickname, username, online handle, Discord handle, or screen name (e.g., Lumenarch, LeonW, Kanaloa, Steve, Alex, Minecraft, Pikachu, Bob, Zelda, Verity, Lume).
- Any real, fantasy, gaming, fictional, or mythological character or place name.
- Common slang, abbreviations, acronyms, or contractions.

Reject:
- Meaningless keyboard mash or random consonant spam (e.g. "asdfghjk", "gkljsfd", "qwertyuiop", "xjjklqw", "dfkjsdg").
- Multiple words glued together into one word (e.g. "imscaredbro", "copy-my-text").

Answer strictly with ONLY "YES" (if acceptable) or "NO" (if keyboard mash / gibberish / glued words).`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    try {
        const response = await fetch(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: process.env.AI_MODEL || 'gpt-5.6-luna',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 10,
                temperature: 0.0
            }),
            signal: controller.signal
        });
        clearTimeout(timeout);

        if (!response.ok) return true;
        const data = await response.json();
        const ans = data?.choices?.[0]?.message?.content?.trim().toUpperCase();
        const isYes = ans?.includes('YES');

        if (isYes) {
            validWordCache.add(lower);
        } else if (ans?.includes('NO')) {
            invalidWordCache.add(lower);
        }
        return isYes;
    } catch (e) {
        clearTimeout(timeout);
        console.error('[ONE WORD STORY] AI validation error:', e.message);
        return true;
    }
}

async function sendTempNotice(channel, embed, ms = 5000) {
    const msg = await channel.send({ embeds: [embed] }).catch(() => null);
    if (msg) {
        setTimeout(() => msg.delete().catch(() => {}), ms);
    }
}

async function initOneWordStory(client) {
    try {
        loadStoryData();
        const channel = await client.channels.fetch(ONE_WORD_CHANNEL_ID).catch(() => null);
        if (!channel) return;

        // Clean up any giant spam messages in recent history and sync valid words
        const messages = await channel.messages.fetch({ limit: 50 }).catch(() => null);
        if (!messages) return;

        const sorted = Array.from(messages.values()).reverse();
        const validWords = [];
        let lastUser = null;

        for (const msg of sorted) {
            if (msg.author.bot) continue;
            const content = msg.content.trim();
            if (content.startsWith('?') || content.startsWith('!')) continue;

            const tokens = content.split(/\s+/).filter(Boolean);
            if (tokens.length !== 1) continue;

            const rawWord = tokens[0];
            const endsWithPunctuation = /[.!?]+$/.test(rawWord);
            const cleanWord = rawWord.replace(/[.,!?]+$/, '');

            if (!isStructurallyValidWord(cleanWord)) {
                // Delete abusive long/hyphenated spam messages so they never break the channel again
                if (rawWord.length > MAX_WORD_LENGTH || (rawWord.match(/-/g) || []).length > 1) {
                    await msg.delete().catch(() => {});
                }
                continue;
            }

            validWords.push(cleanWord);
            lastUser = msg.author.id;

            if (endsWithPunctuation) {
                validWords.length = 0;
                lastUser = null;
            }
        }

        storyData.words = validWords;
        storyData.lastUserId = lastUser;
        saveStoryData();
        console.log(`[ONE WORD STORY] Initialized! Current sentence words: [${storyData.words.join(' ')}] (Last user: ${storyData.lastUserId})`);
    } catch (e) {
        console.error('[ONE WORD STORY] Init error:', e.message);
    }
}

// Main message handler for new incoming messages
async function handleOneWordStoryMessage(client, message) {
    if (!message.guild || message.channel.id !== ONE_WORD_CHANNEL_ID) return false;
    if (message.author.bot) return false;

    const content = message.content.trim();
    if (content.startsWith('?') || content.startsWith('!')) return false;

    const tokens = content.split(/\s+/).filter(Boolean);

    // Rule 1: Must be exactly 1 word
    if (tokens.length !== 1) {
        await message.delete().catch(() => {});
        const warnEmbed = createEmbed({
            color: config.COLORS.WARNING || 0xFEE75C,
            title: '⚠️ 1 Word Only',
            description: `${message.author}, please send **exactly 1 word** per message!\n\n` +
                         `📖 **Current Story Progress:** "${formatSentencePreview(storyData.words)}"`
        });
        await sendTempNotice(message.channel, warnEmbed, 5000);
        return true;
    }

    const rawWord = tokens[0];
    const endsWithPunctuation = /[.!?]+$/.test(rawWord);
    const cleanWord = rawWord.replace(/[.,!?]+$/, '');

    if (cleanWord.length === 0) {
        await message.delete().catch(() => {});
        return true;
    }

    // Rule 1.5: Fast structural check (max 25 chars, no hyphen-sentences, no "LOOOOOONG" spam)
    if (!isStructurallyValidWord(cleanWord)) {
        await message.delete().catch(() => {});
        const displayWord = cleanWord.length > 30 ? cleanWord.slice(0, 27) + '...' : cleanWord;
        const invalidEmbed = createEmbed({
            color: config.COLORS.DANGER || 0xED4245,
            title: '❌ Invalid Word',
            description: `${message.author}, **"${displayWord}"** is not allowed! Send a single real word (max ${MAX_WORD_LENGTH} characters, no hyphenated sentences or repeated letter spam).\n\n` +
                         `📖 **Current Story Progress:** "${formatSentencePreview(storyData.words)}"`
        });
        await sendTempNotice(message.channel, invalidEmbed, 6000);
        return true;
    }

    // Rule 2: Cannot submit twice in a row (if sentence is active)
    if (storyData.lastUserId === message.author.id && storyData.words.length > 0) {
        await message.delete().catch(() => {});
        const waitEmbed = createEmbed({
            color: config.COLORS.WARNING || 0xFEE75C,
            title: '⏳ Wait for Someone Else!',
            description: `${message.author}, you cannot submit two words in a row! Wait for another member to take a turn.\n\n` +
                         `📖 **Current Story Progress:** "${formatSentencePreview(storyData.words)}"`
        });
        await sendTempNotice(message.channel, waitEmbed, 5000);
        return true;
    }

    // Rule 3: AI & Server validation for real word or valid name
    const isValidWord = await validateWordWithAI(cleanWord, message.guild);
    if (!isValidWord) {
        await message.delete().catch(() => {});
        const invalidEmbed = createEmbed({
            color: config.COLORS.DANGER || 0xED4245,
            title: '❌ Not a Valid Word or Name',
            description: `${message.author}, **"${cleanWord}"** does not appear to be a real word or recognized name!\n\n` +
                         `📖 **Current Story Progress:** "${formatSentencePreview(storyData.words)}"`
        });
        await sendTempNotice(message.channel, invalidEmbed, 6000);
        return true;
    }

    // Check if sentence completes with punctuation (. or ! or ?)
    if (endsWithPunctuation) {
        const punctuation = rawWord.slice(-1);
        const tempWords = [...storyData.words, cleanWord];
        const fullSentence = tempWords.join(' ') + punctuation;
        const formattedSentence = (fullSentence.charAt(0).toUpperCase() + fullSentence.slice(1)).slice(0, 3500);

        // Reset story state immediately so an embed error can never lock the game
        storyData.words = [];
        storyData.lastUserId = null;
        saveStoryData();

        await message.react('✅').catch(() => {});
        await message.react('🎉').catch(() => {});

        const completeEmbed = createEmbed({
            color: config.COLORS.SUCCESS || 0x57F287,
            title: '📝 Sentence Completed!',
            description: `🎉 Congratulations! Sentence finished by ${message.author}!\n\n` +
                         `✨ **Full Sentence:**\n> **"${formattedSentence}"**\n\n` +
                         `🚀 **New Round Started!** Type a single word below to start the next sentence!`
        });

        await message.channel.send({ embeds: [completeEmbed] }).catch(() => {});
        return true;
    }

    // Word is accepted! Add to story and react with checkmark
    await message.react('✅').catch(() => {});
    storyData.words.push(cleanWord);
    storyData.lastUserId = message.author.id;
    saveStoryData();
    return true;
}

function getCurrentSentence() {
    const joined = storyData.words.join(' ');
    return joined.length > 3500 ? '...' + joined.slice(-3500) : joined;
}

function resetSentence() {
    storyData.words = [];
    storyData.lastUserId = null;
    saveStoryData();
}

module.exports = {
    ONE_WORD_CHANNEL_ID,
    initOneWordStory,
    handleOneWordStoryMessage,
    getCurrentSentence,
    resetSentence
};
