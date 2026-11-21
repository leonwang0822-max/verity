// Verity — live-awareness tools (search / fetch / time)
// Prefer free/cheap providers already configured via env; fall back to DuckDuckGo lite.

const DEFAULT_UA =
    'Mozilla/5.0 (compatible; VerityBot/1.0; +https://github.com/leonwang0822-max/verity)';

const TOOL_DEFS = [
    {
        name: 'get_current_time',
        description:
            'Get the current date and time. Defaults to Asia/Shanghai (Leon\'s timezone). Use for "what time is it", scheduling, or anchoring "today/now".',
        input_schema: {
            type: 'object',
            properties: {
                timezone: {
                    type: 'string',
                    description: 'IANA timezone, e.g. Asia/Shanghai, America/New_York, UTC. Defaults to Asia/Shanghai.',
                },
            },
            additionalProperties: false,
        },
    },
    {
        name: 'web_search',
        description:
            'Search the live web for current events, news, scores, prices, recent tech releases, or anything that may have changed. Prefer this over guessing from training data.',
        input_schema: {
            type: 'object',
            properties: {
                query: {
                    type: 'string',
                    description: 'Search query. Be specific; include year (e.g. 2026) when helpful.',
                },
                max_results: {
                    type: 'integer',
                    description: 'Max results to return (1-8). Default 5.',
                },
            },
            required: ['query'],
            additionalProperties: false,
        },
    },
    {
        name: 'fetch_url',
        description:
            'Fetch a public URL and return readable text (HTML stripped). Use after web_search when you need the page contents, or when the user pastes a link.',
        input_schema: {
            type: 'object',
            properties: {
                url: {
                    type: 'string',
                    description: 'Absolute http(s) URL to fetch.',
                },
                max_chars: {
                    type: 'integer',
                    description: 'Max characters of extracted text to return (default 6000).',
                },
            },
            required: ['url'],
            additionalProperties: false,
        },
    },
];

function openaiTools() {
    return TOOL_DEFS.map((t) => ({
        type: 'function',
        function: {
            name: t.name,
            description: t.description,
            parameters: t.input_schema,
        },
    }));
}

function anthropicTools() {
    return TOOL_DEFS.map((t) => ({
        name: t.name,
        description: t.description,
        input_schema: t.input_schema,
    }));
}

function clampInt(value, fallback, min, max) {
    const n = Number.parseInt(value, 10);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(Math.max(n, min), max);
}

function formatInZone(date, timeZone) {
    try {
        const parts = new Intl.DateTimeFormat('en-US', {
            timeZone,
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
            timeZoneName: 'short',
        }).formatToParts(date);
        const get = (type) => parts.find((p) => p.type === type)?.value || '';
        return {
            timezone: timeZone,
            iso: date.toISOString(),
            local: `${get('weekday')}, ${get('month')} ${get('day')}, ${get('year')} ${get('hour')}:${get('minute')}:${get('second')} ${get('timeZoneName')}`,
            year: get('year'),
        };
    } catch {
        return {
            timezone: 'UTC',
            iso: date.toISOString(),
            local: date.toISOString(),
            year: String(date.getUTCFullYear()),
            warning: `Invalid timezone "${timeZone}", fell back to UTC.`,
        };
    }
}

function toolGetCurrentTime(input = {}) {
    const timezone = String(input.timezone || 'Asia/Shanghai').trim() || 'Asia/Shanghai';
    const now = new Date();
    const shanghai = formatInZone(now, 'Asia/Shanghai');
    const requested = formatInZone(now, timezone);
    return JSON.stringify({
        ok: true,
        requested,
        asia_shanghai: shanghai,
        utc: now.toISOString(),
        note: 'Calendar context is 2026+. Prefer tools for live facts; do not invent a 2023/2024 cutoff.',
    });
}

async function fetchText(url, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs || 15000);
    try {
        const res = await fetch(url, {
            method: options.method || 'GET',
            headers: {
                'User-Agent': DEFAULT_UA,
                Accept: options.accept || 'text/html,application/json;q=0.9,*/*;q=0.8',
                ...(options.headers || {}),
            },
            signal: controller.signal,
            redirect: 'follow',
        });
        const body = await res.text();
        return { ok: res.ok, status: res.status, body, headers: res.headers };
    } finally {
        clearTimeout(timeout);
    }
}

function htmlToText(html) {
    return String(html || '')
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
        .replace(/<!--[\s\S]*?-->/g, ' ')
        .replace(/<(br|p|div|li|tr|h[1-6])\b[^>]*>/gi, '\n')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'")
        .replace(/\s+\n/g, '\n')
        .replace(/\n\s+/g, '\n')
        .replace(/[ \t]{2,}/g, ' ')
        .trim();
}

