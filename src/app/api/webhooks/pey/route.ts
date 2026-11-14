import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { verifyPeyWebhook } from "@/lib/pey";
import { markChargePaidByPey } from "@/lib/tandas";

export async function POST(req: Request) {
  const rawBody = await req.text();
  try {
    const event = await verifyPeyWebhook(rawBody, req.headers);
    const type = event.type ?? "";
    const data = event.data ?? {};

    if (
      type === "codi.qr.payment_received" ||
      type === "codi.pn.payment_received" ||
      type.endsWith(".payment_received")
    ) {
      const chargeId =
        data.metadata?.chargeId ??
        (typeof data.metadata?.charge_id === "string"
          ? data.metadata.charge_id
          : undefined);
      const paid = await markChargePaidByPey({
        chargeId,
        peyQrId: data.id,
        numRef: data.numRef ? String(data.numRef) : undefined,
      });
      return NextResponse.json({
        ok: true,
        matched: Boolean(paid),
        chargeId: paid?.id ?? null,
      });
    }

    if (
      type === "bank_account.updated" ||
      type === "bank-account.updated" ||
      type.includes("bank_account")
    ) {
      const baId = data.id ?? data.bankAccountId;
      const status = data.codiStatus ?? data.status;
      if (baId && status) {
        await sql(
          `UPDATE members SET pey_codi_status = $1 WHERE pey_bank_account_id = $2`,
          [String(status), String(baId)],
        );
      }
      return NextResponse.json({ ok: true, bankAccount: baId ?? null });
    }

    return NextResponse.json({ ok: true, ignored: type });
  } catch (e) {
    console.error("webhook pey error", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Firma inválida" },
      { status: 400 },
    );
  }
}
