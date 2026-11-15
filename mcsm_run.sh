#!/bin/bash
cd /opt/verity-bot
NODE_BIN=$(command -v /usr/local/bin/node || command -v /opt/mcsmanager/node-v20.12.2-linux-x64/bin/node || command -v node)
exec "$NODE_BIN" /opt/verity-bot/start_all.js
