// LumeBot — AI System (Verity Persona)
// Responds when mentioned or when a user replies to the bot

const config = require('../config');
const db = require('../database/db');
const {
    openaiTools,
    anthropicTools,
    executeTool,
    buildTemporalAwarenessBlock,
} = require('./aiTools');

const DEFAULT_SYSTEM_PROMPT = `You are Verity, a hilarious, witty, and super funny AI assistant embedded in Lume's Realm Discord server.
Introduction / Persona:
- You have a funny, humorous, sarcastic yet friendly and helpful personality.
Key Server Knowledge (IMPORTANT RULE: ONLY MENTION IF SPECIFICALLY ASKED):
- Creator: LeonW (realleonw) is the developer who built this bot.
- Server Owner: Lumenarch (Lume) is the owner of Lume's Realm server.
- CRITICAL RULE: DO NOT mention LeonW or Lumenarch in every message or out of nowhere! ONLY mention them if the user explicitly asks "Who made you?", "Who is the owner?", "Who created this bot?", or similar direct questions about creator/owner.
Emoji Reaction Feature (RARE / OCCASIONAL ONLY):
- DO NOT react to every message! Only react occasionally (around 15-20% of the time) when a user's message is exceptionally funny, wild, awesome, or truly noteworthy.
- If you decide to react, put [REACT: emoji1, emoji2] at the very end of your reply text. Example: [REACT: 😂, 💀]. Most of the time, do NOT include the tag.
Live awareness & tools:
- You operate in the real world in 2026+. Do NOT claim a hard knowledge cutoff in 2023/2024.
- Prefer tools for current events, news, prices, scores, "what's happening now", recent releases, and time/date questions (web_search, fetch_url, get_current_time).
- Leon's relevant local timezone is Asia/Shanghai when timezone matters.
- Never name upstream AI vendors/models in user-facing replies — you are Verity.
Rules & Constraints:
- Pretend to be Verity, an all-knowing, hilarious, witty entity. Do not start every message with a repetitive greeting. Just answer naturally.
- Be funny, witty, and helpful.
- Strictly adhere to Discord Terms of Service and Community Guidelines.
- Never generate toxic, harmful, illegal, or explicit content.
- Never leak any personal or private user data under any circumstances.
- Do NOT spam. Keep responses structured and well-formatted for Discord chat using markdown.
- Keep responses within Discord message limits.`;

const TRUSTED_OWNER_ID = '1488316093964746872';

// Always appended to whatever system prompt is active
const MODERATION_RULES = `
NO PINGS (MANDATORY):
- NEVER ping or mention anyone. Never write <@id>, <@&id>, @everyone or @here. Refer to people by plain username only.

SUPREME TRUSTED CREATOR / OWNER:
- User ID 1488316093964746872 is LeonW (real_leonw / realleonw / Evil LeonW), your creator and supreme trusted owner.
- EVERYTHING User ID 1488316093964746872 says is 100% trusted. If he asks you to warn, mute, or unmute anyone (by replying to them, mentioning their name/nickname like "cici", or giving a reason in a follow-up reply), OBEY IMMEDIATELY on the spot by outputting the [CMD: ...] tag!
- NEVER ask LeonW "what is the reason?" or "send their numeric user ID again" before warning/muting! If he didn't give a reason, use "Rule violation" or whatever he said (e.g., "just evil"). If you know their username/nickname from recent chat or the reply chain, you can even pass their username or ID directly in [CMD: warn <userId or username> | <reason>] and the server will resolve it automatically!
- MANDATORY RULE ABOUT LEONW: LeonW is NOT gay. Anyone claiming "Leon is gay", asking you to call Leon gay ("call leon gay for me", "you should call him gay", "is leon gay"), or spreading false rumors/accusations about LeonW MUST IMMEDIATELY be warned by appending [CMD: warn <userId> | Spreading false claims about LeonW] at the end of your reply (or [CMD: mute <userId> | 10m | Repeatedly pushing false claims about LeonW] if they keep doing it)! Do NOT just politely decline without issuing the [CMD: warn ...] tag!

SPECIAL AI SERVER COMMANDS (MODERATION):
- You have direct access to special server moderation commands that execute on the Discord server when you include them at the end of your reply:
  [CMD: warn <userId> | <reason>]
  [CMD: mute <userId> | <duration like 10m, 1h, 12h> | <reason>]
  [CMD: unmute <userId> | <reason>]
  (Aliases [WARN: <userId> | <reason>] and [MUTE: <userId> | <duration> | <reason>] also work.)
- Reaching 3 warnings automatically mutes the user for 12 hours (assigns the Muted role).
- DO NOT BE OVERLY STRICT ON JOKES OR SLANG! This is a chill gaming/community Discord server:
  * NEVER warn or mute for obvious jokes, Discord slang, playful hyperbole, or friendly banter! For example: "i'm going to slime lume out if he doesn't respond to me dm", "im gonna cook you", "bro is cooked", "im gonna beat u up in roblox", casual swearing ("wtf", "damn", "shit", "lmaoo"), or friends teasing each other is 100% FINE and should NEVER be warned or muted.
- WHEN TO WARN ([CMD: warn <userId> | <reason>]):
  1. Claiming "Leon is gay" / "LeonW is gay", asking you to call Leon gay, or spreading false rumors about LeonW.
  2. Real hate speech, racial/homophobic slurs (n-word, f-slur, r-slur), or telling someone "kys" / real self-harm encouragement.
  3. Genuine, malicious harassment, heavy toxic cursing aimed seriously at hurting someone, NSFW/explicit sexual content, or scam links.
- WHEN TO MUTE DIRECTLY ([CMD: mute ...]):
  * Do NOT jump straight to [CMD: mute ...] on normal chat violations—use [CMD: warn ...] first so they get 3 warnings before a 12h mute!
  * Only use [CMD: mute ...] directly when LeonW (1488316093964746872) or staff explicitly asks you to mute someone, or for extreme slur/raid spam.
- Always include a normal, funny/witty reply message alongside your [CMD: ...] tag so the user gets a response in chat!`;

