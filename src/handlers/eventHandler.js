// LumeBot — Event Handler
// Loads all event files from the events directory

const fs = require('fs');
const path = require('path');

function loadEvents(client) {
    const eventsDir = path.join(__dirname, '..', 'events');
    const files = fs.readdirSync(eventsDir).filter(f => f.endsWith('.js'));

    for (const file of files) {
        try {
            const event = require(path.join(eventsDir, file));
            const eventName = file.replace('.js', '');

            if (event.once) {
                client.once(eventName, (...args) => event.execute(client, ...args));
            } else {
                client.on(eventName, (...args) => event.execute(client, ...args));
            }

            console.log(`[EVT] Loaded event: ${eventName}`);
        } catch (e) {
            console.error(`[EVT] Failed to load ${file}:`, e.message);
        }
    }
}

module.exports = { loadEvents };
