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

export interface InsiderTransaction {
  accessionNumber: string;
  filingDate: string;
  periodOfReport: string | null;
  insiderName: string;
  insiderCik: string | null;
  officerTitle: string | null;
  isDirector: boolean;
  isOfficer: boolean;
  isTenPercentOwner: boolean;
  is10b5One: boolean;
  securityTitle: string;
  transactionDate: string;
  transactionCode: string;
  shares: number;
  pricePerShare: number | null;
  totalValueUsd: number | null;
  acquiredOrDisposed: 'A' | 'D' | null;
  sharesOwnedFollowing: number | null;
  ownershipType: 'D' | 'I' | null;
  xmlUrl: string;
}

export interface InsiderTradesReport {
  company: {
    cik: string;
    ticker: string | null;
    name: string;
  };
  filingsScanned: number;
  summary: {
    totalTransactions: number;
    openMarketBuysShares: number;
    openMarketBuysUsd: number;
    openMarketSellsShares: number;
    openMarketSellsUsd: number;
    netOpenMarketUsd: number;
  };
  transactions: InsiderTransaction[];
  provenance: {
    source: 'SEC EDGAR Form 4 Ownership XML';
    submissionsUrl: string;
  };
}

export interface SecSearchHit {
  accessionNumber: string;
  form: string;
  fileDate: string;
  periodEnding: string | null;
  displayNames: string[];
  ciks: string[];
  items: string[];
  fileDescription: string | null;
  documentUrl: string;
}

export interface SecSearchReport {
  query: string;
  totalHits: number;
  returned: number;
  hits: SecSearchHit[];
  provenance: {
    source: 'SEC EDGAR Full-Text Search (EFTS)';
    searchUrl: string;
  };
}

export interface SecFilingExcerptResult {
  company: {
    cik: string;
    ticker: string | null;
    name: string;
  };
  filing: {
    accessionNumber: string;
    form: string;
    filingDate: string;
    reportDate: string;
    primaryDocument: string;
    items: string[];
    filingUrl: string;
  };
  extraction: {
    totalPlainChars: number;
    returnedChars: number;
    truncated: boolean;
    matchedSection: string | null;
    detectedSections: string[];
    excerpt: string;
  };
  provenance: {
    source: 'SEC EDGAR Primary Filing Document';
    submissionsUrl: string;
    filingUrl: string;
  };
}

export interface Sec13fHolding {
  nameOfIssuer: string;
  titleOfClass: string;
  cusip: string;
  valueUsd: number;
  shares: number;
  amountType: string;
  putCall: 'PUT' | 'CALL' | null;
  weightPct: number;
  impliedPriceUsd: number | null;
  investmentDiscretion: string | null;
  votingSole: number;
  votingShared: number;
  votingNone: number;
  lineItemsCount: number;
}

