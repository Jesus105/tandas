/**
 * Cliente Pey API — cobros CoDi.
 * Docs / portal: https://portal.mipey.mx
 * Base: https://api.pey.mx
 *
 * Modo real: si PEY_API_KEY está definido, todas las llamadas van a Pey.
 * Modo demo: sin API key, mocks locales (solo fallback para desarrollo offline).
 */

import QRCode from "qrcode";
import { Webhook } from "standardwebhooks";

const PEY_BASE = "https://api.pey.mx";

export function isPeyLive(): boolean {
  return Boolean(process.env.PEY_API_KEY?.trim());
}

function apiKey(): string {
  const key = process.env.PEY_API_KEY?.trim();
  if (!key) throw new Error("PEY_API_KEY no configurada");
  return key;
}

async function peyFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${PEY_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text };
  }
  if (!res.ok) {
    const msg =
      typeof body === "object" && body && "message" in body
        ? String((body as { message: unknown }).message)
        : text || res.statusText;
    throw new Error(`Pey ${path} → ${res.status}: ${msg}`);
  }
  return body as T;
}

// ── Bank accounts ──────────────────────────────────────────────

export type BankAccount = {
  id: string;
  codiStatus: string;
  alias?: string;
  name?: string;
  clabe?: string;
};

export async function createBankAccount(input: {
  alias: string;
  name: string;
  clabe: string;
}): Promise<BankAccount> {
  if (!isPeyLive()) {
    return {
      id: `demo_ba_${input.clabe.slice(-6)}_${Date.now().toString(36)}`,
      codiStatus: "ACTIVE",
      alias: input.alias,
      name: input.name,
      clabe: input.clabe,
    };
  }
  return peyFetch<BankAccount>("/bank-account", {
    method: "POST",
    body: JSON.stringify({
      alias: input.alias,
      name: input.name,
      clabe: input.clabe,
      entity: "PERSON",
    }),
  });
}

export async function getBankAccount(id: string): Promise<BankAccount> {
  if (!isPeyLive()) {
    return { id, codiStatus: "ACTIVE" };
  }
  return peyFetch<BankAccount>(`/bank-account/${id}`);
}

// ── CoDi QR ────────────────────────────────────────────────────

export type CodiQrResult = {
  id: string;
  qrString: string;
  qrImage: string;
};

export async function createCodiQr(input: {
  amount: number;
  concept: string;
  expiration: string;
  numRef: string;
  /** CLABE destino = bankAccountId del BENEFICIARIO de la ronda (no pool). */
  bankAccountId: string;
  metadata?: Record<string, string>;
}): Promise<CodiQrResult> {
  if (!isPeyLive()) {
    const id = `demo_qr_${Date.now().toString(36)}`;
    const qrString = `DEMO|CODI|${input.numRef}|${input.amount}|${input.bankAccountId}|${input.concept}`;
    const qrImage = await QRCode.toDataURL(qrString, {
      width: 320,
      margin: 2,
      color: { dark: "#1a2a24", light: "#fdfbf7" },
    });
    return { id, qrString, qrImage };
  }

  return peyFetch<CodiQrResult>("/codi/qr", {
    method: "POST",
    body: JSON.stringify({
      amount: input.amount,
      concept: input.concept,
      expiration: input.expiration,
      numRef: input.numRef.slice(0, 7),
      generateImage: true,
      bankAccountId: input.bankAccountId,
      metadata: input.metadata ?? {},
    }),
  });
}

// ── CoDi Push (opcional) ───────────────────────────────────────

export type CodiPnResult = {
  id: string;
  status?: string;
};

export async function createCodiPn(input: {
  amount: number;
  concept: string;
  phone: string;
  bankAccountId: string;
  numRef?: string;
  metadata?: Record<string, string>;
}): Promise<CodiPnResult> {
  if (!isPeyLive()) {
    return { id: `demo_pn_${Date.now().toString(36)}`, status: "SENT" };
  }
  return peyFetch<CodiPnResult>("/codi/pn", {
    method: "POST",
    body: JSON.stringify({
      amount: input.amount,
      concept: input.concept,
      phone: input.phone,
      bankAccountId: input.bankAccountId,
      numRef: input.numRef?.slice(0, 7),
      metadata: input.metadata ?? {},
    }),
  });
}

// ── Webhooks (Standard Webhooks) ───────────────────────────────

export type PeyWebhookEvent = {
  type: string;
  data?: {
    id?: string;
    numRef?: string;
    amount?: number;
    transactionId?: string;
    status?: string;
    bankAccountId?: string;
    codiStatus?: string;
    metadata?: Record<string, string>;
    [key: string]: unknown;
  };
};

/**
 * Verifica la firma del webhook con PEY_WEBHOOK_SECRET.
 * Si no hay secret (desarrollo), acepta el body sin verificar.
 */
export async function verifyPeyWebhook(
  rawBody: string,
  headers: Headers,
): Promise<PeyWebhookEvent> {
  const secret = process.env.PEY_WEBHOOK_SECRET?.trim();
  if (secret) {
    const wh = new Webhook(secret);
    const hdrs: Record<string, string> = {};
    headers.forEach((v, k) => {
      hdrs[k] = v;
    });
    // standardwebhooks espera keys en minúsculas comunes
    const verified = wh.verify(rawBody, {
      "webhook-id":
        hdrs["webhook-id"] ?? hdrs["svix-id"] ?? hdrs["Webhook-Id"] ?? "",
      "webhook-timestamp":
        hdrs["webhook-timestamp"] ??
        hdrs["svix-timestamp"] ??
        hdrs["Webhook-Timestamp"] ??
        "",
      "webhook-signature":
        hdrs["webhook-signature"] ??
        hdrs["svix-signature"] ??
        hdrs["Webhook-Signature"] ??
        "",
    });
    return (
      typeof verified === "string" ? JSON.parse(verified) : verified
    ) as PeyWebhookEvent;
  }
  return JSON.parse(rawBody) as PeyWebhookEvent;
}
