// LumeBot — Time/Duration Parsing Utilities

// Parse duration strings like "1h", "30m", "1d", "1h30m"
function parseDuration(str) {
    if (!str) return null;

    const regex = /(\d+)\s*(s|sec|second|seconds|m|min|minute|minutes|h|hr|hour|hours|d|day|days|w|week|weeks)/gi;
    let totalMs = 0;
    let match;

    while ((match = regex.exec(str)) !== null) {
        const value = parseInt(match[1]);
        const unit = match[2].toLowerCase();

        switch (unit) {
            case 's': case 'sec': case 'second': case 'seconds':
                totalMs += value * 1000; break;
            case 'm': case 'min': case 'minute': case 'minutes':
                totalMs += value * 60 * 1000; break;
            case 'h': case 'hr': case 'hour': case 'hours':
                totalMs += value * 60 * 60 * 1000; break;
            case 'd': case 'day': case 'days':
                totalMs += value * 24 * 60 * 60 * 1000; break;
            case 'w': case 'week': case 'weeks':
                totalMs += value * 7 * 24 * 60 * 60 * 1000; break;
        }
    }

    return totalMs > 0 ? totalMs : null;
}

// Format milliseconds into human-readable string
function formatDuration(ms) {
    if (!ms || ms < 0) return 'Unknown';

    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);

    const parts = [];
    if (weeks > 0) parts.push(`${weeks}w`);
    if (days % 7 > 0) parts.push(`${days % 7}d`);
    if (hours % 24 > 0) parts.push(`${hours % 24}h`);
    if (minutes % 60 > 0) parts.push(`${minutes % 60}m`);
    if (seconds % 60 > 0 && parts.length === 0) parts.push(`${seconds % 60}s`);

    return parts.join(' ') || '0s';
}

// Format a timestamp into a Discord timestamp
function discordTimestamp(date, style = 'R') {
    const timestamp = Math.floor((date instanceof Date ? date.getTime() : date) / 1000);
    return `<t:${timestamp}:${style}>`;
}

module.exports = {
    parseDuration,
    formatDuration,
    discordTimestamp,
};