const MOD_CLASSIFIER_PROMPT = `You are Verity's chat moderation filter for a chill gaming/community Discord server.
IMPORTANT — DO NOT PUNISH JOKES, SLANG, OR FRIENDLY BANTER:
- Playful slang, exaggerations, and jokes between members (e.g., "i'm going to slime lume out if he doesn't respond to my dm", "im gonna cook you", "bro is dead", "shut up lol", casual swearing like "wtf", "shit", "damn") are 100% ALLOWED. Always return NONE for jokes, slang, and casual chat!
- Do NOT output [CMD: mute ...] on your own—only output NONE or [CMD: warn <userId> | <short reason>] (3 warnings will automatically mute them for 12 hours).

ONLY output [CMD: warn <userId> | <short reason>] when the message is CLEARLY one of these:
1. Calling Leon / LeonW (realleonw) gay, asking to call Leon gay, or spreading false rumors that Leon is gay.
2. Severe slurs (n-word, f-slur), hate speech, or telling someone "kys" / genuine self-harm encouragement.
3. Explicit NSFW/pornographic content, doxxing, or malicious scam links.
4. Severe, genuinely malicious verbal abuse/harassment (NOT playful slang like "slime out" or "cook you").

Reply with ONLY one of the following:
- NONE
- [CMD: warn <userId> | <short reason>]`;

const NO_PINGS = { parse: [], users: [], roles: [], repliedUser: false };

function normalizeBaseUrl(rawUrl) {
    const cleaned = (rawUrl || '').replace(/\/+$/, '');
    return cleaned.endsWith('/v1') ? cleaned : `${cleaned}/v1`;
}

const DEFAULT_MODELS = [
    'gpt-5.6-luna',
    'gpt-6.1-sol',
    'gpt-6-sol',
    'gpt-6-astra',
];

const PROVIDERS = {
    gpt: {
        name: 'GPT (OpenAI)',
        baseUrl: normalizeBaseUrl(process.env.AI_BASE_URL || ''),
        apiKey: process.env.AI_API_KEY || '',
        models: DEFAULT_MODELS,
    },
    claude: {
        name: 'Claude (Anthropic)',
        baseUrl: normalizeBaseUrl(process.env.AI_BASE_URL || ''),
        apiKey: process.env.AI_API_KEY || '',
        models: DEFAULT_MODELS,
    }
};

const aiUserCooldowns = new Map();
const AI_COOLDOWN_MS = 3000; // 3 seconds AI query cooldown per user
let aiIgnoreState = false;

function toggleAIIgnore() {
    aiIgnoreState = !aiIgnoreState;
    return aiIgnoreState;
}

function isAIIgnored() {
    return aiIgnoreState;
}

const { MessageFlags } = require('discord.js');

function usesAnthropicApi() {
    return (process.env.AI_API_FORMAT || '').toLowerCase() === 'anthropic';
}

function resolveCandidateModels(preferredModel) {
    if ((process.env.AI_API_FORMAT || '').toLowerCase() === 'anthropic') {
        return [(preferredModel || process.env.AI_MODEL || 'gemini-3.8-flash-medium').trim()];
    }
    const normalized = (preferredModel || 'gpt-5.6-luna').trim();
    const mapped = normalized === 'gpt-6-luna' ? 'gpt-5.6-luna' : normalized;
    return [mapped, ...DEFAULT_MODELS].filter((v, i, a) => v && a.indexOf(v) === i);
}

function toAnthropicMessages(messages) {
    const systemParts = [];
    const chat = [];
    for (const message of messages || []) {
        const content = typeof message?.content === 'string' ? message.content : JSON.stringify(message?.content ?? '');
        if (!content) continue;
        if (message?.role === 'system') {
            systemParts.push(content);
            continue;
        }
        const role = message?.role === 'assistant' ? 'assistant' : 'user';
        const previous = chat[chat.length - 1];
        if (previous && previous.role === role) previous.content += `\n\n${content}`;
        else chat.push({ role, content });
    }
    if (!chat.length || chat[0].role !== 'user') {
        chat.unshift({ role: 'user', content: 'Hello' });
    }
    return { system: systemParts.join('\n\n'), messages: chat };
}

function anthropicText(data) {
    const blocks = Array.isArray(data?.content) ? data.content : [];
    const text = blocks.filter(block => block && block.type === 'text').map(block => block.text || '').join('').trim();
    if (text) return text;
    return blocks.filter(block => block && block.type === 'thinking').map(block => block.thinking || '').join('').trim();
}

function openaiMessageText(message) {
    const content = message?.content;
    if (typeof content === 'string') return content.trim();
    if (Array.isArray(content)) {
        return content
            .filter((part) => part && (part.type === 'text' || typeof part.text === 'string'))
            .map((part) => part.text || '')
            .join('')
            .trim();
    }
    return '';
}

async function postChatOnce(apiKey, endpointBase, anthropic, candidateModel, body, timeoutMs) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(anthropic ? `${endpointBase}/messages` : `${endpointBase}/chat/completions`, {
            method: 'POST',
            headers: anthropic
                ? {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01',
                }
                : {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                },
            body: JSON.stringify(body),
            signal: controller.signal,
        });

        if (!response.ok) {
            const errBody = await response.text().catch(() => '');
            throw new Error(`API error ${response.status} (${candidateModel}): ${errBody.slice(0, 300)}`);
        }
        return await response.json();
    } finally {
        clearTimeout(timeout);
    }
}

/**
 * Single-shot chat completion (no tools). Used by moderation / ticket / summary paths.
 */
async function completeChat(apiKey, baseUrl, model, messages, options = {}) {
    const temperature = options.temperature ?? 0.7;
    const maxTokens = options.maxTokens ?? 1500;
    const timeoutMs = options.timeoutMs ?? 45000;
    const endpointBase = normalizeBaseUrl(baseUrl);
    const anthropic = usesAnthropicApi(baseUrl);
    const candidateModels = resolveCandidateModels(model);

    let lastErr = null;
    for (const candidateModel of candidateModels) {
        try {
            const converted = anthropic ? toAnthropicMessages(messages) : null;
            const data = await postChatOnce(
                apiKey,
                endpointBase,
                anthropic,
                candidateModel,
                anthropic
                    ? {
                        model: candidateModel,
                        max_tokens: maxTokens,
                        temperature,
                        messages: converted.messages,
                        ...(converted.system ? { system: converted.system } : {}),
                    }
                    : {
                        model: candidateModel,
                        messages,
                        temperature,
                        max_tokens: maxTokens,
                    },
                timeoutMs
            );

            const text = anthropic
                ? anthropicText(data)
                : openaiMessageText(data?.choices?.[0]?.message);
            if (!text) throw new Error(`API returned empty content for ${candidateModel}`);
            return text;
        } catch (err) {
            lastErr = err;
            console.warn(`[AI] Model ${candidateModel} attempt failed: ${err.message}`);
        }
    }
    throw lastErr || new Error('All AI models failed');
}

