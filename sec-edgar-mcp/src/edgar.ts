/**
 * SEC EDGAR Public API Client & XBRL Financial Fact Extractor.
 * Zero third-party API keys; uses official sec.gov / data.sec.gov JSON endpoints
 * with Fair Access User-Agent header and in-isolate TTL caching.
 */

export interface EdgarEnv {
  SEC_USER_AGENT?: string;
}

export interface TickerEntry {
  cik: string;
  cikNumber: number;
  ticker: string;
  title: string;
  edgarUrl: string;
  submissionsUrl: string;
  companyFactsUrl: string;
}

export interface RawFactPoint {
  start?: string;
  end: string;
  val: number;
  accn: string;
  fy?: number;
  fp?: string;
  form: string;
  filed: string;
  frame?: string;
}

export interface ExtractedFactPoint {
  end: string;
  start?: string;
  val: number;
  unit: string;
  tag: string;
  form: string;
  fy?: number;
  fp?: string;
  filed: string;
  accn: string;
}

export interface SecSubmissionsJson {
  cik: string;
  entityType?: string;
  sic?: string;
  sicDescription?: string;
  name: string;
  tickers?: string[];
  exchanges?: string[];
  fiscalYearEnd?: string;
  stateOfIncorporation?: string;
  filings: {
    recent: {
      accessionNumber: string[];
      filingDate: string[];
      reportDate: string[];
      form: string[];
      primaryDocument: string[];
      primaryDocDescription?: string[];
      items?: (string[] | string)[];
      isXBRL?: number[];
    };
  };
}

export interface SecCompanyFactsJson {
  cik: number | string;
  entityName: string;
  facts: {
    'us-gaap'?: Record<
      string,
      {
        label?: string;
        description?: string;
        units: Record<string, RawFactPoint[]>;
      }
    >;
  };
}

export interface FilingItem {
  accessionNumber: string;
  form: string;
  filingDate: string;
  reportDate: string;
  primaryDocument: string;
  description: string;
  items: string[];
  isXBRL: boolean;
  filingUrl: string;
}

export interface FinancialSnapshot {
  company: {
    cik: string;
    ticker: string | null;
    name: string;
  };
  periodType: 'annual' | 'quarterly';
  latestPeriodEnd: string | null;
  metrics: Record<string, ExtractedFactPoint[]>;
  latestSummary: {
    revenueUsd: number | null;
    revenueYoYGrowthPct: number | null;
    operatingIncomeUsd: number | null;
    operatingMarginPct: number | null;
    netIncomeUsd: number | null;
    netMarginPct: number | null;
    netIncomeYoYGrowthPct: number | null;
    epsDiluted: number | null;
    operatingCashFlowUsd: number | null;
    capexUsd: number | null;
    freeCashFlowUsd: number | null;
    fcfMarginPct: number | null;
    cashAndEquivalentsUsd: number | null;
    totalAssetsUsd: number | null;
    totalLiabilitiesUsd: number | null;
    stockholdersEquityUsd: number | null;
    longTermDebtUsd: number | null;
    debtToEquity: number | null;
  };
  provenance: {
    source: 'SEC EDGAR XBRL CompanyFacts';
    companyFactsUrl: string;
    latestAccessionNumbers: string[];
  };
}

const DEFAULT_USER_AGENT = 'JettLinResearch/1.0 contact@agentcostlab.dev';
const TICKERS_TTL_MS = 6 * 60 * 60 * 1000;
const ENTITY_TTL_MS = 15 * 60 * 1000;

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

export function clearEdgarCache(): void {
  cache.clear();
}

export function padCik(input: string | number): string {
  const digits = String(input).replace(/\D/g, '');
  if (!digits) {
    throw new Error(`Invalid CIK: "${input}"`);
  }
  return digits.padStart(10, '0');
}

function getSecHeaders(env: EdgarEnv): Record<string, string> {
  return {
    'User-Agent': env.SEC_USER_AGENT || DEFAULT_USER_AGENT,
    Accept: 'application/json',
  };
}