function decodeHtmlEntities(str) {
    return String(str || '')
        .replace(/&amp;/gi, '&')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'")
        .replace(/&nbsp;/gi, ' ');
}

function pickSearchProvider() {
    const forced = (process.env.SEARCH_PROVIDER || 'auto').toLowerCase().trim();
    const has = {
        brave: !!process.env.BRAVE_SEARCH_API_KEY,
        serper: !!process.env.SERPER_API_KEY,
        tavily: !!process.env.TAVILY_API_KEY,
    };
    if (forced !== 'auto') {
        if (forced === 'duckduckgo' || forced === 'ddg') return 'duckduckgo';
        if (has[forced]) return forced;
        return 'duckduckgo';
    }
    if (has.brave) return 'brave';
    if (has.serper) return 'serper';
    if (has.tavily) return 'tavily';
    return 'duckduckgo';
}

async function searchBrave(query, maxResults) {
    const key = process.env.BRAVE_SEARCH_API_KEY;
    const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${maxResults}`;
    const res = await fetchText(url, {
        accept: 'application/json',
        headers: { 'X-Subscription-Token': key, Accept: 'application/json' },
        timeoutMs: 12000,
    });
    if (!res.ok) throw new Error(`Brave search HTTP ${res.status}`);
    const data = JSON.parse(res.body);
    const results = (data.web?.results || []).slice(0, maxResults).map((r) => ({
        title: r.title,
        url: r.url,
        snippet: r.description || '',
    }));
    return { provider: 'brave', results };
}

async function searchSerper(query, maxResults) {
    const key = process.env.SERPER_API_KEY;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
        const res = await fetch('https://google.serper.dev/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-KEY': key,
                'User-Agent': DEFAULT_UA,
            },
            body: JSON.stringify({ q: query, num: maxResults }),
            signal: controller.signal,
        });
        const body = await res.text();
        if (!res.ok) throw new Error(`Serper HTTP ${res.status}`);
        const data = JSON.parse(body);
        const results = (data.organic || []).slice(0, maxResults).map((r) => ({
            title: r.title,
            url: r.link,
            snippet: r.snippet || '',
        }));
        return { provider: 'serper', results };
    } finally {
        clearTimeout(timeout);
    }
}

async function searchTavily(query, maxResults) {
    const key = process.env.TAVILY_API_KEY;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
        const res = await fetch('https://api.tavily.com/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'User-Agent': DEFAULT_UA },
            body: JSON.stringify({
                api_key: key,
                query,
                max_results: maxResults,
                search_depth: 'basic',
                include_answer: false,
            }),
            signal: controller.signal,
        });
        const body = await res.text();
        if (!res.ok) throw new Error(`Tavily HTTP ${res.status}`);
        const data = JSON.parse(body);
        const results = (data.results || []).slice(0, maxResults).map((r) => ({
            title: r.title,
            url: r.url,
            snippet: r.content || '',
        }));
        return { provider: 'tavily', results };
    } finally {
        clearTimeout(timeout);
    }
}

function parseRssItems(xml, maxResults) {
    const results = [];
    const itemRe = /<item>([\s\S]*?)<\/item>/gi;
    let match;
    while ((match = itemRe.exec(xml)) !== null && results.length < maxResults) {
        const block = match[1];
        const title = decodeHtmlEntities((block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/i) || block.match(/<title>(.*?)<\/title>/i) || [])[1] || '').trim();
        const link = decodeHtmlEntities((block.match(/<link><!\[CDATA\[(.*?)\]\]><\/link>/i) || block.match(/<link>(.*?)<\/link>/i) || [])[1] || '').trim();
        const snippet = decodeHtmlEntities(htmlToText(
            (block.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/i)
                || block.match(/<description>([\s\S]*?)<\/description>/i)
                || [])[1] || ''
        )).slice(0, 280);
        if (!title || !link) continue;
        if (/^https?:\/\/www\.bing\.com\/search/i.test(link)) continue;
        results.push({ title: title.slice(0, 160), url: link, snippet });
    }
    return results;
}

async function searchDuckDuckGoLite(query, maxResults) {
    const url = `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(query)}`;
    const res = await fetchText(url, {
        accept: 'text/html',
        headers: {
            'User-Agent': DEFAULT_UA,
            'Accept-Language': 'en-US,en;q=0.9',
        },
        timeoutMs: 12000,
    });
    // 202/challenge pages are common from datacenter IPs — treat as empty, not fatal
    if (!res.ok && res.status !== 202) throw new Error(`DuckDuckGo lite HTTP ${res.status}`);

    const results = [];
    const linkRe = /<a[^>]+rel="nofollow"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    let match;
    while ((match = linkRe.exec(res.body)) !== null && results.length < maxResults) {
        const href = decodeHtmlEntities(match[1]);
        const title = decodeHtmlEntities(htmlToText(match[2])).trim();
        if (!href || !title || href.includes('duckduckgo.com')) continue;
        const after = res.body.slice(match.index, match.index + 600);
        const snipMatch = after.match(/class="result-snippet"[^>]*>([\s\S]*?)<\/td>/i)
            || after.match(/class=['"]result-snippet['"][^>]*>([\s\S]*?)<\//i);
        const snippet = snipMatch ? decodeHtmlEntities(htmlToText(snipMatch[1])).slice(0, 280) : '';
        results.push({ title: title.slice(0, 160), url: href, snippet });
    }
    return results;
}

async function searchBingRss(query, maxResults) {
    const url = `https://www.bing.com/search?q=${encodeURIComponent(query)}&format=rss`;
    const res = await fetchText(url, {
        accept: 'application/rss+xml, application/xml, text/xml, */*',
        timeoutMs: 12000,
    });
    if (!res.ok) throw new Error(`Bing RSS HTTP ${res.status}`);
    return parseRssItems(res.body, maxResults);
}

