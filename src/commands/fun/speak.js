const { SlashCommandBuilder } = require('discord.js');
const { getVCSession, speakText } = require('../../systems/voice');

// Hardcoded list only for extreme slurs / hate speech
const severeSlurs = ['nigger', 'nigga', 'faggot', 'retard', 'cunt'];

function containsSevereSlurs(text) {
    const lowerText = text.toLowerCase();
    // Catch 'gay', 'gayy', 'gayyyy', etc.
    if (/\bg+a+y+\b/i.test(lowerText)) return true;

    return severeSlurs.some(word => new RegExp(`\\b${word}\\b`, 'i').test(lowerText));
}

async function checkContentSafety(text) {
    if (containsSevereSlurs(text)) return false;

    const baseUrl = (process.env.AI_BASE_URL || '').replace(/\/+$/, '');
    const apiKey = process.env.AI_API_KEY || '';

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3500);

        const response = await fetch(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: 'gpt-5.4-mini',
                messages: [
                    {
                        role: 'system',
                        content: 'You are an EXTREMELY lenient text moderation AI for a Discord gaming server. ALWAYS reply SAFE for jokes, playful threats (e.g. "I will touch u tonight"), memes, trolling, and friendly banter. ONLY reply UNSAFE for actual real-life illegal terrorism or extreme racial slurs (n-word). If it is a joke or meme, reply SAFE.'
                    },
                    { role: 'user', content: text }
                ],
                temperature: 0.0,
                max_tokens: 5,
            }),
            signal: controller.signal,
        });
        clearTimeout(timeout);

        if (response.ok) {
            const data = await response.json();
            const resText = data?.choices?.[0]?.message?.content?.trim().toUpperCase();
            if (resText && resText.includes('UNSAFE')) {
                console.log(`[AI MODERATION] Blocked unsafe text: "${text}"`);
                return false;
            }
        }
    } catch (e) {
        // Fallback on timeout or API error
    }
    return true;
}

module.exports = {
    name: 'speak',
    aliases: ['voicesay', 'tts'],
    description: 'Make Verity speak something out loud in voice chat',
    category: 'fun',
    slashData: new SlashCommandBuilder()
        .setName('speak')
        .setDescription('Make Verity speak something out loud in voice chat')
        .addStringOption(option => option.setName('text').setDescription('Text for Verity to speak').setRequired(true)),

    async execute(message, args, client) {

        const text = args.join(' ');
        if (!text) return message.reply('Please provide text for Verity to speak.');

        const isSafe = await checkContentSafety(text);
        if (!isSafe) {
            return message.reply({ content: 'I cannot speak that text because it contains inappropriate words.' });
        }

        const { isAIIgnored } = require('../../systems/ai');
        if (isAIIgnored()) {
            return message.reply('hey bro nuh uh im not goona reply to you');
        }

        const { isTTSPaused, isTTSSuperForced } = require('../../systems/voice');
        const { isOwner, DEV_USER_ID } = require('../../utils/permissions');
        const SUPERFORCE_USERS = ['1488316093964746872', '1127771626822447174'];
        const isBotOwner = SUPERFORCE_USERS.includes(message.author.id) || message.author.id === DEV_USER_ID;

        if (isTTSSuperForced(message.guild.id) && !isBotOwner) {
            return message.reply('Muheheehe the bot has been take over by LeonW');
        }

        if (isTTSPaused(message.guild.id) && !isBotOwner && !isOwner(message.member)) {
            return message.reply('⏸️ Voice TTS is currently paused by `?forceplay`. Use `?resume` to enable TTS again.');
        }

        const ok = await speakText(message.guild.id, text);
        if (ok) {
            await message.reply(`Speaking: "${text.length > 100 ? text.slice(0, 100) + '...' : text}"`).catch(() => {});
        } else {
            await message.reply('Failed to generate speech. Try again.').catch(() => {});
        }
    },

    async slashExecute(interaction, client) {
        const text = interaction.options.getString('text');

        const isSafe = await checkContentSafety(text);
        if (!isSafe) {
            return interaction.reply({ content: 'I cannot speak that text because it contains inappropriate words.', ephemeral: true });
        }

        const { isAIIgnored } = require('../../systems/ai');
        if (isAIIgnored()) {
            return interaction.reply({ content: 'hey bro nuh uh im not goona reply to you', ephemeral: true });
        }

        const { isTTSPaused, isTTSSuperForced } = require('../../systems/voice');
        const { isOwner, DEV_USER_ID } = require('../../utils/permissions');
        const SUPERFORCE_USERS = ['1488316093964746872', '1127771626822447174'];
        const isBotOwner = SUPERFORCE_USERS.includes(interaction.user.id) || interaction.user.id === DEV_USER_ID;

        if (isTTSSuperForced(interaction.guild.id) && !isBotOwner) {
            return interaction.reply({ content: 'Muheheehe the bot has been take over by LeonW', ephemeral: true });
        }

        if (isTTSPaused(interaction.guild.id) && !isBotOwner && !isOwner(interaction.member)) {
            return interaction.reply({ content: '⏸️ Voice TTS is currently paused by `?forceplay`. Use `?resume` to enable TTS again.', ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true });

        const ok = await speakText(interaction.guild.id, text);
        if (ok) {
            await interaction.editReply(`Speaking: "${text.length > 100 ? text.slice(0, 100) + '...' : text}"`);
        } else {
            await interaction.editReply('Failed to generate speech. Try again.');
        }
    }
};
