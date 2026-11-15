// LumeBot — Flexible Member & User Resolver
// Resolves members/users by: Mention, User ID, Username, Display Name/Nickname, or Tag

async function resolveMember(guild, query) {
    if (!guild || !query) return null;

    const clean = query.replace(/[<@!>]/g, '').trim();

    // 1. By ID fetch or cache lookup
    if (/^\d{17,20}$/.test(clean)) {
        const memberById = guild.members.cache.get(clean) || await guild.members.fetch(clean).catch(() => null);
        if (memberById) return memberById;
    }

    // Ensure member cache is loaded for string matching
    if (guild.members.cache.size < guild.memberCount) {
        await guild.members.fetch().catch(() => {});
    }

    const lower = query.toLowerCase().trim();

    // 2. Exact match on username, tag, or nickname
    let found = guild.members.cache.find(m =>
        m.user.username.toLowerCase() === lower ||
        m.user.tag.toLowerCase() === lower ||
        (m.nickname && m.nickname.toLowerCase() === lower) ||
        m.displayName.toLowerCase() === lower
    );
    if (found) return found;

    // 3. Partial match (starts with query)
    found = guild.members.cache.find(m =>
        m.user.username.toLowerCase().startsWith(lower) ||
        (m.nickname && m.nickname.toLowerCase().startsWith(lower)) ||
        m.displayName.toLowerCase().startsWith(lower)
    );
    if (found) return found;

    // 4. Partial match (includes query)
    found = guild.members.cache.find(m =>
        m.user.username.toLowerCase().includes(lower) ||
        (m.nickname && m.nickname.toLowerCase().includes(lower)) ||
        m.displayName.toLowerCase().includes(lower)
    );

    return found || null;
}

async function resolveUser(client, guild, query) {
    const member = await resolveMember(guild, query);
    if (member) return member.user;

    const clean = query ? query.replace(/[<@!>]/g, '').trim() : '';
    if (/^\d{17,20}$/.test(clean)) {
        const userById = await client.users.fetch(clean).catch(() => null);
        if (userById) return userById;
    }

    return null;
}

module.exports = {
    resolveMember,
    resolveUser,
};
