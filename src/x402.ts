/**
 * x402 v2 Protocol Payment Middleware for Cloudflare Workers + MCP.
 * Implements HTTP 402 Payment Required with Base64-encoded PAYMENT-REQUIRED,
 * PAYMENT-SIGNATURE (and legacy X-PAYMENT), and PAYMENT-RESPONSE headers.
 *
 * Spec: https://x402.org (CAIP-2 network IDs, Base USDC default)
 */

export interface X402Env {
  /** Destination EVM/Solana wallet address to receive USDC payments */
  X402_PAY_TO?: string;
  /** CAIP-2 network ID (default: eip155:8453 = Base Mainnet; eip155:84532 = Base Sepolia) */
  X402_NETWORK?: string;
  /** USDC token contract address (default: Base Mainnet USDC) */
  X402_ASSET?: string;
  /** Facilitator base URL implementing POST /verify and POST /settle */
  X402_FACILITATOR_URL?: string;
  /** Set "false" to run in free/open mode; default "true" enforces 402 on paid tools */
  X402_ENFORCE?: string;
  /** Allow X-DEMO-MODE: true header for dry-run testing without a funded wallet */
  X402_ALLOW_DEMO?: string;
}

export interface X402PaymentOption {
  scheme: 'exact';
  network: string;
  asset: string;
  /** Amount in atomic units (USDC has 6 decimals: $0.005 = "5000") */
  amount: string;
  payTo: string;
  maxTimeoutSeconds: number;
  resource: string;
  description: string;
  mimeType: string;
  extra: {
    name: string;
    version: string;
    assetTransferMethod?: string;
    priceUsd: string;
  };
}

export interface X402ChallengePayload {
  x402Version: 2;
  error: string;
  accepts: X402PaymentOption[];
  extensions?: {
    bazaar?: {
      info: {
        input: {
          type: 'http';
          method: 'POST';
          bodyType: 'json';
          body: Record<string, unknown>;
        };
        output: {
          type: 'json';
          example: Record<string, unknown>;
        };
      };
      schema: Record<string, unknown>;
    };
  };
}

export interface X402VerifyResult {
  valid: boolean;
  demo?: boolean;
  payer?: string;
  txHash?: string;
  reason?: string;
}

const DEFAULT_NETWORK = 'eip155:8453'; // Base Mainnet
const DEFAULT_USDC_BASE = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const DEFAULT_FACILITATOR = 'https://facilitator.payai.network';
const DEFAULT_PLACEHOLDER_WALLET = '0x000000000000000000000000000000000000dEaD';

export function usdToUsdcAtomic(usd: number): string {
  return String(Math.max(1, Math.round(usd * 1_000_000)));
}

export function encodeBase64Json(obj: unknown): string {
  const json = JSON.stringify(obj);
  const bytes = new TextEncoder().encode(json);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) {
    bin += String.fromCharCode(bytes[i]);
  }
  return btoa(bin);
}

export function decodeBase64Json<T = unknown>(b64: string): T {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i);
  }
  const json = new TextDecoder().decode(bytes);
  return JSON.parse(json) as T;
}

export function buildPaymentChallenge(
  env: X402Env,
  opts: {
    resource: string;
    priceUsd: number;
    description: string;
    inputSchema?: Record<string, unknown>;
    exampleInput?: Record<string, unknown>;
    exampleOutput?: Record<string, unknown>;
  }
): X402ChallengePayload {
  const payload: X402ChallengePayload = {
    x402Version: 2,
    error: `Payment required: $${opts.priceUsd.toFixed(4)} USDC via x402 to invoke ${opts.resource}`,
    accepts: [
      {
        scheme: 'exact',
        network: env.X402_NETWORK || DEFAULT_NETWORK,
        asset: env.X402_ASSET || DEFAULT_USDC_BASE,
        amount: usdToUsdcAtomic(opts.priceUsd),
        payTo: env.X402_PAY_TO || DEFAULT_PLACEHOLDER_WALLET,
        maxTimeoutSeconds: 60,
        resource: opts.resource,
        description: opts.description,
        mimeType: 'application/json',
        extra: {
          name: 'USD Coin',
          version: '2',
          assetTransferMethod: 'eip3009',
          priceUsd: `$${opts.priceUsd.toFixed(4)}`,
        },
      },
    ],
  };

  if (opts.inputSchema && opts.exampleInput) {
    payload.extensions = {
      bazaar: {
        info: {
          input: {
            type: 'http',
            method: 'POST',
            bodyType: 'json',
            body: opts.exampleInput,
          },
          output: {
            type: 'json',
            example: opts.exampleOutput || { ok: true },
          },
        },
        schema: opts.inputSchema,
      },
    };
  }

  return payload;
}

