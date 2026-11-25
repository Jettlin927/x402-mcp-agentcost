import {
  comparePeers,
  get13fHoldings,
  getFinancialSnapshot,
  getInsiderTrades,
  getRecentFilings,
  getSecFilingExcerpt,
  resolveCompany,
  searchSecFilings,
  type EdgarEnv,
} from './edgar';
import {
  buildPaymentChallenge,
  buildPaymentReceiptHeader,
  create402Response,
  verifyAndSettleX402,
  type X402Env,
} from './x402';

export interface WorkerEnv extends X402Env, EdgarEnv {}

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id?: string | number | null;
  method: string;
  params?: Record<string, unknown>;
}

interface McpToolDef {
  name: string;
  description: string;
  priceUsd: number;
  inputSchema: Record<string, unknown>;
}

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'Content-Type, Authorization, PAYMENT-SIGNATURE, X-PAYMENT, X-DEMO-MODE, Mcp-Session-Id',
  'Access-Control-Expose-Headers': 'PAYMENT-REQUIRED, PAYMENT-RESPONSE',
};

export const MCP_TOOLS: McpToolDef[] = [
  {
    name: 'resolve_sec_ticker',
    priceUsd: 0,
    description:
      '[FREE] Resolve a US public company ticker, company name, or CIK to its 10-digit SEC CIK and canonical EDGAR URLs.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Ticker symbol (e.g. AAPL), company name (e.g. NVIDIA), or CIK',
        },
        limit: { type: 'number', default: 5, description: 'Max search matches (1-20)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_sec_financial_snapshot',
    priceUsd: 0.01,
    description:
      '[x402: $0.010 USDC] Fetch audited SEC EDGAR US-GAAP XBRL financial metrics (Revenue, Operating Income, Net Income, Diluted EPS, OCF, CapEx, Free Cash Flow, Cash, Assets, Debt, Equity) with YoY growth, margins, and exact accession numbers.',
    inputSchema: {
      type: 'object',
      properties: {
        tickerOrCik: { type: 'string', description: 'US ticker (e.g. AAPL) or 10-digit CIK' },
        periodType: {
          type: 'string',
          enum: ['annual', 'quarterly'],
          default: 'annual',
        },
        periods: { type: 'number', default: 4, description: 'Number of periods (1-12)' },
      },
      required: ['tickerOrCik'],
    },
  },
  {
    name: 'get_sec_recent_filings',
    priceUsd: 0.005,
    description:
      '[x402: $0.005 USDC] Retrieve recent SEC EDGAR submissions (10-K, 10-Q, 8-K, Form 4, etc.) with direct SEC Archives document URLs and company SIC/exchange metadata.',
    inputSchema: {
      type: 'object',
      properties: {
        tickerOrCik: { type: 'string', description: 'US ticker (e.g. MSFT) or CIK' },
        forms: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional form filter, e.g. ["10-K", "10-Q", "8-K"]',
        },
        limit: { type: 'number', default: 15, description: 'Max filings to return (1-50)' },
      },
      required: ['tickerOrCik'],
    },
  },
  {
    name: 'compare_sec_peers',
    priceUsd: 0.015,
    description:
      '[x402: $0.015 USDC] Compare 2 to 5 US public companies side-by-side on latest SEC XBRL Revenue, YoY growth, Operating/Net/FCF margins, Cash, Debt-to-Equity, and filing accessions.',
    inputSchema: {
      type: 'object',
      properties: {
        tickers: {
          type: 'array',
          items: { type: 'string' },
          description: '2 to 5 US tickers or CIKs, e.g. ["AAPL", "MSFT", "NVDA"]',
        },
        periodType: {
          type: 'string',
          enum: ['annual', 'quarterly'],
          default: 'annual',
        },
      },
      required: ['tickers'],
    },
  },
  {
    name: 'get_sec_insider_trades',
    priceUsd: 0.01,
    description:
      '[x402: $0.010 USDC] Parse recent SEC Form 4 insider trading XML filings (CEO/CFO/Director/10% Owner buys & sells, Rule 10b5-1 flags, share prices, USD totals, and net open-market buy/sell summary).',
    inputSchema: {
      type: 'object',
      properties: {
        tickerOrCik: { type: 'string', description: 'US ticker (e.g. NVDA) or 10-digit CIK' },
        limit: { type: 'number', default: 5, description: 'Max recent Form 4 filings to parse (1-10)' },
      },
      required: ['tickerOrCik'],
    },
  },
  {
    name: 'search_sec_filings',
    priceUsd: 0.008,
    description:
      '[x402: $0.008 USDC] Full-text search across SEC EDGAR filings via EFTS (10-K, 10-Q, 8-K, Form 4, etc.) with optional ticker/CIK, form, and date-range filters.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Full-text query, e.g. "\\"material weakness\\"" or "Blackwell"',
        },
        tickerOrCik: { type: 'string', description: 'Optional US ticker or CIK filter' },
        forms: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional form filter, e.g. ["10-K", "10-Q", "8-K"]',
        },
        startDate: { type: 'string', description: 'Optional start date YYYY-MM-DD' },
        endDate: { type: 'string', description: 'Optional end date YYYY-MM-DD' },
        limit: { type: 'number', default: 10, description: 'Max hits to return (1-20)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_sec_filing_excerpt',
    priceUsd: 0.012,
    description:
      '[x402: $0.012 USDC] Fetch and strip HTML/iXBRL boilerplate from an SEC 8-K, 10-K, or 10-Q filing, detect Item headings, and extract clean section/keyword text within a token-safe character budget.',
    inputSchema: {
      type: 'object',
      properties: {
        tickerOrCik: { type: 'string', description: 'US ticker (e.g. AAPL) or 10-digit CIK' },
        accessionNumber: {
          type: 'string',
          description: 'Optional exact accession number (e.g. 0001140361-26-042798); defaults to latest matching form',
        },
        form: {
          type: 'string',
          default: '8-K',
          description: 'Form type when accessionNumber is omitted (e.g. 8-K, 10-K, 10-Q)',
        },
        sectionOrQuery: {
          type: 'string',
          description: 'Optional section heading or keyword to jump to (e.g. "Item 2.02", "Item 8.01", "Risk Factors")',
        },
        maxChars: {
          type: 'number',
          default: 12000,
          description: 'Max plain-text characters to return (500-30000)',
        },
      },
      required: ['tickerOrCik'],
    },
  },
  {
    name: 'get_sec_13f_holdings',
    priceUsd: 0.012,
    description:
      '[x402: $0.012 USDC] Parse an institutional investment manager Form 13F-HR Information Table XML (e.g. Berkshire Hathaway, Bridgewater, Citadel, or 10-digit CIK), consolidating sub-account CUSIPs into portfolio weights, USD values, shares, and PUT/CALL flags.',
    inputSchema: {
      type: 'object',
      properties: {
        managerOrCik: {
          type: 'string',
          description: 'Institutional manager name (e.g. "Berkshire Hathaway", "Bridgewater Associates"), ticker (e.g. BRK-B), or 10-digit CIK (e.g. 0001067983)',
        },
        accessionNumber: {
          type: 'string',
          description: 'Optional exact 13F-HR accession number; defaults to latest 13F-HR filing',
        },
        issuerQuery: {
          type: 'string',
          description: 'Optional issuer name or CUSIP substring filter (e.g. "APPLE" or "037833100")',
        },
        limit: {
          type: 'number',
          default: 25,
          description: 'Max consolidated holdings to return sorted by USD value desc (1-100)',
        },
      },
      required: ['managerOrCik'],
    },
  },
];