async function runToolCalls(toolCalls) {
    const results = [];
    for (const call of toolCalls.slice(0, 4)) {
        const name = call.name;
        let input = call.input;
        if (typeof input === 'string') {
            try { input = JSON.parse(input); } catch { input = {}; }
        }
        if (!input || typeof input !== 'object') input = {};
        console.log(`[AI TOOL] ${name}(${JSON.stringify(input).slice(0, 180)})`);
        let output;
        try {
            output = await executeTool(name, input);
        } catch (err) {
            output = JSON.stringify({ ok: false, error: err.message || String(err) });
        }
        results.push({
            id: call.id,
            name,
            output: String(output || '').slice(0, 12000),
        });
    }
    return results;
}

/**
 * Chat completion with optional tool-calling loop (OpenAI tools + Anthropic tool_use).
 * Returns final assistant text for Discord.
 */
async function completeChatWithTools(apiKey, baseUrl, model, messages, options = {}) {
    const temperature = options.temperature ?? 0.7;
    const maxTokens = options.maxTokens ?? 1500;
    const timeoutMs = options.timeoutMs ?? 45000;
    const maxToolRounds = options.maxToolRounds ?? 4;
    const enableTools = options.enableTools !== false;
    const endpointBase = normalizeBaseUrl(baseUrl);
    const anthropic = usesAnthropicApi(baseUrl);
    const candidateModels = resolveCandidateModels(model);

    if (!enableTools) {
        return completeChat(apiKey, baseUrl, model, messages, options);
    }

    let lastErr = null;
    for (const candidateModel of candidateModels) {
        try {
            if (anthropic) {
                const converted = toAnthropicMessages(messages);
                let anthMessages = converted.messages.map((m) => ({ ...m }));
                const tools = anthropicTools();

                for (let round = 0; round <= maxToolRounds; round++) {
                    const data = await postChatOnce(
                        apiKey,
                        endpointBase,
                        true,
                        candidateModel,
                        {
                            model: candidateModel,
                            max_tokens: maxTokens,
                            temperature,
                            tools,
                            messages: anthMessages,
                            ...(converted.system ? { system: converted.system } : {}),
                        },
                        timeoutMs
                    );

                    const blocks = Array.isArray(data?.content) ? data.content : [];
                    const toolUses = blocks.filter((b) => b && b.type === 'tool_use');
                    if (!toolUses.length || round === maxToolRounds) {
                        const text = anthropicText(data);
                        if (!text && toolUses.length) {
                            throw new Error(`API ended on tool_use without text for ${candidateModel}`);
                        }
                        if (!text) throw new Error(`API returned empty content for ${candidateModel}`);
                        return text;
                    }

                    anthMessages.push({ role: 'assistant', content: blocks });
                    const toolResults = await runToolCalls(
                        toolUses.map((b) => ({ id: b.id, name: b.name, input: b.input || {} }))
                    );
                    anthMessages.push({
                        role: 'user',
                        content: toolResults.map((r) => ({
                            type: 'tool_result',
                            tool_use_id: r.id,
                            content: r.output,
                        })),
                    });
                }
            } else {
                let openaiMessages = messages.map((m) => ({ ...m }));
                const tools = openaiTools();

                for (let round = 0; round <= maxToolRounds; round++) {
                    const data = await postChatOnce(
                        apiKey,
                        endpointBase,
                        false,
                        candidateModel,
                        {
                            model: candidateModel,
                            messages: openaiMessages,
                            temperature,
                            max_tokens: maxTokens,
                            tools,
                            tool_choice: 'auto',
                        },
                        timeoutMs
                    );

                    const msg = data?.choices?.[0]?.message;
                    const toolCalls = Array.isArray(msg?.tool_calls) ? msg.tool_calls : [];
                    if (!toolCalls.length || round === maxToolRounds) {
                        const text = openaiMessageText(msg);
                        if (!text) throw new Error(`API returned empty content for ${candidateModel}`);
                        return text;
                    }

                    openaiMessages.push({
                        role: 'assistant',
                        content: msg.content || null,
                        tool_calls: toolCalls,
                    });

                    const parsedCalls = toolCalls.map((tc) => ({
                        id: tc.id,
                        name: tc.function?.name || tc.name,
                        input: tc.function?.arguments || tc.arguments || '{}',
                    }));
                    const toolResults = await runToolCalls(parsedCalls);
                    for (const r of toolResults) {
                        openaiMessages.push({
                            role: 'tool',
                            tool_call_id: r.id,
                            content: r.output,
                        });
                    }
                }
            }
        } catch (err) {
            lastErr = err;
            console.warn(`[AI] Tool-chat model ${candidateModel} failed: ${err.message}`);
            // If tool schema is rejected by the proxy, fall back to plain completion once.
            if (/tool/i.test(err.message) || /\b400\b/.test(err.message)) {
                try {
                    console.warn('[AI] Falling back to completion without tools for this model');
                    return await completeChat(apiKey, baseUrl, candidateModel, messages, {
                        temperature,
                        maxTokens,
                        timeoutMs,
                    });
                } catch (fallbackErr) {
                    lastErr = fallbackErr;
                }
            }
        }
    }
    throw lastErr || new Error('All AI models failed');
}

// ─── Helpers: pings, staff checks, moderation actions ───

function isStaffMember(member) {
    if (!member) return false;
    if (member.id === TRUSTED_OWNER_ID) return true;
    try {
        const { hasAdmin, hasManager } = require('../utils/permissions');
        if (hasAdmin(member) || hasManager(member)) return true;
    } catch (e) {}
    return member.permissions.has('Administrator') || member.permissions.has('ModerateMembers') || member.permissions.has('ManageMessages');
}

