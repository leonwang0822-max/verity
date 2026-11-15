// Sub-Bot AI Chat System (Pure Conversational AI)
const config = require('../config');

async function handleAIChat(userPrompt, conversationHistory = []) {
    if (!config.ai.enabled || !userPrompt) return null;

    try {
        const messages = [
            { role: 'system', content: config.ai.systemPrompt },
            ...conversationHistory.slice(-10),
            { role: 'user', content: userPrompt }
        ];

        const response = await fetch(`${config.ai.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.ai.apiKey}`
            },
            body: JSON.stringify({
                model: process.env.AI_MODEL || 'claude-opus-5-5',
                messages,
                temperature: 0.7,
                max_tokens: 300,
            })
        });

        if (response.ok) {
            const data = await response.json();
            const reply = data?.choices?.[0]?.message?.content?.trim();
            if (reply) return reply;
        } else {
            console.error('[SUB-BOT AI ERROR] Status:', response.status);
        }
    } catch (e) {
        console.error('[SUB-BOT AI EXCEPTION]:', e.message);
    }
    return null;
}

module.exports = {
    handleAIChat
};
