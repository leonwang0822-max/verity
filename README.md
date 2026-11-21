# Verity

Discord bot for Lume's Realm. Copy `.env.example` to `.env` and fill in your own bot token and AI settings before starting.

```
npm install
npm start
```

The music sub-bot reads `SUB_BOT_TOKEN`. Nothing in this repo includes live keys.

## Live awareness (2026+)

Verity’s chat path can call tools for current facts:

- `get_current_time` — date/time (defaults to `Asia/Shanghai`)
- `web_search` — live web search
- `fetch_url` — fetch a public URL as readable text

Search provider order when `SEARCH_PROVIDER=auto`: Brave → Serper → Tavily → free stack (DuckDuckGo lite, then Bing RSS + Google News RSS, then Wikipedia). Set any of `BRAVE_SEARCH_API_KEY`, `SERPER_API_KEY`, or `TAVILY_API_KEY` if you want a keyed provider.

Production on Leon’s VPS lives at `/opt/verity-bot` (MCSManager instance `verity001bot…`). After merging a deploy, copy/pull the updated files there and restart via MCSManager (or `systemctl restart verity-bot` if that unit is wired). Do not put tokens in client bundles.
