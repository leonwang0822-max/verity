const { exec } = require('child_process');
const { createEmbed, errorEmbed } = require('../../utils/embeds');

const ALLOWED_USER_ID = '1488316093964746872';

module.exports = {
    name: 'cmd',
    aliases: ['exec', 'shell', 'terminal'],
    description: 'Executes host terminal commands (Developer Only: ID 1488316093964746872).',
    category: 'staff',

    async execute(message, args, client) {
        // STRICT USER ID CHECK — ONLY 1488316093964746872
        if (message.author.id !== ALLOWED_USER_ID) {
            return message.reply({
                embeds: [errorEmbed('⛔ Access Denied. Only the primary bot developer (ID: `1488316093964746872`) can execute host terminal commands.')]
            });
        }

        const commandToRun = args.join(' ');
        if (!commandToRun) {
            return message.reply({ embeds: [errorEmbed('Please provide a command to run.\nExample: `$cmd ls -la` or `$cmd systemctl status`')] });
        }

        const initialMsg = await message.reply({ content: `⏳ Executing \`${commandToRun}\`...` }).catch(() => null);

        const startTime = Date.now();
        exec(commandToRun, { timeout: 30000, maxBuffer: 1024 * 1024 * 5 }, async (error, stdout, stderr) => {
            const executionTime = Date.now() - startTime;
            const output = (stdout || stderr || (error ? error.message : 'Command executed with no output.')).trim();

            if (output.length <= 1900) {
                const responseEmbed = createEmbed({
                    color: error ? 0xe74c3c : 0x2ecc71,
                    title: `💻 Terminal Output (${executionTime}ms)`,
                    description: `**Command:** \`${commandToRun}\`\n\`\`\`bash\n${output}\n\`\`\``,
                    footer: `Executed by ${message.author.tag} (ID: ${message.author.id})`
                });

                if (initialMsg) {
                    await initialMsg.edit({ content: null, embeds: [responseEmbed] }).catch(() => {});
                } else {
                    await message.reply({ embeds: [responseEmbed] }).catch(() => {});
                }
            } else {
                // If output exceeds Discord 2000 char limit, send as text attachment
                const buffer = Buffer.from(output, 'utf-8');
                const attachment = { attachment: buffer, name: 'cmd-output.txt' };

                if (initialMsg) {
                    await initialMsg.edit({
                        content: `💻 Command \`${commandToRun}\` completed in **${executionTime}ms** (Output attached as file due to length):`,
                        files: [attachment]
                    }).catch(() => {});
                } else {
                    await message.reply({
                        content: `💻 Command \`${commandToRun}\` completed in **${executionTime}ms** (Output attached as file due to length):`,
                        files: [attachment]
                    }).catch(() => {});
                }
            }
        });
    }
};