async function fetchSecJson<T>(
  url: string,
  env: EdgarEnv,
  ttlMs: number,
  fetchImpl: typeof fetch = fetch
): Promise<T> {
  const now = Date.now();
  const hit = cache.get(url);
  if (hit && hit.expiresAt > now) {
    return hit.value as T;
  }

  const res = await fetchImpl(url, { headers: getSecHeaders(env) });
  if (!res.ok) {
    throw new Error(`SEC EDGAR HTTP ${res.status} for ${url}`);
  }
  const data = (await res.json()) as T;
  cache.set(url, { value: data, expiresAt: now + ttlMs });
  return data;
}

function toTickerEntry(cikNumber: number, ticker: string, title: string): TickerEntry {
  const cik = padCik(cikNumber);
  return {
    cik,
    cikNumber,
    ticker,
    title,
    edgarUrl: `https://www.sec.gov/edgar/browse/?CIK=${cik}`,
    submissionsUrl: `https://data.sec.gov/submissions/CIK${cik}.json`,
    companyFactsUrl: `https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`,
  };
}

export async function loadTickerDirectory(
  env: EdgarEnv,
  fetchImpl: typeof fetch = fetch
): Promise<TickerEntry[]> {
  const raw = await fetchSecJson<
    Record<string, { cik_str: number; ticker: string; title: string }>
  >('https://www.sec.gov/files/company_tickers.json', env, TICKERS_TTL_MS, fetchImpl);

  return Object.values(raw).map((row) => toTickerEntry(row.cik_str, row.ticker, row.title));
}

export async function resolveCompany(
  query: string,
  env: EdgarEnv,
  fetchImpl: typeof fetch = fetch,
  limit = 5
): Promise<{ exact: TickerEntry | null; matches: TickerEntry[] }> {
  const trimmed = query.trim();
  if (!trimmed) {
    throw new Error('Query (ticker, company name, or CIK) is required');
  }

  const entries = await loadTickerDirectory(env, fetchImpl);

  // Check if input looks like a numeric CIK (e.g. "0000320193", "320193", "CIK0000320193")
  const cikMatch = trimmed.match(/^(?:cik)?0*(\d{1,10})$/i);
  if (cikMatch) {
    const targetCik = padCik(cikMatch[1]);
    const exact =
      entries.find((e) => e.cik === targetCik) ??
      toTickerEntry(Number(targetCik), '', `CIK ${targetCik}`);
    return { exact, matches: [exact] };
  }

  const upper = trimmed.toUpperCase();
  const normalizedDot = upper.replace('.', '-');
  const exactTicker = entries.find(
    (e) => e.ticker.toUpperCase() === upper || e.ticker.toUpperCase() === normalizedDot
  );
  if (exactTicker) {
    return { exact: exactTicker, matches: [exactTicker] };
  }

  const lower = trimmed.toLowerCase();
  const prefixMatches = entries.filter(
    (e) =>
      e.ticker.toLowerCase().startsWith(lower) || e.title.toLowerCase().startsWith(lower)
  );
  const containsMatches = entries.filter(
    (e) =>
      !prefixMatches.includes(e) &&
      (e.ticker.toLowerCase().includes(lower) || e.title.toLowerCase().includes(lower))
  );

  const combined = [...prefixMatches, ...containsMatches].slice(0, Math.max(1, Math.min(20, limit)));
  return {
    exact: combined.length === 1 ? combined[0] : null,
    matches: combined,
  };
}

export async function resolveExactCik(
  tickerOrCik: string,
  env: EdgarEnv,
  fetchImpl: typeof fetch = fetch
): Promise<TickerEntry> {
  const { exact, matches } = await resolveCompany(tickerOrCik, env, fetchImpl, 3);
  if (exact) return exact;
  if (matches.length > 0) return matches[0];
  throw new Error(`Could not resolve SEC entity for "${tickerOrCik}"`);
}

function durationDays(start?: string, end?: string): number | null {
  if (!start || !end) return null;
  const s = Date.parse(start);
  const e = Date.parse(end);
  if (Number.isNaN(s) || Number.isNaN(e)) return null;
  return Math.round((e - s) / 86_400_000);
}

interface MetricSpec {
  key: string;
  tags: string[];
  unit: string;
  kind: 'duration' | 'instant';
}

