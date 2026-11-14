import Link from "next/link";
import { notFound } from "next/navigation";
import { isPeyLive, PEY_LIVE_CHARGE_AMOUNT_MXN } from "@/lib/pey";
import {
  getOpenRound,
  getTanda,
  listCharges,
  listMembers,
  listRounds,
} from "@/lib/tandas";
import { formatDate, formatMxn, frequencyLabel } from "@/lib/types";
import { OpenRoundButton } from "./OpenRoundButton";
import { ChargeRow } from "./ChargeRow";

type Props = { params: Promise<{ id: string }> };

export default async function TandaDashboardPage({ params }: Props) {
  const { id } = await params;
  const tanda = await getTanda(id);
  if (!tanda) notFound();

  const members = await listMembers(id);
  const openRound = await getOpenRound(id);
  const rounds = await listRounds(id);
  const charges = openRound ? await listCharges(openRound.id) : [];
  const beneficiary = openRound
    ? members.find((m) => m.id === openRound.beneficiary_member_id)
    : null;

  const paid = charges.filter((c) => c.status === "paid").length;
  const total = charges.length;
  const live = isPeyLive();

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Link href="/" className="text-sm text-forest-600 hover:text-forest-900">
        ← Inicio
      </Link>

      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-forest-900">{tanda.name}</h1>
          <p className="mt-1 text-sm text-forest-600">
            {formatMxn(tanda.amount_cents)} · {frequencyLabel(tanda.frequency)} ·{" "}
            inicia {formatDate(tanda.start_date)}
          </p>
          {live && (
            <p className="mt-2 text-xs text-gold-600">
              Pey vivo: cada CoDi cobra{" "}
              {formatMxn(Math.round(PEY_LIVE_CHARGE_AMOUNT_MXN * 100))} (prueba),
              no el monto de historia.
            </p>
          )}
        </div>
        <Link
          href={`/tandas/${id}/miembros`}
          className="text-sm font-medium text-forest-800 underline-offset-2 hover:underline"
        >
          Integrantes ({members.length})
        </Link>
      </div>

      <section className="mt-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl text-forest-900">Ronda actual</h2>
          {!openRound && members.length >= 2 && (
            <OpenRoundButton tandaId={id} />
          )}
        </div>

        {!openRound && members.length < 2 && (
          <p className="mt-4 rounded-lg border border-dashed border-forest-300 bg-white/50 px-4 py-6 text-sm text-forest-600 text-center">
            Agrega al menos 2 integrantes para abrir la primera ronda.{" "}
            <Link
              href={`/tandas/${id}/miembros`}
              className="font-medium text-forest-800 underline"
            >
              Ir a integrantes
            </Link>
          </p>
        )}

        {!openRound && members.length >= 2 && (
          <p className="mt-4 rounded-lg border border-dashed border-forest-300 bg-white/50 px-4 py-6 text-sm text-forest-600 text-center">
            No hay ronda abierta. Al abrirla se generan cobros CoDi hacia la
            CLABE del beneficiario del turno{" "}
            <strong>{tanda.current_round + 1}</strong>.
          </p>
        )}

        {openRound && beneficiary && (
          <div className="mt-4 space-y-4">
            <div className="rounded-xl bg-forest-800 text-cream-50 px-5 py-4">
              <p className="text-xs uppercase tracking-wide text-cream-200/80">
                Ronda {openRound.round_number} · Beneficiario
              </p>
              <p className="mt-1 font-display text-2xl">{beneficiary.name}</p>
              <p className="mt-1 text-sm text-cream-200/90 font-mono truncate">
                bankAccountId: {beneficiary.pey_bank_account_id}
              </p>
              <p className="mt-3 text-sm">
                Progreso:{" "}
                <span className="font-semibold">
                  {paid}/{total} pagados
                </span>
              </p>
            </div>

            <ul className="space-y-2">
              {charges.map((c) => {
                const payer = members.find((m) => m.id === c.payer_member_id);
                return (
                  <ChargeRow
                    key={c.id}
                    chargeId={c.id}
                    payerName={payer?.name ?? "—"}
                    status={c.status}
                    amountCents={c.amount_cents}
                  />
                );
              })}
              <li className="rounded-lg border border-forest-200/60 bg-forest-50/50 px-4 py-3 text-sm text-forest-500">
                {beneficiary.name} — no paga (es el beneficiario)
              </li>
            </ul>
          </div>
        )}
      </section>

      {rounds.length > 0 && (
        <section className="mt-12">
          <h2 className="font-display text-xl text-forest-900">Historial</h2>
          <ul className="mt-3 space-y-2">
            {rounds.map((r) => {
              const b = members.find((m) => m.id === r.beneficiary_member_id);
              return (
                <li
                  key={r.id}
                  className="flex justify-between text-sm text-forest-700 border-b border-forest-100 py-2"
                >
                  <span>
                    Ronda {r.round_number} → {b?.name ?? "—"}
                  </span>
                  <span className="capitalize text-forest-500">{r.status}</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </main>
  );
}