const TOOL_EXAMPLES: Record<
  string,
  { input: Record<string, unknown>; output: Record<string, unknown> }
> = {
  get_sec_financial_snapshot: {
    input: { tickerOrCik: 'AAPL', periodType: 'annual', periods: 4 },
    output: {
      company: { cik: '0000320193', ticker: 'AAPL', name: 'Apple Inc.' },
      latestPeriodEnd: '2026-09-26',
      latestSummary: { revenueUsd: 478834000000, netMarginPct: 26.4 },
    },
  },
  get_sec_recent_filings: {
    input: { tickerOrCik: 'AAPL', forms: ['10-K', '10-Q', '8-K'], limit: 10 },
    output: {
      company: { cik: '0000320193', name: 'Apple Inc.', sic: '3571' },
      filings: [{ form: '10-K', filingDate: '2026-11-03', accessionNumber: '0000320193-26-000026' }],
    },
  },
  compare_sec_peers: {
    input: { tickers: ['AAPL', 'MSFT', 'NVDA'], periodType: 'annual' },
    output: {
      periodType: 'annual',
      count: 3,
      peers: [{ ticker: 'AAPL', revenueUsd: 478834000000, operatingMarginPct: 31.2 }],
    },
  },
  get_sec_insider_trades: {
    input: { tickerOrCik: 'NVDA', limit: 5 },
    output: {
      company: { cik: '0001045810', ticker: 'NVDA', name: 'NVIDIA CORP' },
      filingsScanned: 5,
      summary: { totalTransactions: 4, netOpenMarketUsd: -1250000 },
    },
  },
  search_sec_filings: {
    input: { query: '"Blackwell"', tickerOrCik: 'NVDA', forms: ['10-K', '10-Q'], limit: 5 },
    output: {
      query: '"Blackwell"',
      totalHits: 7,
      hits: [{ form: '10-Q', fileDate: '2026-08-26', accessionNumber: '0001045810-26-000075' }],
    },
  },
  get_sec_filing_excerpt: {
    input: { tickerOrCik: 'AAPL', form: '8-K', sectionOrQuery: 'Item 8.01', maxChars: 8000 },
    output: {
      company: { cik: '0000320193', ticker: 'AAPL', name: 'Apple Inc.' },
      filing: { form: '8-K', accessionNumber: '0001140361-26-042798' },
      extraction: { matchedSection: 'Item 8.01 Other Events', returnedChars: 1420 },
    },
  },
  get_sec_13f_holdings: {
    input: { managerOrCik: '0001067983', limit: 10 },
    output: {
      manager: { cik: '0001067983', name: 'BERKSHIRE HATHAWAY INC' },
      filing: { form: '13F-HR', reportDate: '2026-09-30', accessionNumber: '0001193125-26-463399' },
      summary: { totalValueUsd: 285000000000, uniquePositions: 41 },
    },
  },
};

