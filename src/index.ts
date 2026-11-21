import { getModelById, MODELS } from './models';
import {
  compareAllModels,
  DEFAULT_CONFIG,
  inspectPromptOverhead,
  simulateAgentCost,
  type SimulationConfig,
} from './simulator';
import {
  buildPaymentChallenge,
  buildPaymentReceiptHeader,
  create402Response,
  verifyAndSettleX402,
  type X402Env,
} from './x402';

export interface WorkerEnv extends X402Env {
  ASSETS?: { fetch: (req: Request) => Promise<Response> };
}

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
    name: 'list_models_pricing',
    priceUsd: 0,
    description:
      '[FREE] List all 15+ LLM models with Nov 2026 API pricing (input, cached input, output), context windows, Artificial Analysis Intelligence Index, and SWE-bench Verified pass rates.',
    inputSchema: {
      type: 'object',
      properties: {
        tier: {
          type: 'string',
          enum: ['all', 'frontier', 'balanced', 'economy'],
          description: 'Optional tier filter',
        },
      },
    },
  },
  {
    name: 'simulate_agent_cost',
    priceUsd: 0.005,
    description:
      '[x402: $0.005 USDC] Simulate multi-turn O(N^2) AI agent loop costs including prompt caching, retries, long-context step-ups, and optional hybrid Planner/Worker routing.',
    inputSchema: {
      type: 'object',
      properties: {
        modelId: { type: 'string', description: 'Primary model ID (e.g. claude-sonnet-5-5)' },
        workerModelId: { type: 'string', description: 'Worker model ID for hybrid routing' },
        turns: { type: 'number', description: 'Number of agent turns (1-100)', default: 24 },
        staticPrefixTokens: { type: 'number', default: 12000 },
        toolOutputTokensPerTurn: { type: 'number', default: 2600 },
        outputTokensPerTurn: { type: 'number', default: 900 },
        reasoningTokensPerTurn: { type: 'number', default: 600 },
        enableCaching: { type: 'boolean', default: true },
        cacheHitRate: { type: 'number', description: '0..0.98', default: 0.85 },
        retryRate: { type: 'number', description: '0..0.5', default: 0.12 },
        runsPerDay: { type: 'number', default: 40 },
        enableHybridRouting: { type: 'boolean', default: false },
      },
    },
  },
  {
    name: 'audit_prompt_cache_tax',
    priceUsd: 0.01,
    description:
      '[x402: $0.01 USDC] Audit a CLAUDE.md, AGENTS.md, SKILL.md, or MCP JSON schema for token count, 1,000-run dollar cost (cached vs uncached), hardcoded API key leaks, and prompt cache-busters.',
    inputSchema: {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'Raw text of CLAUDE.md / AGENTS.md / mcp.json' },
        turns: { type: 'number', description: 'Average turns per agent run', default: 20 },
        modelId: { type: 'string', default: 'claude-sonnet-5-5' },
      },
      required: ['content'],
    },
  },
  {
    name: 'recommend_pareto_route',
    priceUsd: 0.005,
    description:
      '[x402: $0.005 USDC] Compute the Pareto-optimal model ranking and best Hybrid Planner/Worker routing pair for a given agent workload, minimum SWE-bench capability threshold, and monthly budget.',
    inputSchema: {
      type: 'object',
      properties: {
        turns: { type: 'number', default: 20 },
        staticPrefixTokens: { type: 'number', default: 10000 },
        toolOutputTokensPerTurn: { type: 'number', default: 2500 },
        runsPerDay: { type: 'number', default: 50 },
        minSweBenchPct: {
          type: 'number',
          description: 'Minimum acceptable SWE-bench Verified pass rate (%)',
          default: 75,
        },
        maxMonthlyUsd: {
          type: 'number',
          description: 'Optional monthly budget ceiling in USD',
        },
      },
    },
  },
];

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

