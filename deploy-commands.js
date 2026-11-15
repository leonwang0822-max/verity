// LumeBot — Deploy Slash Commands to Discord
// Run this once with: node deploy-commands.js

require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

const token = process.env.BOT_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = '1544153685523955804';

if (!token || token === 'YOUR_BOT_TOKEN_HERE') {
    console.error('Bot token not set! Edit your .env file.');
    process.exit(1);
}
if (!clientId || clientId === 'YOUR_CLIENT_ID_HERE') {
    console.error('Client ID not set! Edit your .env file.');
    process.exit(1);
}

const commands = [];
const commandsDir = path.join(__dirname, 'src', 'commands');

// Recursively load all command files
const categories = fs.readdirSync(commandsDir).filter(f =>
    fs.statSync(path.join(commandsDir, f)).isDirectory()
);

for (const category of categories) {
    const files = fs.readdirSync(path.join(commandsDir, category)).filter(f => f.endsWith('.js'));
    for (const file of files) {
        const command = require(path.join(commandsDir, category, file));
        if (command.slashData) {
            commands.push(command.slashData.toJSON());
            console.log(`[DEPLOY] Loaded: ${command.name} (${category})`);
        }
    }
}

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
    try {
        console.log(`\n[DEPLOY] Registering ${commands.length} slash commands to guild ${guildId}...`);

        const data = await rest.put(
            Routes.applicationGuildCommands(clientId, guildId),
            { body: commands },
        );

        console.log(`[DEPLOY] Successfully registered ${data.length} commands!`);
    } catch (error) {
        console.error('[DEPLOY] Error:', error);
    }
})();
