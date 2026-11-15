// Verity — Command Handler
// Loads both slash and prefix commands from the commands directory

const fs = require('fs');
const path = require('path');
const { Collection } = require('discord.js');
const logger = require('../utils/logger');

function loadCommands(client) {
    client.commands = new Collection();
    client.slashCommands = [];

    const commandsDir = path.join(__dirname, '..', 'commands');
    const categories = fs.readdirSync(commandsDir).filter(f =>
        fs.statSync(path.join(commandsDir, f)).isDirectory()
    );

    let totalUnique = 0;
    let totalAliases = 0;
    const catCounts = {};

    for (const category of categories) {
        const categoryPath = path.join(commandsDir, category);
        const files = fs.readdirSync(categoryPath).filter(f => f.endsWith('.js'));
        catCounts[category] = 0;

        for (const file of files) {
            try {
                const command = require(path.join(categoryPath, file));
                command.category = category;

                if (command.name) {
                    client.commands.set(command.name, command);
                    totalUnique++;
                    catCounts[category]++;
                }

                // Collect aliases
                if (command.aliases) {
                    for (const alias of command.aliases) {
                        client.commands.set(alias, { ...command, isAlias: true });
                        totalAliases++;
                    }
                }

                // Collect slash command data
                if (command.slashData) {
                    client.slashCommands.push(command.slashData.toJSON());
                }
            } catch (e) {
                logger.error(`Failed to load ${category}/${file}: ${e.message}`, e);
            }
        }
    }

    const summaryStr = Object.entries(catCounts).map(([cat, count]) => `${cat}: ${count}`).join(' | ');
    logger.main(`⚡ Loaded ${totalUnique} commands (+${totalAliases} aliases) across categories [${summaryStr}]`);
}

module.exports = { loadCommands };

