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

/**
 * HARDCODE — Hackatón México / CLABEs de prueba.
 * Toda llamada LIVE a Pey que crea un cobro (QR / PN / link) DEBE enviar 0.01 MXN.
 * El monto “de historia” de la tanda puede ser otro; la UI lo muestra aparte.
 * No cambies esto sin leer AGENTS.md.
 */
export const PEY_LIVE_CHARGE_AMOUNT_MXN = 0.01 as const;

export function isPeyLive(): boolean {
  return Boolean(process.env.PEY_API_KEY?.trim());
}

/** Monto que realmente se manda a Pey al crear un cobro. */
export function peyChargeAmountMxn(displayAmount?: number): number {
  if (isPeyLive()) return PEY_LIVE_CHARGE_AMOUNT_MXN;
  return typeof displayAmount === "number" && Number.isFinite(displayAmount)
    ? displayAmount
    : PEY_LIVE_CHARGE_AMOUNT_MXN;
}

function apiKey(): string {
  const key = process.env.PEY_API_KEY?.trim();
  if (!key) throw new Error("PEY_API_KEY no configurada");
  return key;
}

export class PeyApiError extends Error {
  status: number;
  type?: string;
  body: unknown;

  constructor(path: string, status: number, body: unknown) {
    const nested =
      typeof body === "object" &&
      body &&
      "error" in body &&
      typeof (body as { error: unknown }).error === "object"
        ? ((body as { error: Record<string, unknown> }).error ?? {})
        : null;
    const message =
      (nested && typeof nested.message === "string" && nested.message) ||
      (typeof body === "object" &&
        body &&
        "message" in body &&
        String((body as { message: unknown }).message)) ||
      (typeof body === "string" ? body : JSON.stringify(body)) ||
      `HTTP ${status}`;
    const type =
      nested && typeof nested.type === "string" ? nested.type : undefined;
    super(`Pey ${path} → ${status}: ${message}${type ? ` [${type}]` : ""}`);
    this.status = status;
    this.type = type;
    this.body = body;
  }
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
    throw new PeyApiError(path, res.status, body);
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

function normalizeAccounts(payload: unknown): BankAccount[] {
  if (Array.isArray(payload)) return payload as BankAccount[];
  if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    for (const key of ["data", "items", "bankAccounts", "results"]) {
      if (Array.isArray(obj[key])) return obj[key] as BankAccount[];
    }
  }
  return [];
}

export async function listBankAccounts(): Promise<BankAccount[]> {
  if (!isPeyLive()) return [];
  try {
    const body = await peyFetch<unknown>("/bank-account");
    return normalizeAccounts(body);
  } catch {
    // Some tenants may not expose a list endpoint
    return [];
  }
}

export async function findBankAccountByClabe(
  clabe: string,
): Promise<BankAccount | null> {
  const accounts = await listBankAccounts();
  const hit = accounts.find((a) => (a.clabe ?? "").replace(/\D/g, "") === clabe);
  if (!hit) return null;
  if (hit.id && !hit.codiStatus) {
    try {
      return await getBankAccount(hit.id);
    } catch {
      return hit;
    }
  }
  return hit;
}

/**
 * Registra CLABE en Pey. Si ya existe, resuelve el bankAccountId existente.
 */
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

  try {
    return await peyFetch<BankAccount>("/bank-account", {
      method: "POST",
      body: JSON.stringify({
        alias: input.alias,
        name: input.name,
        clabe: input.clabe,
        entity: "PERSON",
      }),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message.toLowerCase() : "";
    const type =
      e instanceof PeyApiError ? (e.type ?? "").toUpperCase() : "";
    const looksDuplicate =
      type.includes("EXIST") ||
      type.includes("DUPLIC") ||
      type.includes("CONFLICT") ||
      msg.includes("already") ||
      msg.includes("exist") ||
      msg.includes("duplic") ||
      msg.includes("registrad") ||
      (e instanceof PeyApiError && (e.status === 409 || e.status === 422));

    if (!looksDuplicate) throw e;

    // Prefer id embedded in error body if present
    if (e instanceof PeyApiError && e.body && typeof e.body === "object") {
      const body = e.body as Record<string, unknown>;
      const nested =
        body.error && typeof body.error === "object"
          ? (body.error as Record<string, unknown>)
          : body;
      const data =
        nested.data && typeof nested.data === "object"
          ? (nested.data as Record<string, unknown>)
          : nested;
      const existingId =
        (typeof data.id === "string" && data.id) ||
        (typeof data.bankAccountId === "string" && data.bankAccountId) ||
        (typeof nested.id === "string" && nested.id) ||
        null;
      if (existingId) {
        try {
          return await getBankAccount(existingId);
        } catch {
          return {
            id: existingId,
            codiStatus: String(data.codiStatus ?? "ACTIVE"),
            clabe: input.clabe,
            name: input.name,
            alias: input.alias,
          };
        }
      }
    }

    const found = await findBankAccountByClabe(input.clabe);
    if (found) return found;
    throw e;
  }
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
  /** TTL in seconds (Pey expects a number, not an ISO date). */
  expirationSeconds: number;
  concept: string;
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

  const amount = peyChargeAmountMxn(input.amount);
  return peyFetch<CodiQrResult>("/codi/qr", {
    method: "POST",
    body: JSON.stringify({
      amount,
      concept: input.concept,
      expiration: input.expirationSeconds,
      numRef: input.numRef.slice(0, 7),
      generateImage: true,
      bankAccountId: input.bankAccountId,
      metadata: {
        ...(input.metadata ?? {}),
        displayAmountMxn: String(input.amount),
        chargedAmountMxn: String(amount),
      },
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
  const amount = peyChargeAmountMxn(input.amount);
  return peyFetch<CodiPnResult>("/codi/pn", {
    method: "POST",
    body: JSON.stringify({
      amount,
      concept: input.concept,
      phone: input.phone,
      bankAccountId: input.bankAccountId,
      numRef: input.numRef?.slice(0, 7),
      metadata: {
        ...(input.metadata ?? {}),
        displayAmountMxn: String(input.amount),
        chargedAmountMxn: String(amount),
      },
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

export class PeyWebhookConfigError extends Error {
  constructor() {
    super("PEY_WEBHOOK_SECRET no configurado");
    this.name = "PeyWebhookConfigError";
  }
}

/**
 * Verifica la firma Standard Webhooks. Sin PEY_WEBHOOK_SECRET no parsea
 * ni acepta el body: el caller debe responder 503 y no tocar cobros.
 */
export async function verifyPeyWebhook(
  rawBody: string,
  headers: Headers,
): Promise<PeyWebhookEvent> {
  const secret = process.env.PEY_WEBHOOK_SECRET?.trim();
  if (!secret) {
    throw new PeyWebhookConfigError();
  }

  const wh = new Webhook(secret);
  const hdrs: Record<string, string> = {};
  headers.forEach((v, k) => {
    hdrs[k] = v;
  });
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
