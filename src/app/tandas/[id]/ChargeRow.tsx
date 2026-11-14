"use client";

import { formatMxn } from "@/lib/types";

export function ChargeRow({
  chargeId,
  payerName,
  status,
  amountCents,
}: {
  chargeId: string;
  payerName: string;
  status: string;
  amountCents: number;
}) {
  const paid = status === "paid";

  async function copy() {
    const url = `${window.location.origin}/pagar/${chargeId}`;
    await navigator.clipboard.writeText(url);
  }

  return (
    <li className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-forest-200/80 bg-white/70 px-4 py-3">
      <div>
        <p className="font-medium text-forest-900">{payerName}</p>
        <p className="text-xs text-forest-500">{formatMxn(amountCents)}</p>
      </div>
      <div className="flex items-center gap-2">
        <span
          className={`rounded-md px-2 py-0.5 text-xs font-medium ${
            paid
              ? "bg-forest-100 text-forest-800"
              : "bg-gold-500/20 text-gold-600"
          }`}
        >
          {paid ? "Pagado" : "Pendiente"}
        </span>
        {!paid && (
          <>
            <a
              href={`/pagar/${chargeId}`}
              className="text-xs text-forest-700 underline-offset-2 hover:underline"
            >
              Ver cobro
            </a>
            <button
              type="button"
              onClick={copy}
              className="text-xs text-forest-700 underline-offset-2 hover:underline"
            >
              Copiar link
            </button>
          </>
        )}
      </div>
    </li>
  );
}