function executeTool(name: string, args: Record<string, unknown>): unknown {
  if (name === 'list_models_pricing') {
    const tier = typeof args.tier === 'string' ? args.tier : 'all';
    const items = tier === 'all' ? MODELS : MODELS.filter((m) => m.tier === tier);
    return {
      pricingDate: '2026-11',
      count: items.length,
      models: items.map((m) => ({
        id: m.id,
        name: m.name,
        provider: m.providerLabel,
        tier: m.tier,
        inputPerM: m.inputPerM,
        cachedInputPerM: m.cachedInputPerM,
        outputPerM: m.outputPerM,
        contextWindow: m.contextWindow,
        intelligenceIndex: m.intelligenceIndex,
        sweBenchPct: m.sweBenchPct,
        speedTokPerSec: m.speedTokPerSec,
      })),
    };
  }

  if (name === 'simulate_agent_cost') {
    const cfg: SimulationConfig = {
      ...DEFAULT_CONFIG,
      ...(typeof args.modelId === 'string' ? { modelId: args.modelId } : {}),
      ...(typeof args.workerModelId === 'string' ? { workerModelId: args.workerModelId } : {}),
      ...(typeof args.turns === 'number' ? { turns: Math.min(100, Math.max(1, args.turns)) } : {}),
      ...(typeof args.staticPrefixTokens === 'number'
        ? { staticPrefixTokens: Math.max(0, args.staticPrefixTokens) }
        : {}),
      ...(typeof args.toolOutputTokensPerTurn === 'number'
        ? { toolOutputTokensPerTurn: Math.max(0, args.toolOutputTokensPerTurn) }
        : {}),
      ...(typeof args.outputTokensPerTurn === 'number'
        ? { outputTokensPerTurn: Math.max(10, args.outputTokensPerTurn) }
        : {}),
      ...(typeof args.reasoningTokensPerTurn === 'number'
        ? { reasoningTokensPerTurn: Math.max(0, args.reasoningTokensPerTurn) }
        : {}),
      ...(typeof args.enableCaching === 'boolean' ? { enableCaching: args.enableCaching } : {}),
      ...(typeof args.cacheHitRate === 'number' ? { cacheHitRate: args.cacheHitRate } : {}),
      ...(typeof args.retryRate === 'number' ? { retryRate: args.retryRate } : {}),
      ...(typeof args.runsPerDay === 'number' ? { runsPerDay: Math.max(1, args.runsPerDay) } : {}),
      ...(typeof args.enableHybridRouting === 'boolean'
        ? { enableHybridRouting: args.enableHybridRouting }
        : {}),
    };

    const res = simulateAgentCost(cfg);
    return {
      model: res.primaryModel.name,
      workerModel: cfg.enableHybridRouting ? res.workerModel.name : null,
      effectiveTurns: res.effectiveTurns,
      perRunCostUsd: Number(res.perRunCost.toFixed(6)),
      uncachedPerRunCostUsd: Number(res.uncachedPerRunCost.toFixed(6)),
      naiveLinearCostUsd: Number(res.naiveLinearCost.toFixed(6)),
      quadraticMultiplier: Number(res.quadraticMultiplier.toFixed(2)),
      cacheSavingsPct: Number(res.cacheSavingsPct.toFixed(1)),
      hybridSavingsPct: Number(res.hybridSavingsPct.toFixed(1)),
      monthlyCostUsd: Number(res.monthlyCost.toFixed(2)),
      peakContextTokens: res.peakContextTokens,
      contextOverflow: res.contextOverflow,
      breakdown: res.breakdown,
    };
  }

  if (name === 'audit_prompt_cache_tax') {
    const content = typeof args.content === 'string' ? args.content : '';
    const turns = typeof args.turns === 'number' ? args.turns : 20;
    const model = getModelById(typeof args.modelId === 'string' ? args.modelId : 'claude-sonnet-5-5');
    const report = inspectPromptOverhead(content, turns, model);
    return {
      model: model.name,
      turns,
      ...report,
    };
  }

  if (name === 'recommend_pareto_route') {
    const cfg: SimulationConfig = {
      ...DEFAULT_CONFIG,
      ...(typeof args.turns === 'number' ? { turns: Math.min(100, Math.max(1, args.turns)) } : {}),
      ...(typeof args.staticPrefixTokens === 'number'
        ? { staticPrefixTokens: Math.max(0, args.staticPrefixTokens) }
        : {}),
      ...(typeof args.toolOutputTokensPerTurn === 'number'
        ? { toolOutputTokensPerTurn: Math.max(0, args.toolOutputTokensPerTurn) }
        : {}),
      ...(typeof args.runsPerDay === 'number' ? { runsPerDay: Math.max(1, args.runsPerDay) } : {}),
    };
    const minSwe = typeof args.minSweBenchPct === 'number' ? args.minSweBenchPct : 75;
    const maxBudget = typeof args.maxMonthlyUsd === 'number' ? args.maxMonthlyUsd : undefined;

    const all = compareAllModels(cfg);
    const eligible = all.filter(
      (r) =>
        !r.contextOverflow &&
        r.model.sweBenchPct >= minSwe &&
        (maxBudget === undefined || r.monthlyCost <= maxBudget)
    );

    const bestOverall = eligible[0] ?? all[0];
    const bestEconomyWorker =
      all
        .filter((r) => r.model.tier === 'economy' && !r.contextOverflow)
        .sort((a, b) => b.valueScore - a.valueScore)[0] ?? all[all.length - 1];

    const hybridSim = simulateAgentCost({
      ...cfg,
      modelId: bestOverall.model.id,
      workerModelId: bestEconomyWorker.model.id,
      enableHybridRouting: true,
      plannerInterval: 5,
    });

    return {
      criteria: { minSweBenchPct: minSwe, maxMonthlyUsd: maxBudget ?? null },
      recommendedSingleModel: {
        id: bestOverall.model.id,
        name: bestOverall.model.name,
        valueScore: bestOverall.valueScore,
        isParetoOptimal: bestOverall.isParetoOptimal,
        sweBenchPct: bestOverall.model.sweBenchPct,
        intelligenceIndex: bestOverall.model.intelligenceIndex,
        perRunCostUsd: Number(bestOverall.perRunCost.toFixed(5)),
        costPerSolvedTaskUsd: Number(bestOverall.costPerSolvedTask.toFixed(5)),
        monthlyCostUsd: Number(bestOverall.monthlyCost.toFixed(2)),
      },
      recommendedHybridRoute: {
        planner: bestOverall.model.name,
        worker: bestEconomyWorker.model.name,
        plannerInterval: 5,
        monthlyCostUsd: Number(hybridSim.monthlyCost.toFixed(2)),
        extraSavingsPct: Number(hybridSim.hybridSavingsPct.toFixed(1)),
      },
      paretoFrontier: all
        .filter((r) => r.isParetoOptimal)
        .map((r) => ({
          id: r.model.id,
          name: r.model.name,
          intelligenceIndex: r.model.intelligenceIndex,
          sweBenchPct: r.model.sweBenchPct,
          perRunCostUsd: Number(r.perRunCost.toFixed(5)),
          valueScore: r.valueScore,
        })),
    };
  }

  throw new Error(`Unknown tool: ${name}`);
}