const METRIC_SPECS: MetricSpec[] = [
  {
    key: 'revenue',
    tags: [
      'RevenueFromContractWithCustomerExcludingAssessedTax',
      'Revenues',
      'SalesRevenueNet',
      'RevenueFromContractWithCustomerIncludingAssessedTax',
    ],
    unit: 'USD',
    kind: 'duration',
  },
  {
    key: 'operatingIncome',
    tags: ['OperatingIncomeLoss'],
    unit: 'USD',
    kind: 'duration',
  },
  {
    key: 'netIncome',
    tags: ['NetIncomeLoss', 'ProfitLoss'],
    unit: 'USD',
    kind: 'duration',
  },
  {
    key: 'epsDiluted',
    tags: ['EarningsPerShareDiluted'],
    unit: 'USD/shares',
    kind: 'duration',
  },
  {
    key: 'operatingCashFlow',
    tags: [
      'NetCashProvidedByUsedInOperatingActivities',
      'NetCashProvidedByUsedInOperatingActivitiesContinuingOperations',
    ],
    unit: 'USD',
    kind: 'duration',
  },
  {
    key: 'capex',
    tags: [
      'PaymentsToAcquirePropertyPlantAndEquipment',
      'CapitalExpendituresIncurredButNotYetPaid',
    ],
    unit: 'USD',
    kind: 'duration',
  },
  {
    key: 'cashAndEquivalents',
    tags: [
      'CashAndCashEquivalentsAtCarryingValue',
      'CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents',
    ],
    unit: 'USD',
    kind: 'instant',
  },
  {
    key: 'totalAssets',
    tags: ['Assets'],
    unit: 'USD',
    kind: 'instant',
  },
  {
    key: 'totalLiabilities',
    tags: ['Liabilities'],
    unit: 'USD',
    kind: 'instant',
  },
  {
    key: 'stockholdersEquity',
    tags: [
      'StockholdersEquity',
      'StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest',
    ],
    unit: 'USD',
    kind: 'instant',
  },
  {
    key: 'longTermDebt',
    tags: [
      'LongTermDebtNoncurrent',
      'LongTermDebt',
      'LongTermDebtAndCapitalLeaseObligations',
    ],
    unit: 'USD',
    kind: 'instant',
  },
];

function matchesPeriodFilter(
  point: RawFactPoint,
  kind: 'duration' | 'instant',
  periodType: 'annual' | 'quarterly'
): boolean {
  const isAnnualForm =
    point.form === '10-K' || point.form === '10-K/A' || point.form === '20-F' || point.form === '40-F';
  const isQuarterlyForm = point.form === '10-Q' || point.form === '10-Q/A';

  if (periodType === 'annual') {
    if (!isAnnualForm) return false;
    if (kind === 'duration') {
      const days = durationDays(point.start, point.end);
      if (days !== null && days < 300) return false;
    }
    return true;
  }

  // Quarterly mode: accept 10-Q standalone quarters (45..130 days for duration)
  if (!isQuarterlyForm) return false;
  if (kind === 'duration') {
    const days = durationDays(point.start, point.end);
    if (days !== null && (days < 45 || days > 130)) return false;
  }
  return true;
}

export function extractMetricSeries(
  usGaap: NonNullable<SecCompanyFactsJson['facts']['us-gaap']>,
  spec: MetricSpec,
  periodType: 'annual' | 'quarterly',
  periods: number
): ExtractedFactPoint[] {
  const byEnd = new Map<string, { priority: number; point: ExtractedFactPoint }>();

  spec.tags.forEach((tag, tagIdx) => {
    const concept = usGaap[tag];
    if (!concept?.units) return;

    const unitKey = concept.units[spec.unit]
      ? spec.unit
      : Object.keys(concept.units).find((k) => k.toLowerCase() === spec.unit.toLowerCase());
    if (!unitKey) return;

    const rawPoints = concept.units[unitKey] ?? [];
    for (const raw of rawPoints) {
      if (typeof raw.val !== 'number' || !raw.end) continue;
      if (!matchesPeriodFilter(raw, spec.kind, periodType)) continue;

      const candidate: ExtractedFactPoint = {
        end: raw.end,
        ...(raw.start ? { start: raw.start } : {}),
        val: raw.val,
        unit: unitKey,
        tag,
        form: raw.form,
        ...(raw.fy !== undefined ? { fy: raw.fy } : {}),
        ...(raw.fp ? { fp: raw.fp } : {}),
        filed: raw.filed,
        accn: raw.accn,
      };

      const existing = byEnd.get(raw.end);
      if (!existing) {
        byEnd.set(raw.end, { priority: tagIdx, point: candidate });
      } else if (
        candidate.filed > existing.point.filed ||
        (candidate.filed === existing.point.filed && tagIdx < existing.priority)
      ) {
        byEnd.set(raw.end, { priority: tagIdx, point: candidate });
      }
    }
  });

  return Array.from(byEnd.values())
    .map((entry) => entry.point)
    .sort((a, b) => b.end.localeCompare(a.end))
    .slice(0, periods);
}

