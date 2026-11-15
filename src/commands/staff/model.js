// LumeBot — Check & Switch AI Model Command
const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, successEmbed, infoEmbed } = require('../../utils/embeds');
const db = require('../../database/db');
const config = require('../../config');
const { PROVIDERS } = require('../../systems/ai');

module.exports = {
    name: 'model',
    aliases: ['aimodel', 'currentmodel', 'models'],
    description: 'Check or switch the current AI engine model provider.',
    category: 'staff',
    slashData: new SlashCommandBuilder()
        .setName('model')
        .setDescription('Check or switch the current AI engine model provider.')
        .addStringOption(option => option.setName('provider').setDescription('Switch provider (gpt or claude)').addChoices(
            { name: 'GPT (OpenAI)', value: 'gpt' },
            { name: 'Claude (Anthropic)', value: 'claude' }
        ).setRequired(false)),

    async execute(message, args, client) {
        const guildId = message.guild ? message.guild.id : config.GUILD_ID;
        const settings = db.getSettings(guildId);
        const newProvider = args[0]?.toLowerCase();

        if (newProvider) {
            if (!['gpt', 'claude'].includes(newProvider)) {
                return message.reply({ embeds: [infoEmbed('Invalid provider choice. Use `gpt` or `claude`.\nExample: `?model gpt`', 'AI Engine Status')] });
            }

            db.updateSettings(guildId, { aiProvider: newProvider });
            const providerInfo = PROVIDERS[newProvider];
            return message.reply({
                embeds: [successEmbed(`AI Engine successfully switched to **${providerInfo.name}** (\`${providerInfo.model}\`).`)]
            });
        }

        // Display current model status
        const currentKey = settings.aiProvider || 'gpt';
        const currentProvider = PROVIDERS[currentKey] || PROVIDERS.gpt;

        const embed = createEmbed({
            color: config.COLORS.INFO,
            title: '🤖 Verity AI Engine Status',
            description: `Currently active AI Provider and Model settings for **${message.guild ? message.guild.name : 'this server'}**:`,
            fields: [
                { name: '⚡ Active Engine', value: `**${currentProvider.name}** (\`${currentKey.toUpperCase()}\`)`, inline: true },
                { name: '🎯 Primary Model', value: `\`${currentProvider.model}\``, inline: true },
                { name: '🌐 Base Endpoint', value: `\`${currentProvider.baseURL}\``, inline: true },
                { name: '🔄 Switch Model', value: 'Use `/model [gpt / claude]` or `?model gpt` to switch engines anytime.', inline: false }
            ],
            footer: 'LumeBot AI Core • Verity Engine'
        });

        return message.reply({ embeds: [embed] });
    },

    async slashExecute(interaction, client) {
        const guildId = interaction.guild ? interaction.guild.id : config.GUILD_ID;
        const settings = db.getSettings(guildId);
        const choice = interaction.options.getString('provider');

        if (choice) {
            db.updateSettings(guildId, { aiProvider: choice });
            const providerInfo = PROVIDERS[choice];
            return interaction.reply({
                embeds: [successEmbed(`AI Engine successfully switched to **${providerInfo.name}** (\`${providerInfo.model}\`).`)]
            });
        }

        const currentKey = settings.aiProvider || 'gpt';
        const currentProvider = PROVIDERS[currentKey] || PROVIDERS.gpt;

        const embed = createEmbed({
            color: config.COLORS.INFO,
            title: '🤖 Verity AI Engine Status',
            description: `Currently active AI Provider and Model settings for **${interaction.guild ? interaction.guild.name : 'this server'}**:`,
            fields: [
                { name: '⚡ Active Engine', value: `**${currentProvider.name}** (\`${currentKey.toUpperCase()}\`)`, inline: true },
                { name: '🎯 Primary Model', value: `\`${currentProvider.model}\``, inline: true },
                { name: '🌐 Base Endpoint', value: `\`${currentProvider.baseURL}\``, inline: true },
                { name: '🔄 Switch Model', value: 'Use `/model [gpt / claude]` to switch engines anytime.', inline: false }
            ],
            footer: 'LumeBot AI Core • Verity Engine'
        });

        return interaction.reply({ embeds: [embed] });
    }
};
