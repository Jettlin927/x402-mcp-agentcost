export type ProviderId = 'openai' | 'anthropic' | 'google' | 'deepseek' | 'custom';
export type ModelTier = 'frontier' | 'balanced' | 'economy';

export interface LLMModel {
  id: string;
  name: string;
  provider: ProviderId;
  providerLabel: string;
  tier: ModelTier;
  /** USD per 1M fresh input tokens */
  inputPerM: number;
  /** USD per 1M cache-read input tokens */
  cachedInputPerM: number;
  /** Multiplier applied to inputPerM when writing cache on first turn (e.g., 1.25 for Anthropic, 1.0 for OpenAI/DeepSeek) */
  cacheWriteMultiplier: number;
  /** USD per 1M output (including reasoning) tokens */
  outputPerM: number;
  /** Context window in tokens */
  contextWindow: number;
  /** Optional context length above which long-context pricing kicks in */
  longContextThreshold?: number;
  /** Multiplier for input/output above longContextThreshold */
  longContextMultiplier?: number;
  /** Composite Intelligence Index (Artificial Analysis reference scale, Nov 2026) */
  intelligenceIndex: number;
  /** Agentic coding success rate on SWE-bench Verified (%) */
  sweBenchPct: number;
  /** Median generation speed (output tokens / sec) */
  speedTokPerSec: number;
  /** Short note shown in UI */
  note: string;
  noteZh: string;
}

