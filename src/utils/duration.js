// LumeBot — Time Duration Parser
// Parses human time strings like "1s", "100s", "1h", "1hour", "1day", "1d", "30m", "5min"

function parseDuration(input) {
    if (!input || typeof input !== 'string') return null;
    const str = input.trim().toLowerCase();

    // Match numbers followed by unit string
    const match = str.match(/^(\d+)\s*([a-z]+)?$/);
    if (!match) return null;

    const val = parseInt(match[1], 10);
    if (isNaN(val) || val <= 0) return null;

    const unit = match[2] || 's'; // Default unit is seconds if omitted

    switch (unit) {
        case 's':
        case 'sec':
        case 'secs':
        case 'second':
        case 'seconds':
            return val * 1000;

        case 'm':
        case 'min':
        case 'mins':
        case 'minute':
        case 'minutes':
            return val * 60 * 1000;

        case 'h':
        case 'hr':
        case 'hrs':
        case 'hour':
        case 'hours':
            return val * 3600 * 1000;

        case 'd':
        case 'day':
        case 'days':
            return val * 86400 * 1000;

        case 'w':
        case 'week':
        case 'weeks':
            return val * 7 * 86400 * 1000;

        default:
            return null;
    }
}

function formatDuration(ms) {
    if (!ms || ms <= 0) return '0 seconds';
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
}

function extractTargetDurationReason(args) {
    if (!args || args.length === 0) return { userQuery: null, durationMs: null, reason: 'No reason provided' };
    const userQuery = args[0];

    if (args.length === 1) {
        return { userQuery, durationMs: null, reason: 'No reason provided' };
    }

    // Check if the last argument is a duration string (e.g. ?mute leonw reason text 1m)
    const lastArg = args[args.length - 1];
    const lastParsed = parseDuration(lastArg);
    if (lastParsed) {
        const reasonStr = args.slice(1, -1).join(' ').trim();
        return { userQuery, durationMs: lastParsed, reason: reasonStr || 'No reason provided' };
    }

    // Check if the second argument is a duration string (e.g. ?mute leonw 1m reason text)
    const secondArg = args[1];
    const secondParsed = parseDuration(secondArg);
    if (secondParsed) {
        const reasonStr = args.slice(2).join(' ').trim();
        return { userQuery, durationMs: secondParsed, reason: reasonStr || 'No reason provided' };
    }

    // No duration specified
    const reasonStr = args.slice(1).join(' ').trim();
    return { userQuery, durationMs: null, reason: reasonStr || 'No reason provided' };
}

module.exports = { parseDuration, formatDuration, extractTargetDurationReason };
