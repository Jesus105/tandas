import { NextResponse } from "next/server";
import { createTanda } from "@/lib/tandas";
import type { Frequency } from "@/lib/types";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const name = String(body.name ?? "").trim();
    const frequency = String(body.frequency ?? "") as Frequency;
    const startDate = String(body.startDate ?? "").trim();
    const amount = Number(body.amount);
    if (!name || !["semanal", "quincenal", "mensual"].includes(frequency)) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Monto inválido" }, { status: 400 });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      return NextResponse.json({ error: "Fecha inválida" }, { status: 400 });
    }
    const amountCents = Math.round(amount * 100);
    const tanda = await createTanda({
      name,
      amountCents,
      frequency,
      startDate,
    });
    return NextResponse.json(tanda);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error" },
      { status: 500 },
    );
  }
}
