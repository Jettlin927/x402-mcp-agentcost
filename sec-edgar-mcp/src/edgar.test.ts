import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearEdgarCache } from './edgar';
import { handleSecEdgarRequest, type WorkerEnv } from './index';
import { decodeBase64Json, type X402ChallengePayload } from './x402';

const baseEnv: WorkerEnv = {
  X402_PAY_TO: '0x1111111111111111111111111111111111111111',
  X402_NETWORK: 'eip155:8453',
  X402_ENFORCE: 'true',
  X402_ALLOW_DEMO: 'true',
  SEC_USER_AGENT: 'JettLinResearch/1.0 contact@agentcostlab.dev',
};

const MOCK_TICKERS = {
  '0': { cik_str: 320193, ticker: 'AAPL', title: 'Apple Inc.' },
  '1': { cik_str: 789019, ticker: 'MSFT', title: 'MICROSOFT CORP' },
  '2': { cik_str: 1045810, ticker: 'NVDA', title: 'NVIDIA CORP' },
};

const MOCK_SUBMISSIONS_AAPL = {
  cik: '0000320193',
  sic: '3571',
  sicDescription: 'Electronic Computers',
  name: 'Apple Inc.',
  tickers: ['AAPL'],
  exchanges: ['Nasdaq'],
  fiscalYearEnd: '0925',
  stateOfIncorporation: 'CA',
  filings: {
    recent: {
      accessionNumber: ['0000320193-26-000026', '0001140361-26-044952'],
      filingDate: ['2026-11-03', '2026-11-19'],
      reportDate: ['2026-09-26', '2026-11-17'],
      form: ['10-K', '4'],
      primaryDocument: ['aapl-20260926.htm', 'xslF345X06/form4.xml'],
      primaryDocDescription: ['10-K', 'FORM 4'],
      items: [[], []],
      isXBRL: [1, 0],
    },
  },
};