async function searchGoogleNewsRss(query, maxResults) {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
    const res = await fetchText(url, {
        accept: 'application/rss+xml, application/xml, text/xml, */*',
        timeoutMs: 12000,
    });
    if (!res.ok) throw new Error(`Google News RSS HTTP ${res.status}`);
    return parseRssItems(res.body, maxResults);
}

async function searchWikipedia(query, maxResults) {
    const url = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=${maxResults}&namespace=0&format=json`;
    const res = await fetchText(url, { accept: 'application/json', timeoutMs: 10000 });
    if (!res.ok) throw new Error(`Wikipedia HTTP ${res.status}`);
    const data = JSON.parse(res.body);
    const titles = data[1] || [];
    const descs = data[2] || [];
    const links = data[3] || [];
    return titles.map((title, i) => ({
        title,
        url: links[i],
        snippet: descs[i] || '',
    })).filter((r) => r.url);
}

/**
 * License-safe free search stack used when no paid key is configured.
 * Tries DuckDuckGo lite, then Bing RSS + Google News RSS, then Wikipedia.
 */
async function searchFreeWeb(query, maxResults) {
    const providersTried = [];
    let results = [];

    try {
        const ddg = await searchDuckDuckGoLite(query, maxResults);
        providersTried.push('duckduckgo');
        if (ddg.length) results = ddg;
    } catch (err) {
        providersTried.push(`duckduckgo(error:${err.message})`);
    }

    if (results.length < maxResults) {
        try {
            const bing = await searchBingRss(query, maxResults);
            providersTried.push('bing_rss');
            results = dedupeResults([...results, ...bing], maxResults);
        } catch (err) {
            providersTried.push(`bing_rss(error:${err.message})`);
        }
    }

    if (results.length < Math.max(2, Math.ceil(maxResults / 2))) {
        try {
            const news = await searchGoogleNewsRss(query, maxResults);
            providersTried.push('google_news_rss');
            results = dedupeResults([...results, ...news], maxResults);
        } catch (err) {
            providersTried.push(`google_news_rss(error:${err.message})`);
        }
    }

    if (!results.length) {
        try {
            const wiki = await searchWikipedia(query, maxResults);
            providersTried.push('wikipedia');
            results = wiki;
        } catch (err) {
            providersTried.push(`wikipedia(error:${err.message})`);
        }
    }

    if (!results.length) {
        throw new Error(`Free search returned no results (tried: ${providersTried.join(', ')})`);
    }

    return {
        provider: providersTried.filter((p) => !p.includes('error:')).join('+') || 'free',
        results,
    };
}

function dedupeResults(items, maxResults) {
    const seen = new Set();
    const out = [];
    for (const item of items) {
        const key = String(item.url || '').split('#')[0].toLowerCase();
        if (!key || seen.has(key)) continue;
        seen.add(key);
        out.push(item);
        if (out.length >= maxResults) break;
    }
    return out;
}

async function toolWebSearch(input = {}) {
    const query = String(input.query || '').trim();
    if (!query) {
        return JSON.stringify({ ok: false, error: 'query is required' });
    }
    const maxResults = clampInt(input.max_results, 5, 1, 8);
    const provider = pickSearchProvider();
    try {
        let payload;
        if (provider === 'brave') payload = await searchBrave(query, maxResults);
        else if (provider === 'serper') payload = await searchSerper(query, maxResults);
        else if (provider === 'tavily') payload = await searchTavily(query, maxResults);
        else payload = await searchFreeWeb(query, maxResults);

        if ((!payload.results || !payload.results.length) && provider !== 'duckduckgo') {
            payload = await searchFreeWeb(query, maxResults);
        }

        return JSON.stringify({
            ok: true,
            query,
            provider: payload.provider,
            result_count: payload.results.length,
            results: payload.results,
            retrieved_at: new Date().toISOString(),
        });
    } catch (err) {
        // Last-resort free stack if a keyed provider failed
        if (provider !== 'duckduckgo') {
            try {
                const fallback = await searchFreeWeb(query, maxResults);
                return JSON.stringify({
                    ok: true,
                    query,
                    provider: fallback.provider,
                    result_count: fallback.results.length,
                    results: fallback.results,
                    retrieved_at: new Date().toISOString(),
                    note: `Primary provider (${provider}) failed: ${err.message}`,
                });
            } catch (err2) {
                return JSON.stringify({
                    ok: false,
                    query,
                    error: err2.message || String(err2),
                    primary_error: err.message || String(err),
                });
            }
        }
        return JSON.stringify({ ok: false, query, error: err.message || String(err) });
    }
}

function isPrivateHost(hostname) {
    const host = String(hostname || '').toLowerCase();
    if (!host) return true;
    if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) return true;
    if (host === '0.0.0.0' || host === '::1' || host === '[::1]') return true;
    // Basic private IP checks
    if (/^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host) || /^169\.254\./.test(host)) return true;
    if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return true;
    return false;
}

async function toolFetchUrl(input = {}) {
    const raw = String(input.url || '').trim();
    if (!raw) return JSON.stringify({ ok: false, error: 'url is required' });

    let parsed;
    try {
        parsed = new URL(raw);
    } catch {
        return JSON.stringify({ ok: false, error: 'Invalid URL' });
    }
    if (!['http:', 'https:'].includes(parsed.protocol)) {
        return JSON.stringify({ ok: false, error: 'Only http/https URLs are allowed' });
    }
    if (isPrivateHost(parsed.hostname)) {
        return JSON.stringify({ ok: false, error: 'Refusing to fetch private/local addresses' });
    }

    const maxChars = clampInt(input.max_chars, 6000, 500, 12000);
    try {
        const res = await fetchText(parsed.toString(), { timeoutMs: 15000 });
        const ctype = (res.headers.get('content-type') || '').toLowerCase();
        let text;
        if (ctype.includes('application/json') || ctype.includes('text/plain')) {
            text = res.body;
        } else {
            text = htmlToText(res.body);
        }
        text = text.slice(0, maxChars);
        return JSON.stringify({
            ok: res.ok,
            status: res.status,
            url: parsed.toString(),
            content_type: ctype,
            text,
            truncated: (res.body || '').length > maxChars,
            retrieved_at: new Date().toISOString(),
        });
    } catch (err) {
        return JSON.stringify({ ok: false, url: parsed.toString(), error: err.message || String(err) });
    }
}

async function executeTool(name, input) {
    switch (name) {
        case 'get_current_time':
            return toolGetCurrentTime(input);
        case 'web_search':
            return toolWebSearch(input);
        case 'fetch_url':
            return toolFetchUrl(input);
        default:
            return JSON.stringify({ ok: false, error: `Unknown tool: ${name}` });
    }
}

/**
 * Temporal awareness block injected into the live system prompt each request.
 */
function buildTemporalAwarenessBlock(now = new Date()) {
    const shanghai = formatInZone(now, 'Asia/Shanghai');
    const utc = now.toISOString();
    return `TEMPORAL AWARENESS & LIVE FACTS (ALWAYS FOLLOW):
- It is currently calendar year ${shanghai.year} (context: mid-2020s / 2026 era). You are NOT stuck behind a 2023 or 2024 knowledge cutoff wall.
- Approximate now (UTC): ${utc}
- Leon's local timezone Asia/Shanghai: ${shanghai.local}
- For news, "what's happening now", prices, sports scores, election/results, recent tech releases, or anything that may have changed: CALL TOOLS (web_search / fetch_url / get_current_time) before answering. Do not invent current headlines or live numbers.
- Never tell users you have a hard knowledge cutoff in 2023/2024. If a fact may be stale, look it up with tools, then answer.
- Never name upstream AI model vendors or APIs in user-facing replies (no OpenAI, Anthropic, Claude, GPT, Gemini, etc.). You are Verity.
- When tools return results, briefly cite what you found in natural language (titles/sites) without dumping raw JSON.`;
}

module.exports = {
    openaiTools,
    anthropicTools,
    executeTool,
    buildTemporalAwarenessBlock,
    TOOL_DEFS,
};
