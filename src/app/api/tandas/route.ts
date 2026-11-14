import { NextResponse } from "next/server";
import { requireUser, unauthorizedResponse } from "@/lib/auth";
import { createTanda, listTandasForOrganizer } from "@/lib/tandas";
import type { Frequency } from "@/lib/types";

export async function GET() {
  try {
    const user = await requireUser();
    const tandas = await listTandasForOrganizer(user.id);
    return NextResponse.json({ tandas });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return unauthorizedResponse();
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
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
      organizerId: user.id,
    });
    return NextResponse.json(tanda);
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return unauthorizedResponse();
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error" },
      { status: 500 },
    );
  }
}