function makeCompanyFacts(entityName: string, revCurr: number, revPrev: number, netCurr: number) {
  return {
    cik: 320193,
    entityName,
    facts: {
      'us-gaap': {
        RevenueFromContractWithCustomerExcludingAssessedTax: {
          units: {
            USD: [
              // YTD 9-month 10-Q point that should be filtered out in annual mode
              {
                start: '2025-09-28',
                end: '2026-06-27',
                val: Math.round(revCurr * 0.75),
                accn: '0000320193-26-000020',
                fy: 2026,
                fp: 'Q3',
                form: '10-Q',
                filed: '2026-07-31',
              },
              // Standalone Q3 10-Q point
              {
                start: '2026-03-29',
                end: '2026-06-27',
                val: Math.round(revCurr * 0.24),
                accn: '0000320193-26-000020',
                fy: 2026,
                fp: 'Q3',
                form: '10-Q',
                filed: '2026-07-31',
              },
              {
                start: '2024-09-29',
                end: '2025-09-27',
                val: revPrev,
                accn: '0000320193-25-000099',
                fy: 2025,
                fp: 'FY',
                form: '10-K',
                filed: '2025-11-01',
              },
              {
                start: '2025-09-28',
                end: '2026-09-26',
                val: revCurr,
                accn: '0000320193-26-000026',
                fy: 2026,
                fp: 'FY',
                form: '10-K',
                filed: '2026-11-03',
              },
            ],
          },
        },
        OperatingIncomeLoss: {
          units: {
            USD: [
              {
                start: '2025-09-28',
                end: '2026-09-26',
                val: Math.round(revCurr * 0.3),
                accn: '0000320193-26-000026',
                fy: 2026,
                fp: 'FY',
                form: '10-K',
                filed: '2026-11-03',
              },
            ],
          },
        },
        NetIncomeLoss: {
          units: {
            USD: [
              {
                start: '2024-09-29',
                end: '2025-09-27',
                val: Math.round(netCurr * 0.9),
                accn: '0000320193-25-000099',
                fy: 2025,
                fp: 'FY',
                form: '10-K',
                filed: '2025-11-01',
              },
              {
                start: '2025-09-28',
                end: '2026-09-26',
                val: netCurr,
                accn: '0000320193-26-000026',
                fy: 2026,
                fp: 'FY',
                form: '10-K',
                filed: '2026-11-03',
              },
            ],
          },
        },
        NetCashProvidedByUsedInOperatingActivities: {
          units: {
            USD: [
              {
                start: '2025-09-28',
                end: '2026-09-26',
                val: Math.round(netCurr * 1.15),
                accn: '0000320193-26-000026',
                fy: 2026,
                fp: 'FY',
                form: '10-K',
                filed: '2026-11-03',
              },
            ],
          },
        },
        PaymentsToAcquirePropertyPlantAndEquipment: {
          units: {
            USD: [
              {
                start: '2025-09-28',
                end: '2026-09-26',
                val: 10_000_000_000,
                accn: '0000320193-26-000026',
                fy: 2026,
                fp: 'FY',
                form: '10-K',
                filed: '2026-11-03',
              },
            ],
          },
        },
        CashAndCashEquivalentsAtCarryingValue: {
          units: {
            USD: [
              {
                end: '2026-09-26',
                val: 35_000_000_000,
                accn: '0000320193-26-000026',
                fy: 2026,
                fp: 'FY',
                form: '10-K',
                filed: '2026-11-03',
              },
            ],
          },
        },
        StockholdersEquity: {
          units: {
            USD: [
              {
                end: '2026-09-26',
                val: 70_000_000_000,
                accn: '0000320193-26-000026',
                fy: 2026,
                fp: 'FY',
                form: '10-K',
                filed: '2026-11-03',
              },
            ],
          },
        },
        LongTermDebtNoncurrent: {
          units: {
            USD: [
              {
                end: '2026-09-26',
                val: 84_000_000_000,
                accn: '0000320193-26-000026',
                fy: 2026,
                fp: 'FY',
                form: '10-K',
                filed: '2026-11-03',
              },
            ],
          },
        },
      },
    },
  };
}

function makeMockSecFetch() {
  return vi.fn(async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();
    const headers = init?.headers as Record<string, string> | undefined;
    if (url.includes('sec.gov')) {
      expect(headers?.['User-Agent']).toContain('JettLinResearch');
    }

    if (url.endsWith('/company_tickers.json')) {
      return new Response(JSON.stringify(MOCK_TICKERS), { status: 200 });
    }
    if (url.endsWith('/CIK0000320193.json') && url.includes('/submissions/')) {
      return new Response(JSON.stringify(MOCK_SUBMISSIONS_AAPL), { status: 200 });
    }
    if (url.endsWith('/CIK0000320193.json') && url.includes('/companyfacts/')) {
      return new Response(
        JSON.stringify(makeCompanyFacts('Apple Inc.', 478_834_000_000, 420_000_000_000, 120_000_000_000)),
        { status: 200 }
      );
    }
    if (url.endsWith('/CIK0000789019.json') && url.includes('/companyfacts/')) {
      return new Response(
        JSON.stringify(makeCompanyFacts('MICROSOFT CORP', 280_000_000_000, 245_000_000_000, 100_000_000_000)),
        { status: 200 }
      );
    }
    return new Response('Not found', { status: 404 });
  });
}

