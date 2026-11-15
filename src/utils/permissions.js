// Verity — Permission Checking Utilities
const config = require('../config');
const db = require('../database/db');

const DEV_USER_ID = '1488316093964746872';

// Permission levels
const LEVELS = {
    EVERYONE: 0,
    ADMIN: 1,    // Staff / Bot Access Role
    MANAGER: 2,  // Bot Manager Role
    OWNER: 3,    // Guild Owner / Dev
};

function getPermissionLevel(member) {
    if (!member) return LEVELS.EVERYONE;

    // BOT OWNER / DEVELOPER ALWAYS HAS FULL ACCESS (NO ROLES NEEDED)
    if (member.id === DEV_USER_ID) return LEVELS.OWNER;
    if (member.guild && member.id === member.guild.ownerId) return LEVELS.OWNER;

    if (!member.guild) return LEVELS.EVERYONE;

    const settings = db.getSettings();

    // 1. Manager Check
    if (
        member.permissions?.has('Administrator') ||
        (settings.managerRoleId && member.roles.cache.has(settings.managerRoleId)) ||
        member.roles.cache.has(config.MANAGER_ROLE_ID)
    ) {
        return LEVELS.MANAGER;
    }

    // 2. Staff / Access Role Check
    if (
        member.permissions?.has('ManageGuild') ||
        (settings.accessRoleId && member.roles.cache.has(settings.accessRoleId)) ||
        member.roles.cache.has(config.ADMIN_ROLE_ID)
    ) {
        return LEVELS.ADMIN;
    }

    return LEVELS.EVERYONE;
}

function isStaff(member) {
    if (!member) return false;
    if (member.id === DEV_USER_ID) return true;
    if (member.guild && member.id === member.guild.ownerId) return true;
    if (
        member.permissions?.has('ManageMessages') ||
        member.permissions?.has('ManageGuild') ||
        member.permissions?.has('Administrator') ||
        member.permissions?.has('KickMembers') ||
        member.permissions?.has('BanMembers') ||
        member.permissions?.has('MuteMembers') ||
        member.permissions?.has('DeafenMembers')
    ) {
        return true;
    }
    return getPermissionLevel(member) >= LEVELS.ADMIN;
}

function hasAdmin(member) {
    return isStaff(member);
}

function hasManager(member) {
    if (member && member.id === DEV_USER_ID) return true;
    return getPermissionLevel(member) >= LEVELS.MANAGER;
}

function isOwner(member) {
    if (member && member.id === DEV_USER_ID) return true;
    return getPermissionLevel(member) >= LEVELS.OWNER;
}

function canManageRole(member, role) {
    if (member && member.id === DEV_USER_ID) return true;
    if (member.guild && member.id === member.guild.ownerId) return true;
    return member.roles.highest.position > role.position;
}

function canModerate(executor, target) {
    if (target && target.id === DEV_USER_ID) return false;
    if (executor && executor.id === DEV_USER_ID) return true;
    if (executor.guild && executor.id === executor.guild.ownerId) return true;
    if (target.guild && target.id === target.guild.ownerId) return false;
    return executor.roles.highest.position > target.roles.highest.position;
}

module.exports = {
    DEV_USER_ID,
    LEVELS,
    getPermissionLevel,
    hasAdmin,
    hasManager,
    isOwner,
    isStaff,
    canManageRole,
    canModerate,
};
