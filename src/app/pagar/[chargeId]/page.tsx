import { notFound } from "next/navigation";
import { sql } from "@/lib/db";
import { isPeyLive } from "@/lib/pey";
import { getCharge } from "@/lib/tandas";
import { formatMxn } from "@/lib/types";
import { SimulatePayButton } from "./SimulatePayButton";
import { CopyLinkButton } from "./CopyLinkButton";

type Props = { params: Promise<{ chargeId: string }> };

export default async function PagarPage({ params }: Props) {
  const { chargeId } = await params;
  const charge = await getCharge(chargeId);
  if (!charge) notFound();

  const roundRows = await sql<{
    round_number: number;
    beneficiary_member_id: string;
    tanda_id: string;
  }>(`SELECT round_number, beneficiary_member_id, tanda_id FROM rounds WHERE id = $1`, [
    charge.round_id,
  ]);
  const round = roundRows[0];
  if (!round) notFound();

  const beneficiaryRows = await sql<{ name: string; pey_bank_account_id: string | null }>(
    `SELECT name, pey_bank_account_id FROM members WHERE id = $1`,
    [round.beneficiary_member_id],
  );
  const payerRows = await sql<{ name: string }>(
    `SELECT name FROM members WHERE id = $1`,
    [charge.payer_member_id],
  );
  const tandaRows = await sql<{ name: string }>(
    `SELECT name FROM tandas WHERE id = $1`,
    [round.tanda_id],
  );

  const beneficiary = beneficiaryRows[0];
  const payer = payerRows[0];
  const tanda = tandaRows[0];
  const live = isPeyLive();
  const paid = charge.status === "paid";

  return (
    <main className="mx-auto max-w-md px-6 py-12">
      <p className="text-sm font-medium text-gold-600 uppercase tracking-wide">
        Cobro CoDi · {tanda?.name}
      </p>
      <h1 className="mt-2 font-display text-3xl text-forest-900">
        {formatMxn(charge.amount_cents)}
      </h1>
      <p className="mt-2 text-forest-600 text-sm leading-relaxed">
        {payer?.name ?? "Participante"}, paga a{" "}
        <strong className="text-forest-900">{beneficiary?.name}</strong> (ronda{" "}
        {round.round_number}). El dinero va directo a su cuenta — no a una
        cuenta de la plataforma.
      </p>

      <div className="mt-6 rounded-xl border border-forest-200/80 bg-white/80 p-4 text-sm space-y-1">
        <p>
          <span className="text-forest-500">Concepto:</span> {charge.concept}
        </p>
        <p>
          <span className="text-forest-500">Referencia:</span>{" "}
          <span className="font-mono">{charge.num_ref}</span>
        </p>
        <p className="truncate">
          <span className="text-forest-500">Destino Pey:</span>{" "}
          <span className="font-mono text-xs">
            {beneficiary?.pey_bank_account_id}
          </span>
        </p>
        <p>
          <span className="text-forest-500">Estado:</span>{" "}
          <span className={paid ? "text-forest-700 font-medium" : "text-gold-600"}>
            {paid ? "Pagado" : "Pendiente"}
          </span>
        </p>
      </div>

      {!paid && charge.qr_image && (
        <div className="mt-8 flex flex-col items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={charge.qr_image}
            alt="Código QR CoDi"
            className="w-64 h-64 rounded-xl border border-forest-100 bg-cream-50"
          />
          <p className="mt-3 text-center text-xs text-forest-500 max-w-xs">
            Escanea con tu app de banco (CoDi)
            {live ? " — cobro real Pey" : " — QR de demostración"}
          </p>
        </div>
      )}

      {paid && (
        <div className="mt-8 rounded-xl bg-forest-100 px-4 py-6 text-center text-forest-800">
          Pago confirmado. Gracias.
        </div>
      )}

      <div className="mt-8 flex flex-col gap-2">
        <CopyLinkButton chargeId={chargeId} />
        {!paid && !live && <SimulatePayButton chargeId={chargeId} />}
      </div>
    </main>
  );
}
