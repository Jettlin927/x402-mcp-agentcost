# SEC EDGAR Financial Facts x402 MCP (`x402-mcp-sec-edgar`)

Pay-per-call **x402 v2** MCP & REST API on **Cloudflare Workers** providing zero-hallucination, accession-numbered US public company financial statements, recent SEC filings, and peer comparisons sourced directly from official **SEC EDGAR** (`sec.gov` / `data.sec.gov`) public APIs — with zero third-party data vendor keys.

## Tools & Pricing (Base Mainnet USDC, `eip155:8453`)

| Tool / REST Endpoint | Price | Description |
| :--- | :--- | :--- |
| `resolve_sec_ticker` | **FREE** | Resolve ticker or company name (e.g. `AAPL`, `NVDA`, `Microsoft`) to 10-digit CIK and canonical SEC EDGAR URLs |
| `get_sec_financial_snapshot` (`POST /api/sec-financial-snapshot`) | **$0.010 USDC** | Extract audited US-GAAP XBRL metrics (Revenue, Operating Income, Net Income, Diluted EPS, Operating Cash Flow, CapEx, FCF, Cash, Assets, Debt, Equity) + YoY growth, margins, and exact filing provenance (`accn`, `filed`, `form`, `fp`, `fy`) |
| `get_sec_recent_filings` (`POST /api/sec-recent-filings`) | **$0.005 USDC** | Retrieve recent SEC submissions (`10-K`, `10-Q`, `8-K`, `4`, etc.) with direct SEC Archives document URLs and company SIC/exchange metadata |
| `compare_sec_peers` (`POST /api/compare-sec-peers`) | **$0.015 USDC** | Side-by-side latest annual + recent period XBRL financial comparison across 2–5 US tickers |
| `get_sec_insider_trades` (`POST /api/sec-insider-trades`) | **$0.010 USDC** | Parse recent SEC Form 4 ownership XML filings into structured insider buys/sells, Rule 10b5-1 flags, USD values, and net open-market totals |
| `search_sec_filings` (`POST /api/sec-search-filings`) | **$0.008 USDC** | Full-text search across SEC EDGAR filings via EFTS with optional ticker/CIK, form, and date-range filters |
| `get_sec_filing_excerpt` (`POST /api/sec-filing-excerpt`) | **$0.012 USDC** | Fetch and strip HTML/iXBRL boilerplate from an SEC `8-K`, `10-K`, or `10-Q`, detect section headings, and return clean targeted text within a token-safe cap |

## Discovery Endpoints

- `GET /health`
- `GET /llms.txt`
- `GET /openapi.json`
- `GET /.well-known/mcp.json`
- `GET /.well-known/x402.json`
- `POST /mcp` (Streamable HTTP JSON-RPC 2.0)

## Local Development & Verification

```bash
npm run typecheck
npm test
npm run dev
```

## Deploy to Cloudflare Workers

```bash
npx wrangler secret put X402_PAY_TO
npm run deploy
```

> Uses `X-DEMO-MODE: true` for dry-run verification when `X402_ALLOW_DEMO=true`. Respects SEC EDGAR Fair Access with configurable `SEC_USER_AGENT` and in-isolate TTL caching.