function roundPct(num: number | null): number | null {
  if (num === null || !Number.isFinite(num)) return null;
  return Number(num.toFixed(2));
}

function pctGrowth(curr: number | null, prev: number | null): number | null {
  if (curr === null || prev === null || prev === 0) return null;
  return roundPct(((curr - prev) / Math.abs(prev)) * 100);
}

export async function getFinancialSnapshot(
  params: {
    tickerOrCik: string;
    periodType?: 'annual' | 'quarterly';
    periods?: number;
  },
  env: EdgarEnv,
  fetchImpl: typeof fetch = fetch
): Promise<FinancialSnapshot> {
  const entry = await resolveExactCik(params.tickerOrCik, env, fetchImpl);
  const periodType = params.periodType === 'quarterly' ? 'quarterly' : 'annual';
  const periods = Math.max(1, Math.min(12, params.periods ?? 4));

  const factsJson = await fetchSecJson<SecCompanyFactsJson>(
    entry.companyFactsUrl,
    env,
    ENTITY_TTL_MS,
    fetchImpl
  );

  const usGaap = factsJson.facts?.['us-gaap'] ?? {};
  const metrics: Record<string, ExtractedFactPoint[]> = {};
  for (const spec of METRIC_SPECS) {
    metrics[spec.key] = extractMetricSeries(usGaap, spec, periodType, periods);
  }

  const latestVal = (k: string): number | null => metrics[k]?.[0]?.val ?? null;
  const revCurr = latestVal('revenue');
  const revPrev = metrics.revenue?.[1]?.val ?? null;
  const opInc = latestVal('operatingIncome');
  const netInc = latestVal('netIncome');
  const netIncPrev = metrics.netIncome?.[1]?.val ?? null;
  const ocf = latestVal('operatingCashFlow');
  const capex = latestVal('capex');
  const fcf = ocf !== null && capex !== null ? ocf - Math.abs(capex) : null;
  const debt = latestVal('longTermDebt');
  const equity = latestVal('stockholdersEquity');

  const accessionSet = new Set<string>();
  let latestPeriodEnd: string | null = null;
  for (const series of Object.values(metrics)) {
    const first = series[0];
    if (first) {
      accessionSet.add(first.accn);
      if (!latestPeriodEnd || first.end > latestPeriodEnd) {
        latestPeriodEnd = first.end;
      }
    }
  }

  return {
    company: {
      cik: entry.cik,
      ticker: entry.ticker || null,
      name: factsJson.entityName || entry.title,
    },
    periodType,
    latestPeriodEnd,
    metrics,
    latestSummary: {
      revenueUsd: revCurr,
      revenueYoYGrowthPct: periodType === 'annual' ? pctGrowth(revCurr, revPrev) : null,
      operatingIncomeUsd: opInc,
      operatingMarginPct:
        opInc !== null && revCurr ? roundPct((opInc / revCurr) * 100) : null,
      netIncomeUsd: netInc,
      netMarginPct: netInc !== null && revCurr ? roundPct((netInc / revCurr) * 100) : null,
      netIncomeYoYGrowthPct: periodType === 'annual' ? pctGrowth(netInc, netIncPrev) : null,
      epsDiluted: latestVal('epsDiluted'),
      operatingCashFlowUsd: ocf,
      capexUsd: capex,
      freeCashFlowUsd: fcf,
      fcfMarginPct: fcf !== null && revCurr ? roundPct((fcf / revCurr) * 100) : null,
      cashAndEquivalentsUsd: latestVal('cashAndEquivalents'),
      totalAssetsUsd: latestVal('totalAssets'),
      totalLiabilitiesUsd: latestVal('totalLiabilities'),
      stockholdersEquityUsd: equity,
      longTermDebtUsd: debt,
      debtToEquity:
        debt !== null && equity !== null && equity !== 0 ? roundPct(debt / equity) : null,
    },
    provenance: {
      source: 'SEC EDGAR XBRL CompanyFacts',
      companyFactsUrl: entry.companyFactsUrl,
      latestAccessionNumbers: Array.from(accessionSet),
    },
  };
}

