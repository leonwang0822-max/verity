// LumeBot — Role Sync System (Old Server 1529735375306883194 -> New Server 1544153685523955804)
const config = require('../config');

const OLD_GUILD_ID = '1529735375306883194';
const SUB_BOT_TOKEN = process.env.SUB_BOT_TOKEN || '';

// Exact Old Role ID -> New Role ID mapping
const ROLE_MAP = {
    '1529737281483706378': '1544153686022951009', // Lume
    '1529774749201469493': '1544153686022951008', // Kanaloa
    '1529737620568146042': '1544153686022951007', // Co-Owner
    '1532975511192604722': '1544153686022951006', // Kanaloa #2 (for icon)
    '1531896115052417115': '1544153686022951005', // VerityBot Manager
    '1529738423106011250': '1544153686022951004', // Admin
    '1531893528077140038': '1544153686022951003', // VerityBot Access
    '1529741195616587846': '1544153686022951002', // Moderator
    '1533039130479689749': '1544153686010363923', // Trial Moderators
    '1543469237128011886': '1544153686010363922', // Gay
    '1533616637050228786': '1544153686010363921', // Minecraft Developer
    '1531138325908291605': '1544153686010363920', // Big content creators
    '1531138229196161034': '1544153686010363919', // Content creator
    '1532946933222604901': '1544156502829437059', // SERVER BOOSTER
    '1531104134902841627': '1544153686010363918', // Big Pluh
    '1531104868641673356': '1544153686010363917', // Friends
    '1539037510326296677': '1544153686010363916', // Artist
    '1531137830313791488': '1544153686010363915', // furry :3
    '1531894822867308745': '1544153686010363914', // Level 100
    '1531894821571133602': '1544153685985071113', // Level 50
    '1531894729296445590': '1544153685985071112', // Level 30
    '1531894574002208878': '1544153685985071111', // Level 10
    '1531894534965952512': '1544153685985071110', // Level 5
    '1531894454796161075': '1544153685985071109', // Level 1
    '1539036597951926292': '1544153685985071108', // pretty pretty princess
    '1529774896396238989': '1544153685985071107', // Member
    '1531910466597687447': '1544153685985071106', // ticket ping
    '1532024984267132970': '1544153685985071105', // Muted
    '1529774987970478101': '1544153685985071104', // Bots
    '1531110191146209360': '1544153685523955811', // 18+
    '1531110238688776306': '1544153685523955810', // 18-
    '1538034515266773022': '1544153685523955809', // Stupid Stuff
    '1531109397059735692': '1544153685523955808', // Chat Revive
    '1531109223000182974': '1544153685523955807', // Announcements
    '1529775131818197103': '1544153685523955806', // Stream Notified
    '1532459203933896984': '1544153685523955805', // Femboy
};

async function fetchOldMemberRoles(userId) {
    try {
        const response = await fetch(`https://discord.com/api/v10/guilds/${OLD_GUILD_ID}/members/${userId}`, {
            headers: {
                'Authorization': `Bot ${SUB_BOT_TOKEN}`,
                'User-Agent': 'DiscordBot'
            }
        });
        if (!response.ok) return null;
        const data = await response.json();
        return data.roles || [];
    } catch (e) {
        console.error(`[ROLE SYNC] Failed to fetch old roles for ${userId}:`, e.message);
        return null;
    }
}

async function syncMemberRoles(member) {
    if (!member || member.user.bot) return [];
    const oldRoles = await fetchOldMemberRoles(member.id);
    if (!oldRoles || oldRoles.length === 0) return [];

    const newRoleIdsToAdd = [];
    for (const oldRoleId of oldRoles) {
        const targetNewRoleId = ROLE_MAP[oldRoleId];
        if (targetNewRoleId && !member.roles.cache.has(targetNewRoleId)) {
            newRoleIdsToAdd.push(targetNewRoleId);
        }
    }

    if (newRoleIdsToAdd.length > 0) {
        try {
            await member.roles.add(newRoleIdsToAdd, 'Auto-sync roles from previous server');
            console.log(`[ROLE SYNC] Added ${newRoleIdsToAdd.length} roles to ${member.user.tag}`);
        } catch (e) {
            console.error(`[ROLE SYNC] Failed to add roles to ${member.user.tag}:`, e.message);
        }
    }
    return newRoleIdsToAdd;
}

module.exports = {
    ROLE_MAP,
    fetchOldMemberRoles,
    syncMemberRoles,
};
