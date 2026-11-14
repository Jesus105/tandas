export type Frequency = "semanal" | "quincenal" | "mensual";

export type Tanda = {
  id: string;
  name: string;
  amount_cents: number;
  frequency: Frequency;
  start_date: string;
  status: "draft" | "ready" | "active" | "completed";
  current_round: number;
  created_at: string;
};

export type Member = {
  id: string;
  tanda_id: string;
  name: string;
  phone: string;
  clabe: string;
  pey_bank_account_id: string | null;
  pey_codi_status: string | null;
  turn_order: number;
  created_at: string;
};

export type Round = {
  id: string;
  tanda_id: string;
  round_number: number;
  beneficiary_member_id: string;
  status: "open" | "complete" | "canceled";
  opened_at: string;
  closed_at: string | null;
};

export type Charge = {
  id: string;
  round_id: string;
  payer_member_id: string;
  amount_cents: number;
  concept: string;
  num_ref: string;
  pey_qr_id: string | null;
  qr_string: string | null;
  qr_image: string | null;
  status: "pending" | "paid" | "expired" | "canceled";
  paid_at: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export function formatMxn(cents: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(cents / 100);
}

export function frequencyLabel(f: Frequency): string {
  return (
    { semanal: "Semanal", quincenal: "Quincenal", mensual: "Mensual" }[f] ?? f
  );
}

/** Safe for JSX: accepts ISO string or Date-like values from drivers. */
export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("es-MX", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