export async function handleMcpRequest(
  request: Request,
  env: WorkerEnv,
  fetchImpl: typeof fetch = fetch
): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const url = new URL(request.url);

  // Health check & root service info
  if (request.method === 'GET' && url.pathname === '/health') {
    return new Response(JSON.stringify({ ok: true, service: 'x402-mcp-agentcost' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }

  // Machine-readable discovery manifest for MCP registries & x402 marketplaces
  if (
    request.method === 'GET' &&
    (url.pathname === '/' || url.pathname === '/.well-known/mcp.json' || url.pathname === '/mcp')
  ) {
    return new Response(
      JSON.stringify(
        {
          name: 'agentcostlab-mcp',
          version: '1.0.0',
          protocol: 'model-context-protocol',
          transport: 'streamable-http',
          endpoint: `${url.origin}/mcp`,
          paymentProtocol: 'x402-v2',
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
        serverInfo: { name: 'agentcostlab-x402-mcp', version: '1.0.0' },
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

      // Enforce HTTP 402 / x402 payment on paid tools
      if (toolDef.priceUsd > 0) {
        const challenge = buildPaymentChallenge(env, {
          resource: `${url.origin}/mcp#${toolDef.name}`,
          priceUsd: toolDef.priceUsd,
          description: toolDef.description,
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
        const output = executeTool(toolDef.name, toolArgs);
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

  // Fallback to static AgentCostLab SPA assets on Cloudflare Workers
  if (env.ASSETS) {
    return env.ASSETS.fetch(request);
  }

  return new Response('Not Found', { status: 404, headers: CORS_HEADERS });
}

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    return handleMcpRequest(request, env);
  },
};
