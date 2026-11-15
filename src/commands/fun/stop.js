const { SlashCommandBuilder } = require('discord.js');
const { stopMusic } = require('../../systems/voice');
const { errorEmbed } = require('../../utils/embeds');

const VC_ROLE_ID = '1531896115052417115';
const ACCESS_ROLE_2 = '1529737620568146042';
const DEV_USER_ID = '1488316093964746872';

function canUseVoiceControls(member) {
    if (!member) return false;
    if (member.id === DEV_USER_ID) return true;
    if (member.roles.cache.has(VC_ROLE_ID)) return true;
    if (member.roles.cache.has(ACCESS_ROLE_2)) return true;
    if (member.permissions.has('Administrator') || member.permissions.has('ManageGuild')) return true;
    return false;
}

module.exports = {
    name: 'stop',
    aliases: ['stopmusic', 'stfu'],
    description: 'Stop the currently playing music in voice channel',
    category: 'fun',
    slashData: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Stop the currently playing music in voice channel'),

    async execute(message, args, client) {
        if (!canUseVoiceControls(message.member)) {
            return message.reply({ embeds: [errorEmbed('You do not have permission to use this command.')] }).catch(() => {});
        }

        const ok = stopMusic(message.guild.id);
        if (ok) {
            return message.reply('⏹️ Stopped the currently playing music!').catch(() => {});
        } else {
            return message.reply({ embeds: [errorEmbed('Nothing is currently playing in the voice channel.')] }).catch(() => {});
        }
    },

    async slashExecute(interaction, client) {
        if (!canUseVoiceControls(interaction.member)) {
            return interaction.reply({ embeds: [errorEmbed('You do not have permission to use this command.')], ephemeral: true }).catch(() => {});
        }

        const ok = stopMusic(interaction.guild.id);
        if (ok) {
            return interaction.reply({ content: '⏹️ Stopped the currently playing music!' }).catch(() => {});
        } else {
            return interaction.reply({ embeds: [errorEmbed('Nothing is currently playing in the voice channel.')], ephemeral: true }).catch(() => {});
        }
    }
};