export async function getRecentFilings(
  params: {
    tickerOrCik: string;
    forms?: string[];
    limit?: number;
  },
  env: EdgarEnv,
  fetchImpl: typeof fetch = fetch
): Promise<{
  company: {
    cik: string;
    name: string;
    tickers: string[];
    exchanges: string[];
    sic: string | null;
    sicDescription: string | null;
    fiscalYearEnd: string | null;
    stateOfIncorporation: string | null;
  };
  filings: FilingItem[];
  submissionsUrl: string;
}> {
  const entry = await resolveExactCik(params.tickerOrCik, env, fetchImpl);
  const subs = await fetchSecJson<SecSubmissionsJson>(
    entry.submissionsUrl,
    env,
    ENTITY_TTL_MS,
    fetchImpl
  );

  const recent = subs.filings?.recent;
  if (!recent) {
    throw new Error(`No recent filings payload found for CIK ${entry.cik}`);
  }

  const formFilter =
    params.forms && params.forms.length > 0
      ? new Set(params.forms.map((f) => f.trim().toUpperCase()))
      : null;
  const limit = Math.max(1, Math.min(50, params.limit ?? 15));

  const filings: FilingItem[] = [];
  const total = recent.accessionNumber.length;
  for (let i = 0; i < total && filings.length < limit; i++) {
    const form = recent.form[i] ?? '';
    if (formFilter && !formFilter.has(form.toUpperCase())) continue;

    const accn = recent.accessionNumber[i];
    const primaryDocument = recent.primaryDocument[i] ?? '';
    const accnNoDashes = accn.replace(/-/g, '');
    const rawItems = recent.items?.[i];
    const items = Array.isArray(rawItems)
      ? rawItems.map(String)
      : typeof rawItems === 'string' && rawItems.length > 0
        ? rawItems.split(',').map((s) => s.trim())
        : [];

    filings.push({
      accessionNumber: accn,
      form,
      filingDate: recent.filingDate[i] ?? '',
      reportDate: recent.reportDate[i] ?? '',
      primaryDocument,
      description: recent.primaryDocDescription?.[i] ?? '',
      items,
      isXBRL: Boolean(recent.isXBRL?.[i]),
      filingUrl: `https://www.sec.gov/Archives/edgar/data/${entry.cikNumber}/${accnNoDashes}/${primaryDocument}`,
    });
  }

  return {
    company: {
      cik: entry.cik,
      name: subs.name || entry.title,
      tickers: subs.tickers ?? (entry.ticker ? [entry.ticker] : []),
      exchanges: subs.exchanges ?? [],
      sic: subs.sic ?? null,
      sicDescription: subs.sicDescription ?? null,
      fiscalYearEnd: subs.fiscalYearEnd ?? null,
      stateOfIncorporation: subs.stateOfIncorporation ?? null,
    },
    filings,
    submissionsUrl: entry.submissionsUrl,
  };
}

export async function comparePeers(
  params: {
    tickers: string[];
    periodType?: 'annual' | 'quarterly';
  },
  env: EdgarEnv,
  fetchImpl: typeof fetch = fetch
) {
  const unique = Array.from(
    new Set(params.tickers.map((t) => t.trim()).filter(Boolean))
  ).slice(0, 5);
  if (unique.length < 2) {
    throw new Error('Provide at least 2 tickers or CIKs to compare');
  }

  const periodType = params.periodType === 'quarterly' ? 'quarterly' : 'annual';
  const snapshots = await Promise.all(
    unique.map((tickerOrCik) =>
      getFinancialSnapshot({ tickerOrCik, periodType, periods: 2 }, env, fetchImpl)
    )
  );

  return {
    periodType,
    count: snapshots.length,
    peers: snapshots.map((s) => ({
      cik: s.company.cik,
      ticker: s.company.ticker,
      name: s.company.name,
      latestPeriodEnd: s.latestPeriodEnd,
      ...s.latestSummary,
      accessionNumbers: s.provenance.latestAccessionNumbers,
    })),
  };
}
