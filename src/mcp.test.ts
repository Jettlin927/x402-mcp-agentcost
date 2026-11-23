import { describe, expect, it, vi } from 'vitest';
import { handleMcpRequest, type WorkerEnv } from './index';
import { decodeBase64Json, type X402ChallengePayload } from './x402';

const baseEnv: WorkerEnv = {
  X402_PAY_TO: '0x1111111111111111111111111111111111111111',
  X402_NETWORK: 'eip155:8453',
  X402_ENFORCE: 'true',
  X402_ALLOW_DEMO: 'true',
};

function makeRpcRequest(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request('https://agentcostlab.workers.dev/mcp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

describe('AgentCostLab x402 Pay-Per-Call MCP Server', () => {
  it('serves machine-readable discovery manifest at /.well-known/mcp.json', async () => {
    const req = new Request('https://agentcostlab.workers.dev/.well-known/mcp.json');
    const res = await handleMcpRequest(req, baseEnv);
    expect(res.status).toBe(200);
    const json = (await res.json()) as { paymentProtocol: string; tools: unknown[] };
    expect(json.paymentProtocol).toBe('x402-v2');
    expect(json.tools.length).toBe(4);
  });

  it('allows free initialize and tools/list discovery without payment', async () => {
    const initRes = await handleMcpRequest(
      makeRpcRequest({ jsonrpc: '2.0', id: 1, method: 'initialize' }),
      baseEnv
    );
    expect(initRes.status).toBe(200);

    const listRes = await handleMcpRequest(
      makeRpcRequest({ jsonrpc: '2.0', id: 2, method: 'tools/list' }),
      baseEnv
    );
    expect(listRes.status).toBe(200);
    const listJson = (await listRes.json()) as { result: { tools: { name: string }[] } };
    expect(listJson.result.tools.map((t) => t.name)).toContain('recommend_pareto_route');
  });

  it('executes free list_models_pricing tool with 200 OK', async () => {
    const res = await handleMcpRequest(
      makeRpcRequest({
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: { name: 'list_models_pricing', arguments: { tier: 'economy' } },
      }),
      baseEnv
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as { result: { structuredContent: { count: number } } };
    expect(json.result.structuredContent.count).toBeGreaterThanOrEqual(4);

    const allRes = await handleMcpRequest(
      makeRpcRequest({
        jsonrpc: '2.0',
        id: 31,
        method: 'tools/call',
        params: { name: 'list_models_pricing', arguments: { tier: 'all' } },
      }),
      baseEnv
    );
    expect(allRes.status).toBe(200);
    const allJson = (await allRes.json()) as {
      result: { structuredContent: { count: number; models: { id: string }[] } };
    };
    expect(allJson.result.structuredContent.count).toBeGreaterThanOrEqual(20);
    expect(allJson.result.structuredContent.models.some((m) => m.id === 'gpt-6-1-terra')).toBe(true);
    expect(allJson.result.structuredContent.models.some((m) => m.id === 'gemini-4-neon')).toBe(true);
    expect(allJson.result.structuredContent.models.some((m) => m.id === 'gemini-4-hydrogen')).toBe(true);
    expect(allJson.result.structuredContent.models.some((m) => m.id === 'qwen4-max')).toBe(true);
    expect(allJson.result.structuredContent.models.some((m) => m.id === 'kimi-k3-1-pro')).toBe(true);
  });

  it('returns HTTP 402 Payment Required with valid x402 v2 PAYMENT-REQUIRED header on unpaid paid tool', async () => {
    const res = await handleMcpRequest(
      makeRpcRequest({
        jsonrpc: '2.0',
        id: 4,
        method: 'tools/call',
        params: {
          name: 'recommend_pareto_route',
          arguments: { turns: 25, minSweBenchPct: 78 },
        },
      }),
      baseEnv
    );

    expect(res.status).toBe(402);
    const header = res.headers.get('PAYMENT-REQUIRED');
    expect(header).toBeTruthy();

    const decoded = decodeBase64Json<X402ChallengePayload>(header!);
    expect(decoded.x402Version).toBe(2);
    expect(decoded.accepts[0].network).toBe('eip155:8453');
    expect(decoded.accepts[0].amount).toBe('5000'); // $0.005 USDC
    expect(decoded.accepts[0].payTo).toBe('0x1111111111111111111111111111111111111111');
  });

  it('verifies and settles via x402 facilitator and returns PAYMENT-RESPONSE receipt', async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ isValid: true, payer: '0xAgentWallet' }), { status: 200 })
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ success: true, transaction: '0xabc123tx', payer: '0xAgentWallet' }),
          { status: 200 }
        )
      );

    const res = await handleMcpRequest(
      makeRpcRequest(
        {
          jsonrpc: '2.0',
          id: 5,
          method: 'tools/call',
          params: {
            name: 'recommend_pareto_route',
            arguments: { turns: 24, minSweBenchPct: 80 },
          },
        },
        { 'PAYMENT-SIGNATURE': 'base64_signed_eip712_payload' }
      ),
      baseEnv,
      mockFetch as unknown as typeof fetch
    );

    expect(res.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(2);
    const receiptHeader = res.headers.get('PAYMENT-RESPONSE');
    expect(receiptHeader).toBeTruthy();

    const receipt = decodeBase64Json<{ success: boolean; transaction: string }>(receiptHeader!);
    expect(receipt.success).toBe(true);
    expect(receipt.transaction).toBe('0xabc123tx');

    const body = (await res.json()) as {
      result: { structuredContent: { recommendedSingleModel: { name: string }; paretoFrontier: unknown[] } };
    };
    expect(body.result.structuredContent.recommendedSingleModel.name).toBeTruthy();
    expect(body.result.structuredContent.paretoFrontier.length).toBeGreaterThanOrEqual(3);
  });

  it('supports X-DEMO-MODE dry run for audit_prompt_cache_tax', async () => {
    const res = await handleMcpRequest(
      makeRpcRequest(
        {
          jsonrpc: '2.0',
          id: 6,
          method: 'tools/call',
          params: {
            name: 'audit_prompt_cache_tax',
            arguments: { content: 'API key: sk-1234567890abcdefghij\ncurrent_time', turns: 20 },
          },
        },
        { 'X-DEMO-MODE': 'true' }
      ),
      baseEnv
    );

    expect(res.status).toBe(200);
    const json = (await res.json()) as { result: { structuredContent: { warnings: unknown[] } } };
    expect(json.result.structuredContent.warnings.length).toBeGreaterThanOrEqual(2);
  });

  it('exposes direct REST x402 endpoint with Coinbase Bazaar extensions.bazaar discovery metadata', async () => {
    const unpaidReq = new Request('https://agentcostlab.workers.dev/api/recommend-pareto-route', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ turns: 24 }),
    });
    const res402 = await handleMcpRequest(unpaidReq, baseEnv);
    expect(res402.status).toBe(402);
    const body = (await res402.json()) as X402ChallengePayload;
    expect(body.extensions?.bazaar?.info.input.method).toBe('POST');
    expect(body.extensions?.bazaar?.schema).toBeTruthy();

    const demoReq = new Request('https://agentcostlab.workers.dev/api/recommend-pareto-route', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-DEMO-MODE': 'true' },
      body: JSON.stringify({ turns: 24, minSweBenchPct: 80 }),
    });
    const res200 = await handleMcpRequest(demoReq, baseEnv);
    expect(res200.status).toBe(200);
    expect(res200.headers.get('PAYMENT-RESPONSE')).toBeTruthy();
  });

  it('serves /.well-known/x402.json, /llms.txt, and /openapi.json discovery endpoints', async () => {
    const x402Res = await handleMcpRequest(
      new Request('https://agentcostlab.workers.dev/.well-known/x402.json'),
      baseEnv
    );
    expect(x402Res.status).toBe(200);

    const llmsRes = await handleMcpRequest(
      new Request('https://agentcostlab.workers.dev/llms.txt'),
      baseEnv
    );
    expect(llmsRes.status).toBe(200);
    expect(await llmsRes.text()).toContain('/api/recommend-pareto-route');

    const oaRes = await handleMcpRequest(
      new Request('https://agentcostlab.workers.dev/openapi.json'),
      baseEnv
    );
    expect(oaRes.status).toBe(200);
    const oaJson = (await oaRes.json()) as { openapi: string; paths: Record<string, unknown> };
    expect(oaJson.openapi).toBe('3.1.0');
    expect(oaJson.paths['/api/recommend-pareto-route']).toBeTruthy();
  });
});
