const { SlashCommandBuilder } = require('discord.js');
const { successEmbed, errorEmbed, infoEmbed } = require('../../utils/embeds');
const db = require('../../database/db');

const DEV_USER_ID = '1488316093964746872';

module.exports = {
    name: 'whitelist',
    aliases: ['wl', 'serverwhitelist'],
    description: 'Whitelist a Discord server ID to allow the bot to stay in it (Developer Only).',
    category: 'staff',
    slashData: new SlashCommandBuilder()
        .setName('whitelist')
        .setDescription('Manage whitelisted servers (Developer Only)')
        .addSubcommand(sub =>
            sub.setName('add')
               .setDescription('Add a server ID to the whitelist')
               .addStringOption(o => o.setName('server_id').setDescription('The Discord Guild/Server ID').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('remove')
               .setDescription('Remove a server ID from the whitelist')
               .addStringOption(o => o.setName('server_id').setDescription('The Discord Guild/Server ID').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('list')
               .setDescription('List all whitelisted server IDs')
        ),

    async execute(message, args, client) {
        if (message.author.id !== DEV_USER_ID) {
            return message.reply({ embeds: [errorEmbed(`❌ Permission Denied. ONLY Developer User ID \`${DEV_USER_ID}\` can use this command.`)] });
        }

        const action = args[0]?.toLowerCase();

        if (action === 'add') {
            const guildId = args[1]?.trim();
            if (!guildId) return message.reply({ embeds: [errorEmbed('Please specify a Server ID to whitelist.\nExample: `?whitelist add 1544153685523955804`')] });

            db.addWhitelistedGuild(guildId);
            return message.reply({ embeds: [successEmbed(`Server ID \`${guildId}\` has been added to the whitelist.`)] });
        }

        if (action === 'remove' || action === 'delete') {
            const guildId = args[1]?.trim();
            if (!guildId) return message.reply({ embeds: [errorEmbed('Please specify a Server ID to remove.\nExample: `?whitelist remove 1544153685523955804`')] });

            const removed = db.removeWhitelistedGuild(guildId);
            if (!removed) return message.reply({ embeds: [errorEmbed(`Server ID \`${guildId}\` is not in the whitelist.`)] });

            // If bot is currently in that server, auto-leave it!
            const guild = client.guilds.cache.get(guildId);
            if (guild) {
                await guild.leave().catch(() => {});
            }

            return message.reply({ embeds: [successEmbed(`Server ID \`${guildId}\` has been removed from the whitelist.`)] });
        }

        if (action === 'list' || !action) {
            const list = db.getWhitelistedGuilds();
            if (list.length === 0) {
                return message.reply({ embeds: [infoEmbed('No servers are currently restricted (Whitelist is empty, all servers allowed).', 'Server Whitelist')] });
            }

            const formatted = list.map(id => {
                const g = client.guilds.cache.get(id);
                return `• \`${id}\`${g ? ` — **${g.name}**` : ''}`;
            }).join('\n');

            return message.reply({ embeds: [infoEmbed(`**Whitelisted Servers (${list.length}):**\n\n${formatted}`, 'Server Whitelist')] });
        }

        return message.reply({ embeds: [errorEmbed('Invalid subcommand. Use `add`, `remove`, or `list`.\nExample: `?whitelist add 1544153685523955804`')] });
    },

    async slashExecute(interaction, client) {
        if (interaction.user.id !== DEV_USER_ID) {
            return interaction.reply({ embeds: [errorEmbed(`❌ Permission Denied. ONLY Developer User ID \`${DEV_USER_ID}\` can use this command.`)], ephemeral: true });
        }

        const sub = interaction.options.getSubcommand();

        if (sub === 'add') {
            const guildId = interaction.options.getString('server_id').trim();
            db.addWhitelistedGuild(guildId);
            return interaction.reply({ embeds: [successEmbed(`Server ID \`${guildId}\` has been added to the whitelist.`)], ephemeral: true });
        }

        if (sub === 'remove') {
            const guildId = interaction.options.getString('server_id').trim();
            const removed = db.removeWhitelistedGuild(guildId);
            if (!removed) return interaction.reply({ embeds: [errorEmbed(`Server ID \`${guildId}\` is not in the whitelist.`)], ephemeral: true });

            const guild = client.guilds.cache.get(guildId);
            if (guild) {
                await guild.leave().catch(() => {});
            }

            return interaction.reply({ embeds: [successEmbed(`Server ID \`${guildId}\` has been removed from the whitelist.`)], ephemeral: true });
        }

        if (sub === 'list') {
            const list = db.getWhitelistedGuilds();
            if (list.length === 0) {
                return interaction.reply({ embeds: [infoEmbed('No servers are currently restricted (Whitelist is empty).', 'Server Whitelist')], ephemeral: true });
            }

            const formatted = list.map(id => {
                const g = client.guilds.cache.get(id);
                return `• \`${id}\`${g ? ` — **${g.name}**` : ''}`;
            }).join('\n');

            return interaction.reply({ embeds: [infoEmbed(`**Whitelisted Servers (${list.length}):**\n\n${formatted}`, 'Server Whitelist')], ephemeral: true });
        }
    }
};