export const MODELS: LLMModel[] = [
  // Anthropic
  {
    id: 'claude-sonnet-5-5',
    name: 'Claude Sonnet 5.5',
    provider: 'anthropic',
    providerLabel: 'Anthropic',
    tier: 'balanced',
    inputPerM: 2.0,
    cachedInputPerM: 0.2,
    cacheWriteMultiplier: 1.25,
    outputPerM: 10.0,
    contextWindow: 1_000_000,
    longContextThreshold: 200_000,
    longContextMultiplier: 1.5,
    intelligenceIndex: 56,
    sweBenchPct: 80.8,
    speedTokPerSec: 92,
    note: 'Default workhorse for coding & MCP tool-calling agents',
    noteZh: '编程与 MCP 工具调用 Agent 的主力均衡模型',
  },
  {
    id: 'claude-opus-5-5',
    name: 'Claude Opus 5.5',
    provider: 'anthropic',
    providerLabel: 'Anthropic',
    tier: 'frontier',
    inputPerM: 4.0,
    cachedInputPerM: 0.4,
    cacheWriteMultiplier: 1.25,
    outputPerM: 20.0,
    contextWindow: 1_000_000,
    longContextThreshold: 200_000,
    longContextMultiplier: 1.5,
    intelligenceIndex: 59,
    sweBenchPct: 85.2,
    speedTokPerSec: 58,
    note: 'Top-tier architectural reasoning & complex multi-file refactors',
    noteZh: '顶级架构推理与复杂跨文件重构模型',
  },
  {
    id: 'claude-fable-5-2',
    name: 'Claude Fable 5.2',
    provider: 'anthropic',
    providerLabel: 'Anthropic',
    tier: 'frontier',
    inputPerM: 8.0,
    cachedInputPerM: 0.4,
    cacheWriteMultiplier: 1.25,
    outputPerM: 40.0,
    contextWindow: 1_000_000,
    intelligenceIndex: 65,
    sweBenchPct: 86.4,
    speedTokPerSec: 44,
    note: 'Ultra-frontier reasoning tier with 95% cache read discount',
    noteZh: '超旗舰深度推理档位，缓存命中最高省 95%',
  },
  {
    id: 'claude-haiku-5-5',
    name: 'Claude Haiku 5.5',
    provider: 'anthropic',
    providerLabel: 'Anthropic',
    tier: 'economy',
    inputPerM: 0.1,
    cachedInputPerM: 0.01,
    cacheWriteMultiplier: 1.25,
    outputPerM: 0.5,
    contextWindow: 200_000,
    longContextThreshold: 100_000,
    longContextMultiplier: 1.5,
    intelligenceIndex: 44,
    sweBenchPct: 66.4,
    speedTokPerSec: 175,
    note: 'Ultra-fast worker model for high-volume sub-agent loops',
    noteZh: '极速低价执行模型，适合高频子 Agent 循环',
  },

  // OpenAI
  {
    id: 'gpt-6-2-sol',
    name: 'GPT-6.2 Sol',
    provider: 'openai',
    providerLabel: 'OpenAI',
    tier: 'balanced',
    inputPerM: 2.0,
    cachedInputPerM: 0.1,
    cacheWriteMultiplier: 1.0,
    outputPerM: 10.0,
    contextWindow: 1_000_000,
    longContextThreshold: 272_000,
    longContextMultiplier: 2.0,
    intelligenceIndex: 55,
    sweBenchPct: 79.6,
    speedTokPerSec: 96,
    note: 'Everyday coding & agent model; 95% cache discount, 2x over 272k ctx',
    noteZh: '主力编程模型，缓存省 95%，超过 272k 上下文翻倍计费',
  },
  {
    id: 'gpt-6-2-astra',
    name: 'GPT-6.2 Astra',
    provider: 'openai',
    providerLabel: 'OpenAI',
    tier: 'frontier',
    inputPerM: 8.0,
    cachedInputPerM: 0.4,
    cacheWriteMultiplier: 1.0,
    outputPerM: 40.0,
    contextWindow: 1_000_000,
    intelligenceIndex: 62,
    sweBenchPct: 84.8,
    speedTokPerSec: 52,
    note: 'Frontier planner model; best paired with Luna in hybrid routing',
    noteZh: '旗舰规划模型，最适合与 Luna 搭配混合路由',
  },
  {
    id: 'gpt-6-luna',
    name: 'GPT-6 Luna',
    provider: 'openai',
    providerLabel: 'OpenAI',
    tier: 'economy',
    inputPerM: 0.15,
    cachedInputPerM: 0.015,
    cacheWriteMultiplier: 1.0,
    outputPerM: 0.6,
    contextWindow: 400_000,
    intelligenceIndex: 43,
    sweBenchPct: 65.0,
    speedTokPerSec: 185,
    note: 'High-volume economy model for tool extraction & triage',
    noteZh: '高并发经济型模型，适合工具调用与客服分流',
  },

  // Google Gemini
  {
    id: 'gemini-4-carbon',
    name: 'Gemini 4 Carbon',
    provider: 'google',
    providerLabel: 'Google',
    tier: 'frontier',
    inputPerM: 2.0,
    cachedInputPerM: 0.2,
    cacheWriteMultiplier: 1.0,
    outputPerM: 10.0,
    contextWindow: 2_000_000,
    intelligenceIndex: 60,
    sweBenchPct: 82.5,
    speedTokPerSec: 84,
    note: '2M context frontier reasoning & agentic model',
    noteZh: '200 万上下文旗舰推理与 Agent 模型',
  },
  {
    id: 'gemini-4-argon',
    name: 'Gemini 4 Argon',
    provider: 'google',
    providerLabel: 'Google',
    tier: 'balanced',
    inputPerM: 1.5,
    cachedInputPerM: 0.15,
    cacheWriteMultiplier: 1.0,
    outputPerM: 7.5,
    contextWindow: 2_000_000,
    intelligenceIndex: 54,
    sweBenchPct: 77.4,
    speedTokPerSec: 108,
    note: 'Balanced long-context model for repo-wide analysis',
    noteZh: '均衡长上下文模型，适合全仓库代码分析',
  },
  {
    id: 'gemini-3-8-flash',
    name: 'Gemini 3.8 Flash',
    provider: 'google',
    providerLabel: 'Google',
    tier: 'economy',
    inputPerM: 0.75,
    cachedInputPerM: 0.075,
    cacheWriteMultiplier: 1.0,
    outputPerM: 3.75,
    contextWindow: 1_000_000,
    intelligenceIndex: 48,
    sweBenchPct: 71.5,
    speedTokPerSec: 155,
    note: 'Fast agentic execution with strong multimodal & tool accuracy',
    noteZh: '高速 Agent 执行模型，多模态与工具调用表现稳定',
  },
  {
    id: 'gemini-3-5-flash-lite',
    name: 'Gemini 3.5 Flash-Lite',
    provider: 'google',
    providerLabel: 'Google',
    tier: 'economy',
    inputPerM: 0.25,
    cachedInputPerM: 0.025,
    cacheWriteMultiplier: 1.0,
    outputPerM: 1.5,
    contextWindow: 1_000_000,
    intelligenceIndex: 41,
    sweBenchPct: 61.2,
    speedTokPerSec: 210,
    note: 'Low-latency economy tier for scraping & sub-agent loops',
    noteZh: '低延迟经济档，适合网页抓取与子任务循环',
  },

  // DeepSeek
  {
    id: 'deepseek-v4-pro-offpeak',
    name: 'DeepSeek V4 Pro (Off-Peak)',
    provider: 'deepseek',
    providerLabel: 'DeepSeek',
    tier: 'balanced',
    inputPerM: 0.66,
    cachedInputPerM: 0.022,
    cacheWriteMultiplier: 1.0,
    outputPerM: 1.98,
    contextWindow: 256_000,
    intelligenceIndex: 53,
    sweBenchPct: 80.2,
    speedTokPerSec: 72,
    note: 'Off-peak UTC window; 96.7% cache hit discount',
    noteZh: '非高峰时段价格，缓存命中折扣高达 96.7%',
  },
  {
    id: 'deepseek-v4-pro-peak',
    name: 'DeepSeek V4 Pro (Peak)',
    provider: 'deepseek',
    providerLabel: 'DeepSeek',
    tier: 'balanced',
    inputPerM: 1.32,
    cachedInputPerM: 0.044,
    cacheWriteMultiplier: 1.0,
    outputPerM: 3.96,
    contextWindow: 256_000,
    intelligenceIndex: 53,
    sweBenchPct: 80.2,
    speedTokPerSec: 65,
    note: 'Standard peak hours; massive savings on multi-turn loops',
    noteZh: '标准高峰时段，多轮 Agent 循环性价比极高',
  },
  {
    id: 'deepseek-v4-1-flash-offpeak',
    name: 'DeepSeek V4.1 Flash (Off-Peak)',
    provider: 'deepseek',
    providerLabel: 'DeepSeek',
    tier: 'economy',
    inputPerM: 0.15,
    cachedInputPerM: 0.003,
    cacheWriteMultiplier: 1.0,
    outputPerM: 0.6,
    contextWindow: 256_000,
    intelligenceIndex: 46,
    sweBenchPct: 69.8,
    speedTokPerSec: 135,
    note: '98% cache hit discount — pennies per thousand agent turns',
    noteZh: '缓存命中直降 98%，千次 Agent 轮次仅需几美分',
  },
  {
    id: 'deepseek-v4-1-flash-peak',
    name: 'DeepSeek V4.1 Flash (Peak)',
    provider: 'deepseek',
    providerLabel: 'DeepSeek',
    tier: 'economy',
    inputPerM: 0.3,
    cachedInputPerM: 0.006,
    cacheWriteMultiplier: 1.0,
    outputPerM: 1.2,
    contextWindow: 256_000,
    intelligenceIndex: 46,
    sweBenchPct: 69.8,
    speedTokPerSec: 120,
    note: 'Peak economy model with $0.006/M cached reads',
    noteZh: '高峰经济档，缓存读取仅 $0.006 / 百万 Token',
  },
];

export function getModelById(id: string): LLMModel {
  return MODELS.find((m) => m.id === id) ?? MODELS[0];
}
