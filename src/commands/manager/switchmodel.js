const { SlashCommandBuilder } = require('discord.js');
const { successEmbed, errorEmbed, createEmbed } = require('../../utils/embeds');
const { hasManager } = require('../../utils/permissions');
const db = require('../../database/db');
const config = require('../../config');

module.exports = {
    name: 'switchmodel',
    aliases: ['model', 'setmodel', 'switchai'],
    description: 'Switch the AI model provider between GPT (OpenAI) and Claude (Anthropic).',
    category: 'manager',
    slashData: new SlashCommandBuilder()
        .setName('switchmodel')
        .setDescription('Switch the AI model provider for Verity.')
        .addStringOption(option =>
            option.setName('provider')
                .setDescription('The AI model provider to use')
                .setRequired(true)
                .addChoices(
                    { name: 'GPT (OpenAI — gpt-5.5 / gpt-5.6 / gpt-5.4)', value: 'gpt' },
                    { name: 'Claude (Anthropic — claude-3.7-sonnet / claude-3.5-sonnet)', value: 'claude' }
                )
        ),

    async execute(message, args, client) {
        if (!hasManager(message.member)) return message.reply({ embeds: [errorEmbed('Only bot managers can use this command.')] });

        const choice = args[0]?.toLowerCase();
        if (!['gpt', 'claude'].includes(choice)) {
            return message.reply({ embeds: [errorEmbed('Please specify a valid provider: `gpt` or `claude`.\nExample: `?switchmodel claude`')] });
        }

        const resultEmbed = applySwitch(choice);
        return message.reply({ embeds: [resultEmbed] });
    },

    async slashExecute(interaction, client) {
        if (!hasManager(interaction.member)) return interaction.reply({ embeds: [errorEmbed('Only bot managers can use this command.')], ephemeral: true });

        const choice = interaction.options.getString('provider');
        const resultEmbed = applySwitch(choice);
        return interaction.reply({ embeds: [resultEmbed], ephemeral: true });
    }
};

function applySwitch(provider) {
    db.updateSettings({ aiProvider: provider });

    const isClaude = provider === 'claude';
    return createEmbed({
        color: config.COLORS.SUCCESS,
        title: `🤖 AI Provider Switched to ${isClaude ? 'Claude (Anthropic)' : 'GPT (OpenAI)'}`,
        description: isClaude
            ? 'Verity will now use the **Claude (Anthropic)** provider pipeline.\n\n**Models:** `claude-3-7-sonnet-20250219`, `claude-3-5-sonnet-20241022`, `claude-3-5-haiku-20241022`'
            : 'Verity will now use the **GPT (OpenAI)** provider pipeline.\n\n**Models:** `gpt-5.5`, `gpt-5.6`, `gpt-5.4`, `gpt-5.4-mini`',
        footer: 'Verity AI System'
    });
}