export function create402Response(
  challenge: X402ChallengePayload,
  corsHeaders: Record<string, string>
): Response {
  const encoded = encodeBase64Json(challenge);
  return new Response(JSON.stringify(challenge, null, 2), {
    status: 402,
    statusText: 'Payment Required',
    headers: {
      'Content-Type': 'application/json',
      'PAYMENT-REQUIRED': encoded,
      'Access-Control-Expose-Headers': 'PAYMENT-REQUIRED, PAYMENT-RESPONSE',
      ...corsHeaders,
    },
  });
}

export async function verifyAndSettleX402(
  request: Request,
  env: X402Env,
  challenge: X402ChallengePayload,
  fetchImpl: typeof fetch = fetch
): Promise<X402VerifyResult> {
  if (env.X402_ENFORCE === 'false') {
    return { valid: true, demo: true, payer: 'open-mode' };
  }

  const allowDemo = env.X402_ALLOW_DEMO !== 'false';
  if (allowDemo && request.headers.get('X-DEMO-MODE') === 'true') {
    return {
      valid: true,
      demo: true,
      payer: 'demo-agent-wallet',
      txHash: '0xdemo_sandbox_receipt',
    };
  }

  const paymentHeader =
    request.headers.get('PAYMENT-SIGNATURE') || request.headers.get('X-PAYMENT');

  if (!paymentHeader) {
    return { valid: false, reason: 'Missing PAYMENT-SIGNATURE header' };
  }

  let paymentPayload: Record<string, unknown>;
  try {
    const trimmed = paymentHeader.trim();
    const parsed = trimmed.startsWith('{')
      ? JSON.parse(trimmed)
      : decodeBase64Json<unknown>(trimmed);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { valid: false, reason: 'Malformed PAYMENT-SIGNATURE payload' };
    }
    paymentPayload = parsed as Record<string, unknown>;
  } catch {
    return { valid: false, reason: 'Malformed PAYMENT-SIGNATURE payload (expected Base64-encoded JSON)' };
  }

  const x402Version =
    typeof paymentPayload.x402Version === 'number' ? paymentPayload.x402Version : 2;
  const facilitator = (env.X402_FACILITATOR_URL || DEFAULT_FACILITATOR).replace(/\/$/, '');
  const paymentRequirements = challenge.accepts[0];

  try {
    const verifyRes = await fetchImpl(`${facilitator}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        x402Version,
        paymentPayload,
        paymentRequirements,
      }),
    });

    if (!verifyRes.ok) {
      return { valid: false, reason: `Facilitator verify HTTP ${verifyRes.status}` };
    }

    const verifyJson = (await verifyRes.json()) as {
      isValid?: boolean;
      payer?: string;
      invalidReason?: string;
    };

    if (!verifyJson.isValid) {
      return { valid: false, reason: verifyJson.invalidReason || 'Invalid payment signature' };
    }

    const settleRes = await fetchImpl(`${facilitator}/settle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        x402Version,
        paymentPayload,
        paymentRequirements,
      }),
    });

    if (!settleRes.ok) {
      return { valid: false, reason: `Facilitator settle HTTP ${settleRes.status}` };
    }

    const settleJson = (await settleRes.json()) as {
      success?: boolean;
      transaction?: string;
      payer?: string;
      errorReason?: string;
    };

    if (!settleJson.success) {
      return { valid: false, reason: settleJson.errorReason || 'Settlement failed' };
    }

    return {
      valid: true,
      payer: settleJson.payer || verifyJson.payer,
      txHash: settleJson.transaction,
    };
  } catch (err) {
    return {
      valid: false,
      reason: err instanceof Error ? err.message : 'Facilitator communication error',
    };
  }
}

export function buildPaymentReceiptHeader(result: X402VerifyResult, network: string): string {
  return encodeBase64Json({
    x402Version: 2,
    success: true,
    network,
    payer: result.payer || 'unknown',
    transaction: result.txHash || 'settled',
    demo: Boolean(result.demo),
    settledAt: new Date().toISOString(),
  });
}
