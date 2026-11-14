import { NextResponse } from "next/server";
import { isPeyLive, seedDemoTanda } from "@/lib/tandas";

export async function POST() {
  try {
    const tanda = await seedDemoTanda();
    return NextResponse.json({
      tanda,
      peyLive: isPeyLive(),
      message: isPeyLive()
        ? "Tanda demo con 5 CLABEs de prueba ACTIVE. UI muestra $500; CoDi real envía $0.01"
        : "Tanda demo creada en modo demo (sin PEY_API_KEY)",
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error" },
      { status: 500 },
    );
  }
}

export async function GET() {
  return POST();
}