function makeRpcRequest(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request('https://x402-mcp-sec-edgar.jettlin666.workers.dev/mcp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

describe('SEC EDGAR x402 Pay-Per-Call MCP Server', () => {
  beforeEach(() => {
    clearEdgarCache();
  });

  it('serves discovery endpoints (/health, /.well-known/x402.json, /llms.txt, /openapi.json)', async () => {
    const health = await handleSecEdgarRequest(
      new Request('https://x402-mcp-sec-edgar.jettlin666.workers.dev/health'),
      baseEnv
    );
    expect(health.status).toBe(200);
    expect((await health.json()) as { service: string }).toMatchObject({
      ok: true,
      service: 'x402-mcp-sec-edgar',
    });

    const manifest = await handleSecEdgarRequest(
      new Request('https://x402-mcp-sec-edgar.jettlin666.workers.dev/.well-known/x402.json'),
      baseEnv
    );
    expect(manifest.status).toBe(200);
    const json = (await manifest.json()) as { paymentProtocol: string; tools: unknown[] };
    expect(json.paymentProtocol).toBe('x402-v2');
    expect(json.tools.length).toBe(4);

    const llms = await handleSecEdgarRequest(
      new Request('https://x402-mcp-sec-edgar.jettlin666.workers.dev/llms.txt'),
      baseEnv
    );
    expect(llms.status).toBe(200);
    expect(await llms.text()).toContain('/api/sec-financial-snapshot');

    const openapi = await handleSecEdgarRequest(
      new Request('https://x402-mcp-sec-edgar.jettlin666.workers.dev/openapi.json'),
      baseEnv
    );
    expect(openapi.status).toBe(200);
    const spec = (await openapi.json()) as { paths: Record<string, unknown> };
    expect(Object.keys(spec.paths)).toContain('/api/compare-sec-peers');
  });

  it('executes free resolve_sec_ticker tool without payment', async () => {
    const mockFetch = makeMockSecFetch();
    const res = await handleSecEdgarRequest(
      makeRpcRequest({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: { name: 'resolve_sec_ticker', arguments: { query: 'AAPL' } },
      }),
      baseEnv,
      mockFetch as unknown as typeof fetch
    );

    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      result: { structuredContent: { exact: { cik: string; ticker: string } } };
    };
    expect(json.result.structuredContent.exact.cik).toBe('0000320193');
    expect(json.result.structuredContent.exact.ticker).toBe('AAPL');
  });

  it('returns HTTP 402 with Bazaar schema when calling paid REST endpoint without payment', async () => {
    const res = await handleSecEdgarRequest(
      new Request('https://x402-mcp-sec-edgar.jettlin666.workers.dev/api/sec-financial-snapshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tickerOrCik: 'AAPL' }),
      }),
      baseEnv
    );

    expect(res.status).toBe(402);
    const header = res.headers.get('PAYMENT-REQUIRED');
    expect(header).toBeTruthy();

    const decoded = decodeBase64Json<X402ChallengePayload>(header!);
    expect(decoded.x402Version).toBe(2);
    expect(decoded.accepts[0].amount).toBe('10000'); // $0.010 USDC
    expect(decoded.extensions?.bazaar?.info.input.body).toEqual({
      tickerOrCik: 'AAPL',
      periodType: 'annual',
      periods: 4,
    });
  });

  it('extracts audited annual XBRL metrics, YoY growth, margins, and FCF in demo mode', async () => {
    const mockFetch = makeMockSecFetch();
    const res = await handleSecEdgarRequest(
      makeRpcRequest(
        {
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/call',
          params: {
            name: 'get_sec_financial_snapshot',
            arguments: { tickerOrCik: 'AAPL', periodType: 'annual', periods: 4 },
          },
        },
        { 'X-DEMO-MODE': 'true' }
      ),
      baseEnv,
      mockFetch as unknown as typeof fetch
    );

    expect(res.status).toBe(200);
    expect(res.headers.get('PAYMENT-RESPONSE')).toBeTruthy();

    const json = (await res.json()) as {
      result: {
        structuredContent: {
          company: { cik: string; name: string };
          latestPeriodEnd: string;
          latestSummary: {
            revenueUsd: number;
            revenueYoYGrowthPct: number;
            operatingMarginPct: number;
            freeCashFlowUsd: number;
            debtToEquity: number;
          };
          provenance: { latestAccessionNumbers: string[] };
        };
      };
    };

    const data = json.result.structuredContent;
    expect(data.company.cik).toBe('0000320193');
    expect(data.latestPeriodEnd).toBe('2026-09-26');
    expect(data.latestSummary.revenueUsd).toBe(478_834_000_000);
    expect(data.latestSummary.revenueYoYGrowthPct).toBe(14.01);
    expect(data.latestSummary.operatingMarginPct).toBe(30);
    expect(data.latestSummary.freeCashFlowUsd).toBe(128_000_000_000);
    expect(data.latestSummary.debtToEquity).toBe(1.2);
    expect(data.provenance.latestAccessionNumbers).toContain('0000320193-26-000026');
  });

  it('filters standalone quarterly 10-Q figures without mixing YTD cumulative points', async () => {
    const mockFetch = makeMockSecFetch();
    const res = await handleSecEdgarRequest(
      new Request('https://x402-mcp-sec-edgar.jettlin666.workers.dev/api/sec-financial-snapshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-DEMO-MODE': 'true' },
        body: JSON.stringify({ tickerOrCik: 'AAPL', periodType: 'quarterly', periods: 2 }),
      }),
      baseEnv,
      mockFetch as unknown as typeof fetch
    );

    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      metrics: { revenue: { val: number; start: string; end: string }[] };
    };
    expect(json.metrics.revenue.length).toBe(1);
    expect(json.metrics.revenue[0].start).toBe('2026-03-29');
    expect(json.metrics.revenue[0].end).toBe('2026-06-27');
  });

  it('retrieves recent filings filtered by form with direct SEC Archives URLs', async () => {
    const mockFetch = makeMockSecFetch();
    const res = await handleSecEdgarRequest(
      new Request('https://x402-mcp-sec-edgar.jettlin666.workers.dev/api/sec-recent-filings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-DEMO-MODE': 'true' },
        body: JSON.stringify({ tickerOrCik: 'AAPL', forms: ['10-K'], limit: 5 }),
      }),
      baseEnv,
      mockFetch as unknown as typeof fetch
    );

    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      company: { sic: string };
      filings: { form: string; filingUrl: string }[];
    };
    expect(json.company.sic).toBe('3571');
    expect(json.filings.length).toBe(1);
    expect(json.filings[0].form).toBe('10-K');
    expect(json.filings[0].filingUrl).toBe(
      'https://www.sec.gov/Archives/edgar/data/320193/000032019326000026/aapl-20260926.htm'
    );
  });

  it('settles x402 payment via facilitator and compares multiple peers', async () => {
    const secFetch = makeMockSecFetch();
    const combinedFetch = vi.fn(async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.endsWith('/verify')) {
        return new Response(JSON.stringify({ isValid: true, payer: '0xTraderBot' }), { status: 200 });
      }
      if (url.endsWith('/settle')) {
        return new Response(
          JSON.stringify({ success: true, transaction: '0xtx999', payer: '0xTraderBot' }),
          { status: 200 }
        );
      }
      return secFetch(input, init);
    });

    const res = await handleSecEdgarRequest(
      new Request('https://x402-mcp-sec-edgar.jettlin666.workers.dev/api/compare-sec-peers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'PAYMENT-SIGNATURE': 'signed-base-usdc-payload',
        },
        body: JSON.stringify({ tickers: ['AAPL', 'MSFT'], periodType: 'annual' }),
      }),
      baseEnv,
      combinedFetch as unknown as typeof fetch
    );

    expect(res.status).toBe(200);
    const receipt = decodeBase64Json<{ transaction: string; payer: string }>(
      res.headers.get('PAYMENT-RESPONSE')!
    );
    expect(receipt.transaction).toBe('0xtx999');
    expect(receipt.payer).toBe('0xTraderBot');

    const json = (await res.json()) as { count: number; peers: { ticker: string; revenueUsd: number }[] };
    expect(json.count).toBe(2);
    expect(json.peers.map((p) => p.ticker)).toEqual(['AAPL', 'MSFT']);
  });
});