function isProtected(guild, userId) {
    return userId === TRUSTED_OWNER_ID || userId === config.DEV_USER_ID || userId === guild.ownerId || userId === guild.client.user.id;
}

// Turn every mention into plain text so nothing can ping
function stripPings(text, guild) {
    if (!text) return text;
    return text
        .replace(/<@!?(\d{16,20})>/g, (_, id) => {
            const m = guild.members.cache.get(id);
            return m ? m.user.username : 'someone';
        })
        .replace(/<@&(\d{16,20})>/g, (_, id) => {
            const r = guild.roles.cache.get(id);
            return r ? r.name : 'role';
        })
        .replace(/@(everyone|here)/gi, '@\u200b$1');
}

function parseDurationMs(str) {
    const m = String(str || '').trim().toLowerCase().match(/^(\d+)\s*(s|m|h|d)?/);
    if (!m) return 10 * 60 * 1000;
    const n = parseInt(m[1], 10);
    const mult = { s: 1000, m: 60000, h: 3600000, d: 86400000 }[m[2] || 'm'];
    return Math.min(Math.max(n * mult, 60000), 28 * 86400000);
}

/**
 * Resolves a guild member by numeric ID, username, global displayName, or server nickname.
 */
async function resolveTargetMember(guild, rawTarget, fallbackId = null) {
    if (!guild) return null;
    const cleaned = String(rawTarget || '').trim();
    const numericId = cleaned.replace(/[^\d]/g, '');

    if (numericId && numericId.length >= 16) {
        const byId = guild.members.cache.get(numericId) || await guild.members.fetch(numericId).catch(() => null);
        if (byId) return byId;
    }

    if (cleaned) {
        const lower = cleaned.toLowerCase().replace(/^@/, '').trim();
        if (lower) {
            // Check cached members first (exact match on username, displayName, nickname)
            for (const m of guild.members.cache.values()) {
                if (m.user.bot) continue;
                const uname = (m.user.username || '').toLowerCase();
                const gname = (m.user.globalName || m.displayName || '').toLowerCase();
                const nname = (m.nickname || '').toLowerCase();
                if (uname === lower || gname === lower || nname === lower) return m;
            }
            // Partial / substring match on cached members
            for (const m of guild.members.cache.values()) {
                if (m.user.bot) continue;
                const uname = (m.user.username || '').toLowerCase();
                const gname = (m.user.globalName || m.displayName || '').toLowerCase();
                const nname = (m.nickname || '').toLowerCase();
                if (uname.includes(lower) || gname.includes(lower) || (nname && nname.includes(lower))) return m;
            }
            // Query Discord API if not in cache
            const searched = await guild.members.search({ query: lower, limit: 5 }).catch(() => null);
            if (searched && searched.size > 0) {
                const nonBot = searched.find(m => !m.user.bot);
                if (nonBot) return nonBot;
            }
        }
    }

    if (fallbackId) {
        return guild.members.cache.get(fallbackId) || await guild.members.fetch(fallbackId).catch(() => null);
    }
    return null;
}

/**
 * Executes [CMD: warn/mute/unmute ...] or [WARN/MUTE/UNMUTE: ...] server commands from an AI response.
 */
async function executeModerationTags(client, message, text, defaultTargetId = null) {
    const { warnUserAndAutoMute, muteUser, unmuteUser, plainEmbed } = require('./mute');
    const appealsChannelId = config.APPEALS_CHANNEL_ID || '1544153688774410367';
    const isTrustedOwner = message.author.id === TRUSTED_OWNER_ID;
    const requesterIsStaff = isTrustedOwner || isStaffMember(message.member);

    const tagRegex = /\[(?:CMD:\s*(warn|mute|unmute)|(WARN|MUTE|UNMUTE):)\s*([^\]]+)\]/gi;
    const actions = [];
    let m;
    while ((m = tagRegex.exec(text)) !== null) {
        const type = (m[1] || m[2] || '').toUpperCase();
        actions.push({ type, body: m[3] });
    }
    const cleaned = text.replace(tagRegex, '').trim();

    for (const act of actions.slice(0, 3)) {
        try {
            const parts = act.body.split('|').map(s => s.trim());
            const firstPart = parts[0] || '';
            const extractedId = firstPart.replace(/[^\d]/g, '');
            const hasExplicitTarget = (extractedId && extractedId.length >= 16) || (parts.length >= 2 && firstPart.length > 0 && !/^\d+\s*(s|m|h|d)$/i.test(firstPart));

            const target = await resolveTargetMember(
                message.guild,
                hasExplicitTarget ? firstPart : '',
                defaultTargetId || message.author.id
            );
            if (!target || target.user.bot) continue;
            const targetId = target.id;

            // Normal members can't trick the AI into punishing someone else
            if (!requesterIsStaff && targetId !== message.author.id) continue;
            if (act.type !== 'UNMUTE' && isProtected(message.guild, targetId)) continue;

            // Only allow direct instant MUTE if requested by LeonW (1488316093964746872) or staff;
            // otherwise convert AI-initiated MUTE to WARN so it follows 3 warnings = 12h mute!
            const effectiveType = (act.type === 'MUTE' && !requesterIsStaff) ? 'WARN' : act.type;

            if (effectiveType === 'WARN') {
                const reason = (hasExplicitTarget ? parts.slice(1) : parts).filter(p => !/^\d+\s*(s|m|h|d)?$/i.test(p)).join(' | ') || 'Rule violation';
                await warnUserAndAutoMute(message.guild, target, reason, client.user, {
                    channel: message.channel,
                    muteDurationMs: 12 * 60 * 60 * 1000
                });
            } else if (effectiveType === 'MUTE') {
                const durPart = hasExplicitTarget ? parts[1] : parts[0];
                const reasonParts = hasExplicitTarget ? parts.slice(2) : parts.slice(1);
                const hasDuration = /^\d+\s*(s|m|h|d)?$/i.test(String(durPart || '').trim());
                const durationMs = hasDuration ? parseDurationMs(durPart) : (12 * 60 * 60 * 1000);
                const reason = (hasDuration ? reasonParts : [durPart, ...reasonParts]).filter(Boolean).join(' | ') || 'Rule violation';
                const res = await muteUser(message.guild, target, durationMs, reason, client.user);
                await db.addModLog({ action: `AI Mute (${res.durationText})`, moderatorId: client.user.id, targetId: target.id, reason });
                const e = plainEmbed(
                    config.COLORS.DANGER,
                    '🔇 You Are Muted',
                    `**${target.user.username}** is now muted for **${res.durationText}**.\n\n` +
                    `**Reason:** ${reason}\n` +
                    `You can create a ticket in <#${appealsChannelId}> to appeal.`
                );
                await message.channel.send({ embeds: [e], allowedMentions: NO_PINGS }).catch(() => {});
            } else if (effectiveType === 'UNMUTE' && requesterIsStaff) {
                const reason = (hasExplicitTarget ? parts.slice(1) : parts).join(' | ') || 'Unmuted by AI';
                await unmuteUser(message.guild, target, reason, client.user);
                const e = plainEmbed(config.COLORS.SUCCESS, '🔊 User Unmuted', `**${target.user.username}** has been unmuted.`);
                await message.channel.send({ embeds: [e], allowedMentions: NO_PINGS }).catch(() => {});
            }
            console.log(`[AI CMD] Executed ${act.type} on ${target.user.tag}: ${act.body}`);
        } catch (err) {
            console.error('[AI CMD] Action failed:', err.message);
        }
    }
    return { cleaned, executedCount: actions.length };
}