const REST_TOOL_ROUTES: Record<string, string> = {
  '/api/sec-financial-snapshot': 'get_sec_financial_snapshot',
  '/api/sec-recent-filings': 'get_sec_recent_filings',
  '/api/compare-sec-peers': 'compare_sec_peers',
  '/api/sec-insider-trades': 'get_sec_insider_trades',
  '/api/sec-search-filings': 'search_sec_filings',
  '/api/sec-filing-excerpt': 'get_sec_filing_excerpt',
  '/api/sec-13f-holdings': 'get_sec_13f_holdings',
};

function jsonRpcResult(
  id: string | number | null | undefined,
  result: unknown,
  extraHeaders: Record<string, string> = {}
): Response {
  return new Response(
    JSON.stringify({
      jsonrpc: '2.0',
      id: id ?? null,
      result,
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...CORS_HEADERS,
        ...extraHeaders,
      },
    }
  );
}

function jsonRpcError(
  id: string | number | null | undefined,
  code: number,
  message: string,
  status = 200
): Response {
  return new Response(
    JSON.stringify({
      jsonrpc: '2.0',
      id: id ?? null,
      error: { code, message },
    }),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
        ...CORS_HEADERS,
      },
    }
  );
}

async function executeTool(
  name: string,
  args: Record<string, unknown>,
  env: WorkerEnv,
  fetchImpl: typeof fetch
): Promise<unknown> {
  if (name === 'resolve_sec_ticker') {
    const query = typeof args.query === 'string' ? args.query : '';
    const limit = typeof args.limit === 'number' ? args.limit : 5;
    return resolveCompany(query, env, fetchImpl, limit);
  }

  if (name === 'get_sec_financial_snapshot') {
    const tickerOrCik = typeof args.tickerOrCik === 'string' ? args.tickerOrCik : '';
    if (!tickerOrCik.trim()) {
      throw new Error('tickerOrCik is required');
    }
    const periodType = args.periodType === 'quarterly' ? 'quarterly' : 'annual';
    const periods = typeof args.periods === 'number' ? args.periods : 4;
    return getFinancialSnapshot({ tickerOrCik, periodType, periods }, env, fetchImpl);
  }

  if (name === 'get_sec_recent_filings') {
    const tickerOrCik = typeof args.tickerOrCik === 'string' ? args.tickerOrCik : '';
    if (!tickerOrCik.trim()) {
      throw new Error('tickerOrCik is required');
    }
    const forms = Array.isArray(args.forms)
      ? args.forms.filter((f): f is string => typeof f === 'string')
      : undefined;
    const limit = typeof args.limit === 'number' ? args.limit : 15;
    return getRecentFilings({ tickerOrCik, forms, limit }, env, fetchImpl);
  }

  if (name === 'compare_sec_peers') {
    const tickers = Array.isArray(args.tickers)
      ? args.tickers.filter((t): t is string => typeof t === 'string')
      : [];
    const periodType = args.periodType === 'quarterly' ? 'quarterly' : 'annual';
    return comparePeers({ tickers, periodType }, env, fetchImpl);
  }

  if (name === 'get_sec_insider_trades') {
    const tickerOrCik = typeof args.tickerOrCik === 'string' ? args.tickerOrCik : '';
    if (!tickerOrCik.trim()) {
      throw new Error('tickerOrCik is required');
    }
    const limit = typeof args.limit === 'number' ? args.limit : 5;
    return getInsiderTrades({ tickerOrCik, limit }, env, fetchImpl);
  }

  if (name === 'search_sec_filings') {
    const query = typeof args.query === 'string' ? args.query : '';
    if (!query.trim()) {
      throw new Error('query is required');
    }
    const tickerOrCik = typeof args.tickerOrCik === 'string' ? args.tickerOrCik : undefined;
    const forms = Array.isArray(args.forms)
      ? args.forms.filter((f): f is string => typeof f === 'string')
      : undefined;
    const startDate = typeof args.startDate === 'string' ? args.startDate : undefined;
    const endDate = typeof args.endDate === 'string' ? args.endDate : undefined;
    const limit = typeof args.limit === 'number' ? args.limit : 10;
    return searchSecFilings(
      { query, tickerOrCik, forms, startDate, endDate, limit },
      env,
      fetchImpl
    );
  }

  if (name === 'get_sec_filing_excerpt') {
    const tickerOrCik = typeof args.tickerOrCik === 'string' ? args.tickerOrCik : '';
    if (!tickerOrCik.trim()) {
      throw new Error('tickerOrCik is required');
    }
    const accessionNumber = typeof args.accessionNumber === 'string' ? args.accessionNumber : undefined;
    const form = typeof args.form === 'string' ? args.form : undefined;
    const sectionOrQuery = typeof args.sectionOrQuery === 'string' ? args.sectionOrQuery : undefined;
    const maxChars = typeof args.maxChars === 'number' ? args.maxChars : undefined;
    return getSecFilingExcerpt(
      { tickerOrCik, accessionNumber, form, sectionOrQuery, maxChars },
      env,
      fetchImpl
    );
  }

  if (name === 'get_sec_13f_holdings') {
    const managerOrCik = typeof args.managerOrCik === 'string' ? args.managerOrCik : '';
    if (!managerOrCik.trim()) {
      throw new Error('managerOrCik is required');
    }
    const accessionNumber = typeof args.accessionNumber === 'string' ? args.accessionNumber : undefined;
    const issuerQuery = typeof args.issuerQuery === 'string' ? args.issuerQuery : undefined;
    const limit = typeof args.limit === 'number' ? args.limit : 25;
    return get13fHoldings(
      { managerOrCik, accessionNumber, issuerQuery, limit },
      env,
      fetchImpl
    );
  }

  throw new Error(`Unknown tool: ${name}`);
}

