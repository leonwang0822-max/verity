// Sub-Bot AI Chat System (conversational + live tools)
const config = require('../config');
const path = require('path');

// Reuse main Verity AI stack (prompts/tools) so sub-bot stays in sync.
const mainAi = require(path.join(__dirname, '../../../src/systems/ai'));
const { buildTemporalAwarenessBlock } = require(path.join(__dirname, '../../../src/systems/aiTools'));

async function handleAIChat(userPrompt, conversationHistory = []) {
    if (!config.ai.enabled || !userPrompt) return null;

    try {
        const systemPrompt = `${config.ai.systemPrompt}\n\n${buildTemporalAwarenessBlock()}`;
        const messages = [
            { role: 'system', content: systemPrompt },
            ...conversationHistory.slice(-10),
            { role: 'user', content: userPrompt }
        ];

        const reply = await mainAi.completeChatWithTools(
            config.ai.apiKey,
            config.ai.baseUrl,
            process.env.AI_MODEL || 'claude-opus-5-5',
            messages,
            {
                temperature: 0.7,
                maxTokens: 500,
                timeoutMs: 45000,
                enableTools: true,
                maxToolRounds: 3,
            }
        );
        return reply || null;
    } catch (e) {
        console.error('[SUB-BOT AI EXCEPTION]:', e.message);
    }
    return null;
}

module.exports = {
    handleAIChat
};