export interface Sec13fHoldingsReport {
  manager: {
    cik: string;
    name: string;
  };
  filing: {
    accessionNumber: string;
    form: string;
    filingDate: string;
    reportDate: string;
    infoTableUrl: string;
  };
  summary: {
    totalValueUsd: number;
    totalLineItems: number;
    uniquePositions: number;
    matchedPositions: number;
    returnedPositions: number;
  };
  holdings: Sec13fHolding[];
  provenance: {
    source: 'SEC EDGAR Form 13F Information Table XML';
    submissionsUrl: string;
    infoTableUrl: string;
  };
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

function getSecHeaders(env: EdgarEnv, accept = 'application/json'): Record<string, string> {
  return {
    'User-Agent': env.SEC_USER_AGENT || DEFAULT_USER_AGENT,
    Accept: accept,
  };
}

async function fetchSecCached<T>(
  url: string,
  env: EdgarEnv,
  ttlMs: number,
  accept: string,
  parse: (res: Response) => Promise<T>,
  fetchImpl: typeof fetch = fetch
): Promise<T> {
  const now = Date.now();
  const hit = cache.get(url);
  if (hit && hit.expiresAt > now) {
    return hit.value as T;
  }

  const res = await fetchImpl(url, { headers: getSecHeaders(env, accept) });
  if (!res.ok) {
    throw new Error(`SEC EDGAR HTTP ${res.status} for ${url}`);
  }
  const data = await parse(res);
  cache.set(url, { value: data, expiresAt: now + ttlMs });
  return data;
}

async function fetchSecJson<T>(
  url: string,
  env: EdgarEnv,
  ttlMs: number,
  fetchImpl: typeof fetch = fetch
): Promise<T> {
  return fetchSecCached<T>(url, env, ttlMs, 'application/json', (r) => r.json() as Promise<T>, fetchImpl);
}

async function fetchSecText(
  url: string,
  env: EdgarEnv,
  ttlMs: number,
  fetchImpl: typeof fetch = fetch
): Promise<string> {
  return fetchSecCached<string>(
    url,
    env,
    ttlMs,
    'application/xml, text/xml, text/plain',
    (r) => r.text(),
    fetchImpl
  );
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

function parseRecentItems(rawItems: string[] | string | undefined): string[] {
  if (Array.isArray(rawItems)) return rawItems.map(String);
  if (typeof rawItems === 'string' && rawItems.length > 0) {
    return rawItems.split(',').map((s) => s.trim());
  }
  return [];
}

function formatSecFilingUrl(cikNumber: number, accessionNumber: string, primaryDocument: string): string {
  const accnNoDashes = accessionNumber.replace(/-/g, '');
  return `https://www.sec.gov/Archives/edgar/data/${cikNumber}/${accnNoDashes}/${primaryDocument}`;
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
    const items = parseRecentItems(recent.items?.[i]);

    filings.push({
      accessionNumber: accn,
      form,
      filingDate: recent.filingDate[i] ?? '',
      reportDate: recent.reportDate[i] ?? '',
      primaryDocument,
      description: recent.primaryDocDescription?.[i] ?? '',
      items,
      isXBRL: Boolean(recent.isXBRL?.[i]),
      filingUrl: formatSecFilingUrl(entry.cikNumber, accn, primaryDocument),
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

function decodeXmlEntities(raw: string): string {
  return raw
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .trim();
}

function extractTagBlock(xml: string, tag: string): string | null {
  const match = xml.match(
    new RegExp(`<(?:[a-z0-9_-]+:)?${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</(?:[a-z0-9_-]+:)?${tag}>`, 'i')
  );
  return match ? match[1] : null;
}

function extractTagValue(xml: string, tag: string): string | null {
  const block = extractTagBlock(xml, tag);
  if (block === null) return null;
  const nestedVal = block.match(/<(?:[a-z0-9_-]+:)?value(?:\s[^>]*)?>([\s\S]*?)<\/(?:[a-z0-9_-]+:)?value>/i);
  const raw = nestedVal ? nestedVal[1] : block;
  const clean = decodeXmlEntities(raw.replace(/<[^>]+>/g, ''));
  return clean.length > 0 ? clean : null;
}

function parseXmlBool(val: string | null): boolean {
  if (!val) return false;
  const norm = val.trim().toLowerCase();
  return norm === '1' || norm === 'true' || norm === 'y';
}

function parseXmlNumber(val: string | null): number | null {
  if (!val) return null;
  const n = Number(val.replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

export function parseForm4Xml(
  xml: string,
  meta: { accessionNumber: string; filingDate: string; xmlUrl: string }
): InsiderTransaction[] {
  const periodOfReport = extractTagValue(xml, 'periodOfReport');
  const ownerBlock = extractTagBlock(xml, 'reportingOwner') ?? xml;
  const insiderName = extractTagValue(ownerBlock, 'rptOwnerName') ?? 'Unknown Insider';
  const insiderCik = extractTagValue(ownerBlock, 'rptOwnerCik');
  const officerTitle = extractTagValue(ownerBlock, 'officerTitle');
  const isDirector = parseXmlBool(extractTagValue(ownerBlock, 'isDirector'));
  const isOfficer = parseXmlBool(extractTagValue(ownerBlock, 'isOfficer'));
  const isTenPercentOwner = parseXmlBool(extractTagValue(ownerBlock, 'isTenPercentOwner'));
  const is10b5One = parseXmlBool(extractTagValue(xml, 'aff10b5One'));

  const txBlocks = Array.from(
    xml.matchAll(/<nonDerivativeTransaction(?:\s[^>]*)?>([\s\S]*?)<\/nonDerivativeTransaction>/gi)
  );

  const transactions: InsiderTransaction[] = [];
  for (const match of txBlocks) {
    const block = match[1];
    const shares = parseXmlNumber(extractTagValue(block, 'transactionShares'));
    if (shares === null) continue;
    const pricePerShare = parseXmlNumber(extractTagValue(block, 'transactionPricePerShare'));
    const code = (extractTagValue(block, 'transactionCode') ?? '').toUpperCase();
    const acqDispRaw = (extractTagValue(block, 'transactionAcquiredDisposedCode') ?? '').toUpperCase();
    const acquiredOrDisposed = acqDispRaw === 'A' || acqDispRaw === 'D' ? acqDispRaw : null;
    const ownershipRaw = (extractTagValue(block, 'directOrIndirectOwnership') ?? '').toUpperCase();
    const ownershipType = ownershipRaw === 'D' || ownershipRaw === 'I' ? ownershipRaw : null;
    const totalValueUsd =
      pricePerShare !== null ? Math.round(shares * pricePerShare * 100) / 100 : null;

    transactions.push({
      accessionNumber: meta.accessionNumber,
      filingDate: meta.filingDate,
      periodOfReport,
      insiderName,
      insiderCik,
      officerTitle,
      isDirector,
      isOfficer,
      isTenPercentOwner,
      is10b5One,
      securityTitle: extractTagValue(block, 'securityTitle') ?? 'Common Stock',
      transactionDate: extractTagValue(block, 'transactionDate') ?? meta.filingDate,
      transactionCode: code,
      shares,
      pricePerShare,
      totalValueUsd,
      acquiredOrDisposed,
      sharesOwnedFollowing: parseXmlNumber(extractTagValue(block, 'sharesOwnedFollowingTransaction')),
      ownershipType,
      xmlUrl: meta.xmlUrl,
    });
  }

  return transactions;
}

export async function getInsiderTrades(
  params: {
    tickerOrCik: string;
    limit?: number;
  },
  env: EdgarEnv,
  fetchImpl: typeof fetch = fetch
): Promise<InsiderTradesReport> {
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

  const limit = Math.max(1, Math.min(10, params.limit ?? 5));
  const form4Targets: Array<{ accessionNumber: string; filingDate: string; xmlUrl: string }> = [];
  for (let i = 0; i < recent.accessionNumber.length && form4Targets.length < limit; i++) {
    const form = (recent.form[i] ?? '').toUpperCase();
    if (form !== '4' && form !== '4/A') continue;
    const rawDoc = (recent.primaryDocument[i] ?? '').replace(/^xsl[^/]*\//i, '');
    if (!rawDoc.toLowerCase().endsWith('.xml')) continue;
    const accn = recent.accessionNumber[i];
    const accnNoDashes = accn.replace(/-/g, '');
    form4Targets.push({
      accessionNumber: accn,
      filingDate: recent.filingDate[i] ?? '',
      xmlUrl: `https://www.sec.gov/Archives/edgar/data/${entry.cikNumber}/${accnNoDashes}/${rawDoc}`,
    });
  }

  const parsedLists = await Promise.all(
    form4Targets.map(async (target) => {
      try {
        const xml = await fetchSecText(target.xmlUrl, env, ENTITY_TTL_MS, fetchImpl);
        return parseForm4Xml(xml, target);
      } catch {
        return [] as InsiderTransaction[];
      }
    })
  );

  const transactions = parsedLists.flat();
  let openMarketBuysShares = 0;
  let openMarketBuysUsd = 0;
  let openMarketSellsShares = 0;
  let openMarketSellsUsd = 0;

  for (const tx of transactions) {
    if (tx.transactionCode === 'P') {
      openMarketBuysShares += tx.shares;
      openMarketBuysUsd += tx.totalValueUsd ?? 0;
    } else if (tx.transactionCode === 'S') {
      openMarketSellsShares += tx.shares;
      openMarketSellsUsd += tx.totalValueUsd ?? 0;
    }
  }

  const round2 = (n: number) => Math.round(n * 100) / 100;

  return {
    company: {
      cik: entry.cik,
      ticker: subs.tickers?.[0] ?? (entry.ticker || null),
      name: subs.name || entry.title,
    },
    filingsScanned: form4Targets.length,
    summary: {
      totalTransactions: transactions.length,
      openMarketBuysShares: round2(openMarketBuysShares),
      openMarketBuysUsd: round2(openMarketBuysUsd),
      openMarketSellsShares: round2(openMarketSellsShares),
      openMarketSellsUsd: round2(openMarketSellsUsd),
      netOpenMarketUsd: round2(openMarketBuysUsd - openMarketSellsUsd),
    },
    transactions,
    provenance: {
      source: 'SEC EDGAR Form 4 Ownership XML',
      submissionsUrl: entry.submissionsUrl,
    },
  };
}

interface EftsSearchResponse {
  hits?: {
    total?: { value?: number };
    hits?: Array<{
      _id?: string;
      _source?: {
        adsh?: string;
        form?: string;
        file_date?: string;
        period_ending?: string;
        display_names?: string[];
        ciks?: string[];
        items?: string[];
        file_description?: string;
      };
    }>;
  };
}

export async function searchSecFilings(
  params: {
    query: string;
    tickerOrCik?: string;
    forms?: string[];
    startDate?: string;
    endDate?: string;
    limit?: number;
  },
  env: EdgarEnv,
  fetchImpl: typeof fetch = fetch
): Promise<SecSearchReport> {
  const query = params.query.trim();
  if (!query) {
    throw new Error('query is required');
  }

  const searchParams = new URLSearchParams();
  searchParams.set('q', query);
  const limit = Math.max(1, Math.min(20, params.limit ?? 10));
  searchParams.set('from', '0');
  searchParams.set('size', String(limit));

  if (params.tickerOrCik && params.tickerOrCik.trim()) {
    const entry = await resolveExactCik(params.tickerOrCik, env, fetchImpl);
    searchParams.set('ciks', entry.cik);
  }
  if (params.forms && params.forms.length > 0) {
    searchParams.set('forms', params.forms.map((f) => f.trim().toUpperCase()).join(','));
  }
  if (params.startDate || params.endDate) {
    searchParams.set('dateRange', 'custom');
    if (params.startDate) searchParams.set('startdt', params.startDate);
    if (params.endDate) searchParams.set('enddt', params.endDate);
  }

  const searchUrl = `https://efts.sec.gov/LATEST/search-index?${searchParams.toString()}`;
  const raw = await fetchSecJson<EftsSearchResponse>(searchUrl, env, ENTITY_TTL_MS, fetchImpl);

  const rawHits = raw.hits?.hits ?? [];
  const hits: SecSearchHit[] = rawHits.map((h) => {
    const src = h._source ?? {};
    const adsh = src.adsh ?? '';
    const ciks = src.ciks ?? [];
    const primaryCikNum = ciks[0] ? Number(ciks[0]) : 0;
    const idParts = (h._id ?? '').split(':');
    const filename = idParts[1] ?? '';
    const accnNoDashes = adsh.replace(/-/g, '');
    const documentUrl =
      primaryCikNum && accnNoDashes && filename
        ? `https://www.sec.gov/Archives/edgar/data/${primaryCikNum}/${accnNoDashes}/${filename}`
        : `https://www.sec.gov/edgar/search/#/q=${encodeURIComponent(query)}`;

    return {
      accessionNumber: adsh,
      form: src.form ?? '',
      fileDate: src.file_date ?? '',
      periodEnding: src.period_ending ?? null,
      displayNames: src.display_names ?? [],
      ciks,
      items: src.items ?? [],
      fileDescription: src.file_description ?? null,
      documentUrl,
    };
  });

  return {
    query,
    totalHits: raw.hits?.total?.value ?? hits.length,
    returned: hits.length,
    hits,
    provenance: {
      source: 'SEC EDGAR Full-Text Search (EFTS)',
      searchUrl,
    },
  };
}

function decodeHtmlEntities(raw: string): string {
  return raw
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&apos;|&#39;/gi, "'")
    .replace(/&mdash;|&#8212;/gi, '—')
    .replace(/&ndash;|&#8211;/gi, '–')
    .replace(/&rsquo;|&#8217;/gi, "'")
    .replace(/&lsquo;|&#8216;/gi, "'")
    .replace(/&rdquo;|&#8221;/gi, '"')
    .replace(/&ldquo;|&#8220;/gi, '"')
    .replace(/&#(\d+);/g, (_, code) => {
      const n = Number(code);
      return Number.isFinite(n) && n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : '';
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
      const n = parseInt(hex, 16);
      return Number.isFinite(n) && n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : '';
    });
}

/**
 * Strip SEC HTML / Inline XBRL (iXBRL) hidden metadata, scripts, and markup into clean readable text.
 */
export function stripSecHtmlToText(rawHtml: string): string {
  const withoutBoilerplate = rawHtml
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<ix:header\b[^>]*>[\s\S]*?<\/ix:header>/gi, '')
    .replace(/<ix:hidden\b[^>]*>[\s\S]*?<\/ix:hidden>/gi, '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<title\b[^>]*>[\s\S]*?<\/title>/gi, '');

  const withBreaks = withoutBoilerplate
    .replace(/<(?:br|hr)\s*\/?>/gi, '\n')
    .replace(/<\/(?:p|div|tr|li|h[1-6]|blockquote|section|article|table)>/gi, '\n')
    .replace(/<\/(?:td|th)>/gi, '\t')
    .replace(/<[^>]+>/g, '');

  const decoded = decodeHtmlEntities(withBreaks);
  return decoded
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .filter((line, idx, arr) => line.length > 0 || (idx > 0 && arr[idx - 1].length > 0))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function detectSecSectionHeadings(plainText: string): string[] {
  const seen = new Set<string>();
  const headings: string[] = [];
  for (const line of plainText.split('\n')) {
    if (line.length < 4 || line.length > 120) continue;
    if (/^(?:item\s+\d+(?:\.\d+[a-z]?)?\b|part\s+[ivx]+\b|signatures?\b)/i.test(line)) {
      const normalized = line.replace(/\s+/g, ' ').trim();
      const key = normalized.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        headings.push(normalized);
        if (headings.length >= 25) break;
      }
    }
  }
  return headings;
}

function findSectionMatchIndex(plainText: string, query: string): { index: number; label: string } | null {
  const escaped = query
    .trim()
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\s+/g, '\\s+');
  if (!escaped) return null;

  const headingRegex = new RegExp(`^[^\\n]*${escaped}[^\\n]*$`, 'im');
  const headingMatch = headingRegex.exec(plainText);
  if (headingMatch) {
    return { index: headingMatch.index, label: headingMatch[0].trim().slice(0, 120) };
  }

  const inlineRegex = new RegExp(escaped, 'i');
  const inlineMatch = inlineRegex.exec(plainText);
  if (inlineMatch) {
    return { index: inlineMatch.index, label: query.trim() };
  }
  return null;
}

export async function getSecFilingExcerpt(
  params: {
    tickerOrCik: string;
    accessionNumber?: string;
    form?: string;
    sectionOrQuery?: string;
    maxChars?: number;
  },
  env: EdgarEnv,
  fetchImpl: typeof fetch = fetch
): Promise<SecFilingExcerptResult> {
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

  let matchIdx = -1;
  if (params.accessionNumber && params.accessionNumber.trim()) {
    const targetAccn = params.accessionNumber.replace(/-/g, '').trim().toLowerCase();
    matchIdx = recent.accessionNumber.findIndex(
      (accn) => accn.replace(/-/g, '').toLowerCase() === targetAccn
    );
    if (matchIdx === -1) {
      throw new Error(
        `Accession number "${params.accessionNumber}" not found in recent filings for CIK ${entry.cik}`
      );
    }
  } else {
    const targetForm = (params.form ?? '8-K').trim().toUpperCase();
    matchIdx = recent.form.findIndex((f) => (f ?? '').toUpperCase() === targetForm);
    if (matchIdx === -1) {
      matchIdx = recent.form.findIndex((f) => (f ?? '').toUpperCase().startsWith(`${targetForm}/`));
    }
    if (matchIdx === -1) {
      throw new Error(`No recent "${targetForm}" filing found for CIK ${entry.cik}`);
    }
  }

  const accessionNumber = recent.accessionNumber[matchIdx];
  const form = recent.form[matchIdx] ?? '';
  const primaryDocument = (recent.primaryDocument[matchIdx] ?? '').replace(/^xsl[^/]*\//i, '');
  if (!primaryDocument) {
    throw new Error(`Missing primaryDocument for accession ${accessionNumber}`);
  }

  const filingUrl = formatSecFilingUrl(entry.cikNumber, accessionNumber, primaryDocument);
  const rawDocument = await fetchSecText(filingUrl, env, ENTITY_TTL_MS, fetchImpl);
  const plainText = stripSecHtmlToText(rawDocument);
  const detectedSections = detectSecSectionHeadings(plainText);

  const maxChars = Math.max(500, Math.min(30_000, Math.floor(params.maxChars ?? 12_000)));
  let startOffset = 0;
  let matchedSection: string | null = null;

  if (params.sectionOrQuery && params.sectionOrQuery.trim()) {
    const match = findSectionMatchIndex(plainText, params.sectionOrQuery);
    if (match) {
      const lineStart = plainText.lastIndexOf('\n', match.index);
      startOffset = lineStart >= 0 && match.index - lineStart < 200 ? lineStart + 1 : match.index;
      matchedSection = match.label;
    }
  }

  const excerpt = plainText.slice(startOffset, startOffset + maxChars);
  const truncated = startOffset + excerpt.length < plainText.length;

  return {
    company: {
      cik: entry.cik,
      ticker: subs.tickers?.[0] ?? (entry.ticker || null),
      name: subs.name || entry.title,
    },
    filing: {
      accessionNumber,
      form,
      filingDate: recent.filingDate[matchIdx] ?? '',
      reportDate: recent.reportDate[matchIdx] ?? '',
      primaryDocument,
      items: parseRecentItems(recent.items?.[matchIdx]),
      filingUrl,
    },
    extraction: {
      totalPlainChars: plainText.length,
      returnedChars: excerpt.length,
      truncated,
      matchedSection,
      detectedSections,
      excerpt,
    },
    provenance: {
      source: 'SEC EDGAR Primary Filing Document',
      submissionsUrl: entry.submissionsUrl,
      filingUrl,
    },
  };
}

interface Raw13fRow {
  nameOfIssuer: string;
  titleOfClass: string;
  cusip: string;
  valueUsd: number;
  shares: number;
  amountType: string;
  putCall: 'PUT' | 'CALL' | null;
  investmentDiscretion: string | null;
  votingSole: number;
  votingShared: number;
  votingNone: number;
}

export function parse13fInfoTableXml(xml: string): Raw13fRow[] {
  const blocks = Array.from(
    xml.matchAll(/<(?:[a-z0-9_-]+:)?infoTable(?:\s[^>]*)?>([\s\S]*?)<\/(?:[a-z0-9_-]+:)?infoTable>/gi)
  );
  const rows: Raw13fRow[] = [];

  for (const match of blocks) {
    const block = match[1];
    const nameOfIssuer = extractTagValue(block, 'nameOfIssuer');
    const cusip = (extractTagValue(block, 'cusip') ?? '').toUpperCase();
    const valueUsd = parseXmlNumber(extractTagValue(block, 'value'));
    const shares = parseXmlNumber(extractTagValue(block, 'sshPrnamt'));
    if (!nameOfIssuer || !cusip || valueUsd === null || shares === null) continue;

    const putCallRaw = (extractTagValue(block, 'putCall') ?? '').toUpperCase();
    const putCall = putCallRaw === 'PUT' || putCallRaw === 'CALL' ? putCallRaw : null;

    rows.push({
      nameOfIssuer,
      titleOfClass: extractTagValue(block, 'titleOfClass') ?? 'COM',
      cusip,
      valueUsd,
      shares,
      amountType: (extractTagValue(block, 'sshPrnamtType') ?? 'SH').toUpperCase(),
      putCall,
      investmentDiscretion: extractTagValue(block, 'investmentDiscretion'),
      votingSole: parseXmlNumber(extractTagValue(block, 'Sole')) ?? 0,
      votingShared: parseXmlNumber(extractTagValue(block, 'Shared')) ?? 0,
      votingNone: parseXmlNumber(extractTagValue(block, 'None')) ?? 0,
    });
  }

  return rows;
}

function consolidate13fRows(rows: Raw13fRow[]): {
  totalValueUsd: number;
  holdings: Sec13fHolding[];
} {
  const grouped = new Map<string, Sec13fHolding>();
  let totalValueUsd = 0;

  for (const row of rows) {
    totalValueUsd += row.valueUsd;
    const key = `${row.cusip}|${row.putCall ?? 'EQUITY'}|${row.amountType}`;
    const existing = grouped.get(key);
    if (existing) {
      existing.valueUsd += row.valueUsd;
      existing.shares += row.shares;
      existing.votingSole += row.votingSole;
      existing.votingShared += row.votingShared;
      existing.votingNone += row.votingNone;
      existing.lineItemsCount += 1;
    } else {
      grouped.set(key, {
        nameOfIssuer: row.nameOfIssuer,
        titleOfClass: row.titleOfClass,
        cusip: row.cusip,
        valueUsd: row.valueUsd,
        shares: row.shares,
        amountType: row.amountType,
        putCall: row.putCall,
        weightPct: 0,
        impliedPriceUsd: null,
        investmentDiscretion: row.investmentDiscretion,
        votingSole: row.votingSole,
        votingShared: row.votingShared,
        votingNone: row.votingNone,
        lineItemsCount: 1,
      });
    }
  }

  const holdings = Array.from(grouped.values()).map((h) => ({
    ...h,
    weightPct: totalValueUsd > 0 ? Math.round((h.valueUsd / totalValueUsd) * 10_000) / 100 : 0,
    impliedPriceUsd: h.shares > 0 ? Math.round((h.valueUsd / h.shares) * 100) / 100 : null,
  }));

  holdings.sort((a, b) => b.valueUsd - a.valueUsd);
  return { totalValueUsd, holdings };
}

async function resolve13fManagerCik(
  managerOrCik: string,
  env: EdgarEnv,
  fetchImpl: typeof fetch
): Promise<{ cik: string; cikNumber: number; name: string; submissionsUrl: string }> {
  const trimmed = managerOrCik.trim();
  if (!trimmed) {
    throw new Error('managerOrCik is required');
  }

  if (/^\d{1,10}$/.test(trimmed)) {
    const cik = padCik(trimmed);
    const cikNumber = Number.parseInt(cik, 10);
    return {
      cik,
      cikNumber,
      name: `CIK ${cik}`,
      submissionsUrl: `https://data.sec.gov/submissions/CIK${cik}.json`,
    };
  }

  const resolved = await resolveCompany(trimmed, env, fetchImpl, 3);
  if (resolved.exact) {
    return {
      cik: resolved.exact.cik,
      cikNumber: resolved.exact.cikNumber,
      name: resolved.exact.title,
      submissionsUrl: resolved.exact.submissionsUrl,
    };
  }

  // Many 13F institutional managers (hedge funds / asset managers) are not public equity tickers,
  // so fall back to SEC EFTS entity search filtered to Form 13F-HR.
  const eftsUrl = `https://efts.sec.gov/LATEST/search-index?forms=13F-HR&entityName=${encodeURIComponent(trimmed)}`;
  const efts = await fetchSecJson<{
    hits?: {
      hits?: Array<{
        _source?: { ciks?: string[]; display_names?: string[] };
      }>;
    };
  }>(eftsUrl, env, ENTITY_TTL_MS, fetchImpl);

  const firstHit = efts.hits?.hits?.find((h) => (h._source?.ciks?.length ?? 0) > 0);
  const rawCik = firstHit?._source?.ciks?.[0];
  if (rawCik) {
    const cik = padCik(rawCik);
    const cikNumber = Number.parseInt(cik, 10);
    const displayName = firstHit?._source?.display_names?.[0]?.replace(/\s*\(CIK\s+\d+\)\s*$/i, '').trim();
    return {
      cik,
      cikNumber,
      name: displayName || trimmed,
      submissionsUrl: `https://data.sec.gov/submissions/CIK${cik}.json`,
    };
  }

  if (resolved.matches.length > 0) {
    const m = resolved.matches[0];
    return {
      cik: m.cik,
      cikNumber: m.cikNumber,
      name: m.title,
      submissionsUrl: m.submissionsUrl,
    };
  }

  throw new Error(`Could not resolve SEC 13F manager for "${managerOrCik}"`);
}

interface SecArchiveIndexJson {
  directory?: {
    item?: Array<{ name?: string; type?: string }>;
  };
}

export async function get13fHoldings(
  params: {
    managerOrCik: string;
    accessionNumber?: string;
    issuerQuery?: string;
    limit?: number;
  },
  env: EdgarEnv,
  fetchImpl: typeof fetch = fetch
): Promise<Sec13fHoldingsReport> {
  const manager = await resolve13fManagerCik(params.managerOrCik, env, fetchImpl);
  const subs = await fetchSecJson<SecSubmissionsJson>(
    manager.submissionsUrl,
    env,
    ENTITY_TTL_MS,
    fetchImpl
  );

  const recent = subs.filings?.recent;
  if (!recent) {
    throw new Error(`No recent filings payload found for CIK ${manager.cik}`);
  }

  let matchIdx = -1;
  if (params.accessionNumber && params.accessionNumber.trim()) {
    const targetAccn = params.accessionNumber.replace(/-/g, '').trim().toLowerCase();
    matchIdx = recent.accessionNumber.findIndex(
      (accn) => accn.replace(/-/g, '').toLowerCase() === targetAccn
    );
    if (matchIdx === -1) {
      throw new Error(
        `Accession number "${params.accessionNumber}" not found in recent filings for CIK ${manager.cik}`
      );
    }
  } else {
    matchIdx = recent.form.findIndex((f) => {
      const upper = (f ?? '').toUpperCase();
      return upper === '13F-HR' || upper === '13F-HR/A';
    });
    if (matchIdx === -1) {
      throw new Error(`No recent 13F-HR filing found for CIK ${manager.cik}`);
    }
  }

  const accessionNumber = recent.accessionNumber[matchIdx];
  const accnNoDashes = accessionNumber.replace(/-/g, '');
  const baseDirUrl = `https://www.sec.gov/Archives/edgar/data/${manager.cikNumber}/${accnNoDashes}`;
  const indexJson = await fetchSecJson<SecArchiveIndexJson>(
    `${baseDirUrl}/index.json`,
    env,
    ENTITY_TTL_MS,
    fetchImpl
  );

  const xmlCandidates = (indexJson.directory?.item ?? [])
    .map((item) => item.name ?? '')
    .filter((name) => {
      const lower = name.toLowerCase();
      return lower.endsWith('.xml') && lower !== 'primary_doc.xml';
    })
    .sort((a, b) => {
      const aInfo = a.toLowerCase().includes('info') ? 0 : 1;
      const bInfo = b.toLowerCase().includes('info') ? 0 : 1;
      return aInfo - bInfo;
    });

  let infoTableUrl = '';
  let rawRows: Raw13fRow[] = [];
  for (const filename of xmlCandidates) {
    const candidateUrl = `${baseDirUrl}/${filename}`;
    try {
      const xml = await fetchSecText(candidateUrl, env, ENTITY_TTL_MS, fetchImpl);
      if (/<(?:[a-z0-9_-]+:)?infoTable(?:\s|>)/i.test(xml)) {
        rawRows = parse13fInfoTableXml(xml);
        infoTableUrl = candidateUrl;
        if (rawRows.length > 0) break;
      }
    } catch {
      // Try next XML artifact in the accession directory.
    }
  }

  if (!infoTableUrl || rawRows.length === 0) {
    throw new Error(`No 13F-HR informationTable XML found in accession ${accessionNumber}`);
  }

  const consolidated = consolidate13fRows(rawRows);
  const query = params.issuerQuery?.trim().toLowerCase() ?? '';
  const filtered = query
    ? consolidated.holdings.filter(
        (h) =>
          h.nameOfIssuer.toLowerCase().includes(query) || h.cusip.toLowerCase().includes(query)
      )
    : consolidated.holdings;

  const limit = Math.max(1, Math.min(100, Math.floor(params.limit ?? 25)));
  const returned = filtered.slice(0, limit);

  return {
    manager: {
      cik: manager.cik,
      name: subs.name || manager.name,
    },
    filing: {
      accessionNumber,
      form: recent.form[matchIdx] ?? '13F-HR',
      filingDate: recent.filingDate[matchIdx] ?? '',
      reportDate: recent.reportDate[matchIdx] ?? '',
      infoTableUrl,
    },
    summary: {
      totalValueUsd: consolidated.totalValueUsd,
      totalLineItems: rawRows.length,
      uniquePositions: consolidated.holdings.length,
      matchedPositions: filtered.length,
      returnedPositions: returned.length,
    },
    holdings: returned,
    provenance: {
      source: 'SEC EDGAR Form 13F Information Table XML',
      submissionsUrl: manager.submissionsUrl,
      infoTableUrl,
    },
  };
}
