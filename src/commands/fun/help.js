// Verity — Help Command
const { SlashCommandBuilder } = require('discord.js');
const { createEmbed } = require('../../utils/embeds');
const config = require('../../config');
const db = require('../../database/db');

module.exports = {
    name: 'help',
    aliases: ['h', 'commands'],
    description: 'Displays all available commands and bot features.',
    category: 'fun',
    slashData: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Displays all available commands and bot features.')
        .addStringOption(option =>
            option.setName('command')
                .setDescription('Get detailed help for a specific command')
                .setRequired(false)
        ),

    async execute(message, args, client) {
        const settings = db.getSettings();
        const prefix = settings.prefix || config.PREFIX;

        if (args[0]) {
            const name = args[0].toLowerCase();
            const cmd = client.commands.get(name) || client.commands.find(c => c.aliases && c.aliases.includes(name));
            if (!cmd) {
                return message.reply({ embeds: [createEmbed('Command Not Found', `No command matching \`${name}\` exists.`, config.COLORS.DANGER)] });
            }

            const embed = createEmbed({
                color: config.COLORS.PRIMARY,
                title: `📖 Command: ${prefix}${cmd.name}`,
                description: cmd.description || 'No description provided.',
                fields: [
                    { name: 'Category', value: `\`${cmd.category || 'general'}\``, inline: true },
                    { name: 'Aliases', value: cmd.aliases && cmd.aliases.length > 0 ? cmd.aliases.map(a => `\`${a}\``).join(', ') : 'None', inline: true },
                ],
                footer: `Usage: ${prefix}${cmd.name}`
            });

            return message.reply({ embeds: [embed] });
        }

        return message.reply({ embeds: [buildGeneralHelp(prefix, client)] });
    },

    async slashExecute(interaction, client) {
        const settings = db.getSettings();
        const prefix = settings.prefix || config.PREFIX;
        const cmdName = interaction.options.getString('command');

        if (cmdName) {
            const name = cmdName.toLowerCase();
            const cmd = client.commands.get(name) || client.commands.find(c => c.aliases && c.aliases.includes(name));
            if (!cmd) {
                return interaction.reply({ embeds: [createEmbed('Command Not Found', `No command matching \`${name}\` exists.`, config.COLORS.DANGER)], ephemeral: true });
            }

            const embed = createEmbed({
                color: config.COLORS.PRIMARY,
                title: `📖 Command: /${cmd.name}`,
                description: cmd.description || 'No description provided.',
                fields: [
                    { name: 'Category', value: `\`${cmd.category || 'general'}\``, inline: true },
                    { name: 'Aliases', value: cmd.aliases && cmd.aliases.length > 0 ? cmd.aliases.map(a => `\`${a}\``).join(', ') : 'None', inline: true },
                ],
                footer: `Usage: /${cmd.name}`
            });

            return interaction.reply({ embeds: [embed] });
        }

        return interaction.reply({ embeds: [buildGeneralHelp(prefix, client)] });
    }
};

function buildGeneralHelp(prefix, client) {
    const funCmds = client.commands.filter(c => c.category === 'fun').map(c => `\`${c.name}\``).join(', ');
    const staffCmds = client.commands.filter(c => c.category === 'staff').map(c => `\`${c.name}\``).join(', ');
    const managerCmds = client.commands.filter(c => c.category === 'manager').map(c => `\`${c.name}\``).join(', ');
    const levelCmds = client.commands.filter(c => c.category === 'leveling').map(c => `\`${c.name}\``).join(', ');

    return createEmbed({
        color: config.COLORS.PRIMARY,
        title: '🌟 Verity — Commands & Features Menu',
        description: `Welcome to **Verity**! Type \`${prefix}help [command]\` or \`/help [command]\` for details.`,
        fields: [
            { name: '🎉 Fun & Utilities', value: funCmds || 'None', inline: false },
            { name: '📈 Leveling & XP', value: levelCmds || 'None', inline: false },
            { name: '🛡️ Staff & Moderation', value: staffCmds || 'None', inline: false },
            { name: '⚙️ Manager & Config', value: managerCmds || 'None', inline: false },
        ],
        footer: `Prefix: ${prefix} • Slash commands enabled!`
    });
}