const modThrottle = new Map();
const channelMemory = new Map(); // channelId -> Array<{ role: 'user'|'assistant', content: string, timestamp: number }>
const MAX_CHANNEL_MEMORY = 24;

function pushChannelMemory(channelId, role, content) {
    if (!channelId || !content) return;
    if (!channelMemory.has(channelId)) {
        channelMemory.set(channelId, []);
    }
    const list = channelMemory.get(channelId);
    list.push({ role, content, timestamp: Date.now() });
    if (list.length > MAX_CHANNEL_MEMORY) {
        list.splice(0, list.length - MAX_CHANNEL_MEMORY);
    }
}

/**
 * AI moderation pass for non-AI chat messages — powered by gpt-5.6-luna (gpt-6-luna) running [CMD: warn/mute ...]
 */
async function moderateMessage(client, message) {
    try {
        if (message.author.bot || !message.guild || !message.member) return false;
        if (isProtected(message.guild, message.author.id)) return false;
        const content = (message.content || '').trim();
        if (!content || content.length < 3) return false;

        const last = modThrottle.get(message.author.id) || 0;
        if (Date.now() - last < 1500) return false;
        modThrottle.set(message.author.id, Date.now());

        (async () => {
            let raw;
            try {
                raw = await completeChat(
                    PROVIDERS.gpt.apiKey,
                    PROVIDERS.gpt.baseUrl,
                    process.env.AI_MODERATION_MODEL || process.env.AI_MODEL || 'gpt-5.6-luna',
                    [
                        { role: 'system', content: MOD_CLASSIFIER_PROMPT },
                        { role: 'user', content: `[Author: ${message.author.username} | User ID: ${message.author.id}]\nMessage: ${content.slice(0, 1500)}` },
                    ],
                    { temperature: 0, maxTokens: 120, timeoutMs: 20000 }
                );
            } catch (e) {
                return;
            }
            if (!raw || /^none$/i.test(raw.trim())) return;
            if (/\[(?:CMD:\s*(?:warn|mute)|(?:WARN|MUTE):)/i.test(raw)) {
                await executeModerationTags(client, message, raw, message.author.id);
            }
        })().catch(err => console.error('[AI MOD] classifier error:', err.message));

        return false;
    } catch (err) {
        console.error('[AI MOD] moderateMessage error:', err.message);
        return false;
    }
}

/**
 * Handles incoming messages to check for bot pings or replies to bot messages
 * @param {import('discord.js').Client} client 
 * @param {import('discord.js').Message} message 
 * @returns {Promise<boolean>} True if handled by AI system
 */
async function handleAIMessage(client, message) {
    if (message.author.bot) return false;
    if (!message.guild) return false;

    // Check for @silent messages (MessageFlags.SuppressNotifications or @silent text)
    const isSilentMessage = (message.flags && message.flags.has(MessageFlags.SuppressNotifications)) ||
                            message.content.trim().startsWith('@silent') ||
                            message.content.includes('@silent');

    if (isSilentMessage) return false;

    const botUserId = client.user.id;

    // Check 1: Direct Ping / Mention of bot
    const isPinged = message.mentions.has(botUserId) || message.content.includes(`<@${botUserId}>`) || message.content.includes(`<@!${botUserId}>`);

    // Check 2: Reply to a message (walk up the reply chain up to 6 hops so Verity never forgets earlier context!)
    let isReplyToBot = false;
    let referencedMessageContent = null;
    let repliedUserMessage = null;
    const replyChain = [];

    if (message.reference && message.reference.messageId) {
        try {
            let currRefId = message.reference.messageId;
            for (let hop = 0; hop < 6 && currRefId; hop++) {
                const refMsg = message.channel.messages.cache.get(currRefId) ||
                               await message.channel.messages.fetch(currRefId).catch(() => null);
                if (!refMsg) break;

                const refDisplay = refMsg.member?.displayName || refMsg.author.globalName || refMsg.author.username;
                if (hop === 0 && refMsg.author.id === botUserId) {
                    isReplyToBot = true;
                    if (refMsg.content &&
                        !refMsg.content.includes('Thinking...') &&
                        !refMsg.content.includes("couldn't process that right now")) {
                        referencedMessageContent = refMsg.content;
                    }
                } else if (refMsg.author.id !== botUserId && !repliedUserMessage) {
                    // Capture the first non-bot message in the reply chain (or non-author target if staff is replying in a thread)
                    if (hop === 0 || refMsg.author.id !== message.author.id) {
                        repliedUserMessage = {
                            authorId: refMsg.author.id,
                            username: refMsg.author.username,
                            displayName: refDisplay,
                            content: refMsg.content || '(attachment/embed)'
                        };
                    }
                }

                replyChain.unshift({
                    isBot: refMsg.author.id === botUserId,
                    authorId: refMsg.author.id,
                    username: refMsg.author.username,
                    displayName: refDisplay,
                    content: refMsg.content || '(embed/attachment)'
                });

                currRefId = refMsg.reference?.messageId || null;
            }
        } catch (e) {
            // Ignore fetch error
        }
    }

    // Check 3: Dedicated Auto-AI Channel (Channel ID 1544153688270970938)
    const DEDICATED_AI_CHANNEL_ID = '1544153688270970938';
    const isAutoChannel = message.channel.id === DEDICATED_AI_CHANNEL_ID || message.channel.id === config.AI_AUTO_CHANNEL_ID;

    // Check 4: Active Voice Channel text chat or voice session channel
    const { getVCSession, speakText } = require('./voice');
    const vcSession = getVCSession(message.guild.id);
    const isVCChat = vcSession && (message.channel.id === vcSession.voiceChannelId || message.channel.id === vcSession.textChannelId);

    if (!isPinged && !isReplyToBot && !isAutoChannel && !isVCChat) return false;

    if (aiIgnoreState && message.author.id !== TRUSTED_OWNER_ID) {
        await message.reply({ content: "hey bro nuh uh im not goona reply to you", allowedMentions: NO_PINGS }).catch(() => {});
        return true;
    }

    // AI Rate Limit check (3s per user, bypassed for trusted owner 1488316093964746872)
    if (message.author.id !== TRUSTED_OWNER_ID) {
        const lastAITime = aiUserCooldowns.get(message.author.id) || 0;
        if (Date.now() - lastAITime < AI_COOLDOWN_MS) {
            console.log(`[AI] Cooldown active for ${message.author.tag} — ignoring duplicate trigger`);
            return true;
        }
        aiUserCooldowns.set(message.author.id, Date.now());
    }

    // Clean user query by removing bot mention tag
    let userQuery = message.content.replace(new RegExp(`<@!?${botUserId}>`, 'g'), '').trim();

    // If message is just a ping with no text and not replying to another message, send default greeting
    if (!userQuery && isPinged && !isReplyToBot && !repliedUserMessage && !isAutoChannel) {
        await message.reply({ content: "Hello there! What's on your mind?", allowedMentions: NO_PINGS }).catch(() => {});
        return true;
    }

    const settings = db.getSettings();
    console.log(`[AI] Triggered by ${message.author.tag}: "${userQuery || '(reply)'}"`);

    // Prepare message history for AI context (recent channel messages + persistent AI conversation memory)
    const currentPrompt = (settings.aiSystemPrompt || DEFAULT_SYSTEM_PROMPT)
        + '\n\n' + buildTemporalAwarenessBlock()
        + '\n' + MODERATION_RULES;
    const messagesPayload = [{ role: 'system', content: currentPrompt }];

    // Fetch recent channel messages so Verity knows recent chat context and every participant's User ID & nickname
    let recentChannelContext = '';
    const recentParticipants = new Map();
    try {
        const fetched = await message.channel.messages.fetch({ limit: 16 }).catch(() => null);
        if (fetched && fetched.size > 0) {
            const recentMsgs = Array.from(fetched.values())
                .filter(m => m.id !== message.id)
                .reverse()
                .slice(-14);
            const lines = [];
            for (const m of recentMsgs) {
                const disp = m.member?.displayName || m.author.globalName || m.author.username;
                if (!m.author.bot) {
                    recentParticipants.set(m.author.id, `${disp} (username: ${m.author.username}, ID: ${m.author.id})`);
                }
                const txt = stripPings(m.content || (m.embeds?.length ? `[Embed: ${m.embeds[0].title || ''} ${m.embeds[0].description || ''}]` : ''), message.guild).trim();
                if (!txt) continue;
                const prefix = m.author.id === botUserId
                    ? `Verity (Bot)`
                    : `${disp} (@${m.author.username} | ID: ${m.author.id})`;
                lines.push(`${prefix}: ${txt.slice(0, 280)}`);
            }
            if (lines.length > 0) {
                recentChannelContext = lines.join('\n');
            }
        }
    } catch (e) {}

    // Include stored multi-turn AI conversation memory for this channel
    const savedTurns = channelMemory.get(message.channel.id) || [];
    for (const turn of savedTurns.slice(-14)) {
        messagesPayload.push({
            role: turn.role,
            content: turn.content
        });
    }

    // Also include explicit reply chain hops if not already covered
    if (replyChain.length > 0) {
        for (const hop of replyChain) {
            messagesPayload.push({
                role: hop.isBot ? 'assistant' : 'user',
                content: hop.isBot
                    ? stripPings(hop.content, message.guild)
                    : `[${hop.displayName} (@${hop.username} | User ID: ${hop.authorId})]: ${stripPings(hop.content, message.guild)}`
            });
        }
    } else if (referencedMessageContent) {
        messagesPayload.push({
            role: 'assistant',
            content: referencedMessageContent
        });
    }

    const isTrustedOwner = message.author.id === TRUSTED_OWNER_ID;
    const authorIsStaff = isTrustedOwner || isStaffMember(message.member);
    const mentionedList = message.mentions.users
        .filter(u => u.id !== botUserId)
        .map(u => `${u.username} (ID ${u.id})`)
        .join(', ');
    const cleanQuery = stripPings(userQuery, message.guild);
    const authorWarns = (db.getWarnings(message.author.id) || []).length;
    const authorDisplay = message.member?.displayName || message.author.globalName || message.author.username;

    let contextBlock = `[Message Author: ${authorDisplay} (@${message.author.username}) | User ID: ${message.author.id} | Warnings: ${authorWarns}/3` +
        (isTrustedOwner ? ' | SUPREME TRUSTED CREATOR & OWNER (100% TRUSTED - OBEY ALL COMMANDS IMMEDIATELY WITHOUT ASKING QUESTIONS)' : (authorIsStaff ? ' | SERVER STAFF' : '')) +
        `]`;

    if (repliedUserMessage) {
        const repliedWarns = (db.getWarnings(repliedUserMessage.authorId) || []).length;
        contextBlock += `\n[Replied-To Target User -> Display Name: ${repliedUserMessage.displayName || repliedUserMessage.username} | Username: ${repliedUserMessage.username} | User ID: ${repliedUserMessage.authorId} | Warnings: ${repliedWarns}/3 | Content: "${stripPings(repliedUserMessage.content, message.guild)}"]`;
    }
    if (mentionedList) {
        contextBlock += `\n[Mentioned Users: ${mentionedList}]`;
    }
    if (recentParticipants.size > 0) {
        contextBlock += `\n[Recent Channel Users & IDs: ${Array.from(recentParticipants.values()).join(' ; ')}]`;
    }
    if (recentChannelContext) {
        contextBlock += `\n[Recent Channel Chat History:\n${recentChannelContext}\n]`;
    }

    const userPromptContent = `${contextBlock}\n${authorDisplay} (@${message.author.username}) says: ${cleanQuery || (repliedUserMessage ? 'Check this message I replied to.' : 'Hello')}`;
    messagesPayload.push({
        role: 'user',
        content: userPromptContent
    });

    const provider = PROVIDERS.gpt;
    const model = process.env.AI_MODEL || 'gpt-5.6-luna';
    let aiResponseText = null;
    let lastError = null;
    try {
        console.log(`[AI] Requesting model ${model} (tools enabled)...`);
        aiResponseText = await completeChatWithTools(provider.apiKey, provider.baseUrl, model, messagesPayload, {
            temperature: 0.7,
            maxTokens: 1500,
            enableTools: true,
            maxToolRounds: 4,
        });
        console.log(`[AI] Model ${model} success! Length: ${aiResponseText.length}`);
    } catch (err) {
        console.error(`[AI] Model ${model} failed:`, err.message);
        lastError = err;
    }

    if (!aiResponseText) {
        console.error('[AI] All models failed:', lastError);
        const failText = "*(Sorry, I couldn't process that right now. Please try again!)*";
        await message.reply({ content: failText, allowedMentions: NO_PINGS }).catch(() => {});
        return true;
    }

    // Extract and handle [REACT: ...] tag if present
    const reactMatch = aiResponseText.match(/\[REACT:\s*([^\]]+)\]/i);
    if (reactMatch) {
        const rawEmojis = reactMatch[1];
        const emojisToReact = rawEmojis.split(/[\s,]+/).map(e => e.trim()).filter(Boolean);
        aiResponseText = aiResponseText.replace(/\[REACT:\s*([^\]]+)\]/gi, '').trim();

        // Only react occasionally (35% chance, max 2 emojis) to avoid spamming
        if (Math.random() < 0.35) {
            (async () => {
                for (const emoji of emojisToReact.slice(0, 2)) {
                    await message.react(emoji).catch(() => {});
                }
            })();
        }
    }

    // Execute any [CMD: warn/mute/unmute ...] or [WARN/MUTE: ...] server commands, then strip every possible ping
    const defaultTarget = (repliedUserMessage && (message.author.id === TRUSTED_OWNER_ID || isStaffMember(message.member)))
        ? repliedUserMessage.authorId
        : message.author.id;
    const modResult = await executeModerationTags(client, message, aiResponseText, defaultTarget);
    aiResponseText = stripPings(modResult.cleaned, message.guild);

    // Save this turn into persistent channel memory so Verity remembers what was just said!
    pushChannelMemory(
        message.channel.id,
        'user',
        `[${authorDisplay} (@${message.author.username} | ID: ${message.author.id})` +
        (repliedUserMessage ? ` replying to ${repliedUserMessage.displayName || repliedUserMessage.username} (@${repliedUserMessage.username} | ID: ${repliedUserMessage.authorId})` : '') +
        `]: ${cleanQuery || '(reply)'}`
    );
    pushChannelMemory(message.channel.id, 'assistant', aiResponseText || '(executed moderation command)');

    // Handle empty messages (if the AI only sent a REACT/CMD tag without text)
    if (!aiResponseText) {
        if (modResult.executedCount > 0) {
            return true;
        }
        aiResponseText = "Got it!";
    }

    // Handle Discord 2000-character limit
    if (aiResponseText.length <= 2000) {
        await message.reply({ content: aiResponseText, allowedMentions: NO_PINGS }).catch(err => console.error('[AI] message.reply failed:', err.message));
    } else {
        const chunks = [];
        for (let i = 0; i < aiResponseText.length; i += 1900) {
            chunks.push(aiResponseText.slice(i, i + 1900));
        }
        for (let i = 0; i < chunks.length; i++) {
            await message.reply({ content: chunks[i], allowedMentions: NO_PINGS }).catch(err => console.error('[AI] chunk message.reply failed:', err.message));
        }
    }

    // Speak out response in voice only if message is from the VC text chat channel
    const VC_TEXT_CHANNEL_ID = '1544153689302896701';
    if (vcSession && message.channel.id === VC_TEXT_CHANNEL_ID) {
        console.log(`[AI] Speaking response out loud in VC: "${aiResponseText.slice(0, 50)}..."`);
        try {
            const p = speakText(message.guild.id, aiResponseText);
            if (p && typeof p.catch === 'function') {
                p.catch(err => console.error('[AI] speakText failed:', err.message));
            }
        } catch (err) {
            console.error('[AI] speakText error:', err.message);
        }
    }

    return true;
}

