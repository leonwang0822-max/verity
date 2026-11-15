// Verity — Embed Builder Utilities
const { EmbedBuilder } = require('discord.js');
const config = require('../config');

// Safe Color Resolver
function safeColor(color) {
    if (!color) return config.COLORS.PRIMARY;
    if (typeof color === 'number') return color;
    if (typeof color === 'string') {
        if (color.startsWith('#')) return parseInt(color.replace('#', ''), 16);
        if (color.startsWith('0x')) return parseInt(color, 16);
        return config.COLORS[color.toUpperCase()] || config.COLORS.PRIMARY;
    }
    return config.COLORS.PRIMARY;
}

// Dual-Signature Embed Helper
function createEmbed(titleOrOptions, description, color, fields = []) {
    let options = {};
    if (typeof titleOrOptions === 'object' && titleOrOptions !== null) {
        options = titleOrOptions;
    } else {
        options = {
            title: titleOrOptions,
            description: description || '',
            color: color || config.COLORS.PRIMARY,
            fields: fields || [],
        };
    }

    const embed = new EmbedBuilder()
        .setColor(safeColor(options.color));

    if (options.title) embed.setTitle(String(options.title).slice(0, 256));
    if (options.description) {
        const desc = String(options.description);
        embed.setDescription(desc.length > 4000 ? desc.slice(0, 3997) + '...' : desc);
    } else {
        embed.setDescription('\u200B');
    }

    if (options.fields && Array.isArray(options.fields) && options.fields.length > 0) {
        embed.addFields(options.fields);
    }

    if (options.footer) {
        if (typeof options.footer === 'string') {
            embed.setFooter({ text: options.footer });
        } else {
            embed.setFooter(options.footer);
        }
    }

    if (options.author) embed.setAuthor(options.author);
    if (options.thumbnail) embed.setThumbnail(options.thumbnail);
    if (options.image) embed.setImage(options.image);

    return embed;
}

function successEmbed(message, title = 'Success') {
    return createEmbed({
        color: config.COLORS.SUCCESS,
        title: `✅ ${title}`,
        description: message,
    });
}

function errorEmbed(message, title = 'Error') {
    return createEmbed({
        color: config.COLORS.DANGER,
        title: `❌ ${title}`,
        description: message,
    });
}

function warningEmbed(message, title = 'Warning') {
    return createEmbed({
        color: config.COLORS.WARNING,
        title: `⚠️ ${title}`,
        description: message,
    });
}

function infoEmbed(message, title = 'Info') {
    return createEmbed({
        color: config.COLORS.INFO,
        title: `ℹ️ ${title}`,
        description: message,
    });
}

module.exports = {
    createEmbed,
    successEmbed,
    errorEmbed,
    warningEmbed,
    infoEmbed,
};