export async function handleSecEdgarRequest(
  request: Request,
  env: WorkerEnv,
  fetchImpl: typeof fetch = fetch
): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const url = new URL(request.url);

  if (request.method === 'GET' && url.pathname === '/health') {
    return new Response(
      JSON.stringify({ ok: true, service: 'x402-mcp-sec-edgar' }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      }
    );
  }

  if (request.method === 'GET' && url.pathname === '/llms.txt') {
    const llmsTxt = `# SEC EDGAR Financial Facts x402 MCP & REST API

> Zero-hallucination, pay-per-call Cloudflare Workers service exposing official SEC EDGAR XBRL financial statements, recent filings, and peer comparisons for autonomous research and trading agents.

## Endpoints
- MCP Streamable HTTP (JSON-RPC 2.0): ${url.origin}/mcp
- MCP Discovery: ${url.origin}/.well-known/mcp.json
- x402 Discovery: ${url.origin}/.well-known/x402.json
- OpenAPI 3.1 Spec: ${url.origin}/openapi.json

## Paid x402 v2 REST Resources (Base Mainnet USDC, eip155:8453)
- POST ${url.origin}/api/sec-financial-snapshot ($0.010 USDC) — Audited US-GAAP XBRL metrics, margins, YoY growth, FCF & accession numbers
- POST ${url.origin}/api/sec-recent-filings ($0.005 USDC) — Recent 10-K/10-Q/8-K/Form 4 filings with direct SEC Archives URLs
- POST ${url.origin}/api/compare-sec-peers ($0.015 USDC) — Side-by-side financial comparison across 2–5 US tickers
- POST ${url.origin}/api/sec-insider-trades ($0.010 USDC) — Parsed SEC Form 4 insider buys/sells, Rule 10b5-1 flags & USD totals
- POST ${url.origin}/api/sec-search-filings ($0.008 USDC) — Full-text EFTS search across SEC EDGAR filings by keyword, ticker, form & date
- POST ${url.origin}/api/sec-filing-excerpt ($0.012 USDC) — HTML/iXBRL-stripped clean text & targeted Item/section extraction for 8-K, 10-K & 10-Q filings
- POST ${url.origin}/api/sec-13f-holdings ($0.012 USDC) — Institutional Form 13F-HR holdings XML parser with consolidated CUSIP weights, USD values & PUT/CALL breakdown

## Free Tools (via POST /mcp)
- tools/list — List all tools and schemas
- resolve_sec_ticker — Resolve ticker, company name, or CIK to 10-digit SEC CIK and EDGAR URLs
`;
    return new Response(llmsTxt, {
      status: 200,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', ...CORS_HEADERS },
    });
  }

  if (request.method === 'GET' && url.pathname === '/openapi.json') {
    const openapi = {
      openapi: '3.1.0',
      info: {
        title: 'SEC EDGAR Financial Facts x402 API',
        version: '1.0.0',
        description:
          'Pay-per-call x402 v2 API on Cloudflare Workers for zero-hallucination SEC EDGAR XBRL facts, filings, and peer comparisons.',
      },
      servers: [{ url: url.origin }],
      paths: Object.fromEntries(
        Object.entries(REST_TOOL_ROUTES).map(([routePath, toolName]) => {
          const tool = MCP_TOOLS.find((t) => t.name === toolName)!;
          return [
            routePath,
            {
              post: {
                operationId: tool.name,
                summary: tool.description,
                'x-x402-price-usd': tool.priceUsd,
                'x-x402-network': env.X402_NETWORK || 'eip155:8453',
                requestBody: {
                  required: true,
                  content: {
                    'application/json': { schema: tool.inputSchema },
                  },
                },
                responses: {
                  '200': { description: 'Successful execution with PAYMENT-RESPONSE receipt header' },
                  '402': { description: 'Payment Required with PAYMENT-REQUIRED x402 v2 header' },
                },
              },
            },
          ];
        })
      ),
    };
    return new Response(JSON.stringify(openapi, null, 2), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }

  if (
    request.method === 'GET' &&
    (url.pathname === '/' ||
      url.pathname === '/.well-known/mcp.json' ||
      url.pathname === '/.well-known/x402.json' ||
      url.pathname === '/mcp')
  ) {
    return new Response(
      JSON.stringify(
        {
          name: 'x402-mcp-sec-edgar',
          version: '1.0.0',
          protocol: 'model-context-protocol',
          transport: 'streamable-http',
          endpoint: `${url.origin}/mcp`,
          restEndpoints: Object.keys(REST_TOOL_ROUTES).map((p) => `${url.origin}${p}`),
          paymentProtocol: 'x402-v2',
          bazaarDiscovery: true,
          network: env.X402_NETWORK || 'eip155:8453',
          asset: env.X402_ASSET || '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
          tools: MCP_TOOLS.map((t) => ({
            name: t.name,
            priceUsd: t.priceUsd,
            description: t.description,
          })),
        },
        null,
        2
      ),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      }
    );
  }

  const restToolName = REST_TOOL_ROUTES[url.pathname];
  if (restToolName && (request.method === 'POST' || request.method === 'GET')) {
    const toolDef = MCP_TOOLS.find((t) => t.name === restToolName)!;
    const ex = TOOL_EXAMPLES[toolDef.name];
    const challenge = buildPaymentChallenge(env, {
      resource: `${url.origin}${url.pathname}`,
      priceUsd: toolDef.priceUsd,
      description: toolDef.description,
      inputSchema: toolDef.inputSchema,
      exampleInput: ex?.input,
      exampleOutput: ex?.output,
    });

    const verification = await verifyAndSettleX402(request, env, challenge, fetchImpl);
    if (!verification.valid) {
      return create402Response(challenge, CORS_HEADERS);
    }

    let args: Record<string, unknown> = {};
    if (request.method === 'POST') {
      try {
        const parsed = await request.json();
        if (parsed && typeof parsed === 'object') args = parsed as Record<string, unknown>;
      } catch {
        return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
        });
      }
    }

    try {
      const output = await executeTool(toolDef.name, args, env, fetchImpl);
      return new Response(JSON.stringify(output, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'PAYMENT-RESPONSE': buildPaymentReceiptHeader(
            verification,
            env.X402_NETWORK || 'eip155:8453'
          ),
          ...CORS_HEADERS,
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'SEC EDGAR execution error';
      return new Response(JSON.stringify({ error: message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }
  }

  if (request.method === 'POST' && url.pathname === '/mcp') {
    let body: JsonRpcRequest;
    try {
      body = (await request.json()) as JsonRpcRequest;
    } catch {
      return jsonRpcError(null, -32700, 'Parse error: invalid JSON', 400);
    }

    if (body.method === 'initialize') {
      return jsonRpcResult(body.id, {
        protocolVersion: '2025-03-26',
        capabilities: { tools: {} },
        serverInfo: { name: 'x402-mcp-sec-edgar', version: '1.0.0' },
      });
    }

    if (body.method === 'notifications/initialized' || body.method === 'ping') {
      return jsonRpcResult(body.id, {});
    }

    if (body.method === 'tools/list') {
      return jsonRpcResult(body.id, {
        tools: MCP_TOOLS.map((t) => ({
          name: t.name,
          description: t.description,
          inputSchema: t.inputSchema,
          annotations: {
            readOnlyHint: true,
            x402PriceUsd: t.priceUsd,
          },
        })),
      });
    }

    if (body.method === 'tools/call') {
      const params = body.params || {};
      const toolName = typeof params.name === 'string' ? params.name : '';
      const toolArgs =
        params.arguments && typeof params.arguments === 'object'
          ? (params.arguments as Record<string, unknown>)
          : {};

      const toolDef = MCP_TOOLS.find((t) => t.name === toolName);
      if (!toolDef) {
        return jsonRpcError(body.id, -32602, `Tool not found: ${toolName}`, 404);
      }

      const extraHeaders: Record<string, string> = {};

      if (toolDef.priceUsd > 0) {
        const ex = TOOL_EXAMPLES[toolDef.name];
        const challenge = buildPaymentChallenge(env, {
          resource: `${url.origin}/mcp#${toolDef.name}`,
          priceUsd: toolDef.priceUsd,
          description: toolDef.description,
          inputSchema: toolDef.inputSchema,
          exampleInput: ex?.input,
          exampleOutput: ex?.output,
        });

        const verification = await verifyAndSettleX402(request, env, challenge, fetchImpl);
        if (!verification.valid) {
          return create402Response(challenge, CORS_HEADERS);
        }

        extraHeaders['PAYMENT-RESPONSE'] = buildPaymentReceiptHeader(
          verification,
          env.X402_NETWORK || 'eip155:8453'
        );
      }

      try {
        const output = await executeTool(toolDef.name, toolArgs, env, fetchImpl);
        return jsonRpcResult(
          body.id,
          {
            content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
            structuredContent: output,
          },
          extraHeaders
        );
      } catch (err) {
        return jsonRpcError(
          body.id,
          -32603,
          err instanceof Error ? err.message : 'Tool execution error',
          500
        );
      }
    }

    return jsonRpcError(body.id, -32601, `Method not found: ${body.method}`, 400);
  }

  return new Response('Not Found', { status: 404, headers: CORS_HEADERS });
}

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    return handleSecEdgarRequest(request, env);
  },
};