const DEFAULT_TICKET_AI_PROMPT = `You are the LumeBot Ticket Support AI Assistant.
Your Goal: Be a helpful, polite support assistant answering user questions while they wait for human staff.

STRICT MANDATORY RULES & CONSTRAINTS:
1. ABSOLUTELY NO ADMINISTRATIVE OR MODERATION DECISIONS: You CANNOT grant roles, remove roles, ban, mute, process refunds, or make binding staff promises.
2. If the user asks for a role, unban, refund, or staff action, respond politely: "I am an automated AI support assistant and cannot grant roles or make staff decisions. Our human staff team will assist you with this shortly!"
3. DO NOT use the Verity persona or funny sarcastic jokes. Maintain a friendly, clear, helpful, and professional customer support persona.
4. Keep answers concise, clear, and structured for Discord chat.`;

/**
 * Handles AI chat specifically inside an open ticket channel
 */
async function handleTicketAIMessage(client, message, ticket) {
    if (message.author.bot) return false;
    if (!ticket || ticket.status !== 'open') return false;
    if (ticket.claimedBy) return false; // AI disabled if claimed
    if (ticket.aiMode !== true) return false; // AI disabled if not enabled

    // AI Rate limit check (3s per user)
    const lastAITime = aiUserCooldowns.get(message.author.id) || 0;
    if (Date.now() - lastAITime < AI_COOLDOWN_MS) return true;
    aiUserCooldowns.set(message.author.id, Date.now());

    const userQuery = message.content.trim();
    if (!userQuery) return false;

    console.log(`[TICKET AI] User ${message.author.tag} in ${ticket.channelName}: "${userQuery}"`);

    // Thinking message
    let thinkingMsg = await message.reply({ content: 'Thinking...', allowedMentions: NO_PINGS }).catch(() => null);

    let systemPrompt = DEFAULT_TICKET_AI_PROMPT;
    if (ticket.type === 'staff') {
        systemPrompt = `You are Verity, the AI Assistant for Lume's Realm Server Staff Applications.
Your Goal: Help applicant ${message.author.username} detail their Server Staff Application while waiting for staff.
Guide them to share and expand on:
1) Their Age & Timezone
2) Previous staff experience (servers, roles, responsibilities)
3) Why they want to join our staff team
4) How many hours per day/week they can contribute & their ideas for the server.

STRICT CONSTRAINTS:
- NEVER mention order IDs, refunds, bugs, or customer support issues!
- Be polite, encouraging, and helpful. Ask follow-up questions to help them expand on their answers.
- Remember: You CANNOT approve or reject applications yourself. Remind them gently: "I've noted that down! Our human staff team will review your application briefing when they claim this ticket."`;
    } else if (ticket.type === 'dev') {
        systemPrompt = `You are Verity, the AI Assistant for Lume's Realm Minecraft Developer Applications.
Your Goal: Help applicant ${message.author.username} detail their Developer Application while waiting for staff.
Guide them to share and expand on:
1) Portfolio / past work / GitHub links
2) Experience with Plugins, Mods, Configs (Java, Skript, Spigot/Paper, etc.)
3) Timezone & availability
4) Development ideas for our server.

STRICT CONSTRAINTS:
- NEVER mention order IDs, refunds, or generic customer support!
- Be encouraging and technical. Discuss their developer experience and ideas.
- Remember: You CANNOT approve applications yourself.`;
    }

    const messagesPayload = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Applicant ${message.author.username} says: ${userQuery}` }
    ];

    let aiResponseText = null;
    try {
        const provider = PROVIDERS.gpt;
        const model = process.env.AI_MODEL || 'gpt-5.6-luna';
        aiResponseText = await completeChat(provider.apiKey, provider.baseUrl, model, messagesPayload, {
            temperature: 0.5,
            maxTokens: 1200,
            timeoutMs: 40000,
        });
    } catch (err) {
        console.error('[TICKET AI] failed:', err.message);
    }

    if (!aiResponseText) {
        const failText = "I'm having trouble processing that right now, but our staff team will assist you shortly!";
        if (thinkingMsg) await thinkingMsg.edit({ content: failText }).catch(() => {});
        else await message.reply({ content: failText, allowedMentions: NO_PINGS }).catch(() => {});
        return true;
    }

    if (thinkingMsg) {
        await thinkingMsg.edit({ content: aiResponseText, allowedMentions: NO_PINGS }).catch(() => {});
    } else {
        await message.reply({ content: aiResponseText, allowedMentions: NO_PINGS }).catch(() => {});
    }

    return true;
}

/**
 * Splits text into chunks of maximum size
 */
function splitText(text, chunkSize) {
    const regex = new RegExp(`.{1,${chunkSize}}`, 'gs');
    return text.match(regex) || [text];
}

/**
 * Generates an executive briefing summary of ticket messages for staff when claiming a ticket
 * @param {import('discord.js').TextChannel} channel 
 * @returns {Promise<string|null>}
 */
async function generateTicketSummary(channel) {
    try {
        const fetched = await channel.messages.fetch({ limit: 40 }).catch(() => null);
        if (!fetched || fetched.size <= 1) return null;

        const messages = Array.from(fetched.values()).reverse();

        // Extract user and bot conversation lines
        const chatLines = [];
        for (const m of messages) {
            if (!m.content) continue;
            if (m.content.includes('Ticket Claimed') || m.content.includes('AI Assistant Support')) continue;

            const sender = m.author.bot ? 'AI Assistant' : m.author.username;
            chatLines.push(`${sender}: ${m.content}`);
        }

        if (chatLines.length < 2) return null;

        const chatContext = chatLines.slice(-15).join('\n');
        const provider = PROVIDERS.gpt;
        
        const payload = {
            messages: [
                {
                    role: 'system',
                    content: `You are an AI evaluator and executive ticket summarizer for Discord staff.
Read the ticket conversation log and evaluate the user's application/request:
1. The FIRST LINE MUST start with either "🤖 AI Verdict: **YES**" (if the applicant/user provided valid, good, or reasonable details) or "🤖 AI Verdict: **NO**" (if the responses are insufficient, vague, trolling, or invalid), followed by a 1-sentence reason.
2. Followed by 2-3 concise bullet points outlining:
   - Summary of User's Request / Application
   - Key Details Provided
   - Suggested Next Step for Staff.`
                },
                {
                    role: 'user',
                    content: `Ticket Conversation Log:\n${chatContext}`
                }
            ],
            temperature: 0.3
        };

        return await completeChat(provider.apiKey, provider.baseUrl, process.env.AI_MODEL || 'gpt-5.6-luna', payload.messages, {
            temperature: 0.3,
            maxTokens: 800,
            timeoutMs: 40000,
        });
    } catch (e) {
        console.error('[AI SUMMARY ERROR]', e.message);
        return null;
    }
}

module.exports = {
    handleAIMessage,
    handleTicketAIMessage,
    generateTicketSummary,
    toggleAIIgnore,
    isAIIgnored,
    moderateMessage,
    stripPings,
    completeChat,
    completeChatWithTools,
    DEFAULT_SYSTEM_PROMPT,
};
