# x402-mcp-agentcost

Standalone **Pay-Per-Call MCP Server** built for **Cloudflare Workers** implementing the **x402 v2 (`HTTP 402 Payment Required`)** machine-to-machine micropayment protocol over Base USDC.

- **Web Companion UI**: [AgentCostLab](https://jettlin927.github.io/agentcostlab/) (`Jettlin927/agentcostlab`)
- **Transport**: Streamable HTTP MCP (JSON-RPC 2.0 at `POST /mcp`)
- **Discovery**: `GET /.well-known/mcp.json` & `GET /mcp`
- **Payments**: `x402` v2 (`PAYMENT-REQUIRED`, `PAYMENT-SIGNATURE`, `PAYMENT-RESPONSE` headers) + Facilitator `/verify` & `/settle`

## Tool Pricing

| Tool | Price | Purpose |
| :--- | :---: | :--- |
| `list_models_pricing` | **FREE** | Discovery: 15 models with Nov-2026 pricing, AA Intelligence & SWE-bench scores |
| `recommend_pareto_route` | **$0.005 USDC** | Pareto-optimal model + Hybrid Planner/Worker routing for a workload & budget |
| `simulate_agent_cost` | **$0.005 USDC** | Full $O(N^2)$ multi-turn loop simulation with caching, retries & long-context step-ups |
| `audit_prompt_cache_tax` | **$0.010 USDC** | Audit `CLAUDE.md` / `AGENTS.md` / `mcp.json` for token tax, secrets & cache-busters |

## Local Dev & Test

```bash
npm install
npm test
npm run typecheck
npm run dev
```

### Quick `curl` Verification (Local or Deployed)

```bash
# 1. Free discovery
curl -s http://localhost:8787/.well-known/mcp.json

# 2. Unpaid call -> HTTP 402 Payment Required + PAYMENT-REQUIRED header
curl -i -X POST http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"recommend_pareto_route","arguments":{"turns":24}}}'

# 3. Demo sandbox dry-run (when X402_ALLOW_DEMO=true)
curl -s -X POST http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -H "X-DEMO-MODE: true" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"recommend_pareto_route","arguments":{"turns":24}}}'
```

## Deploy to Cloudflare Workers

```bash
# 1. Authenticate Wrangler
npx wrangler login

# 2. Set your Base USDC receiving wallet address (0x...)
npx wrangler secret put X402_PAY_TO

# 3. Deploy to global edge
npm run deploy
```

> To disable demo bypass in production, set `"X402_ALLOW_DEMO": "false"` in `wrangler.jsonc`.
