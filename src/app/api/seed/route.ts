import { NextResponse } from "next/server";
import { requireUser, unauthorizedResponse } from "@/lib/auth";
import { isPeyLive, seedDemoTanda } from "@/lib/tandas";

export async function POST() {
  try {
    const user = await requireUser();
    const tanda = await seedDemoTanda(user.id);
    return NextResponse.json({
      tanda,
      peyLive: isPeyLive(),
      message: isPeyLive()
        ? "Tanda demo con 5 CLABEs de prueba ACTIVE. UI muestra $500; CoDi real envía $0.01"
        : "Tanda demo creada en modo demo (sin PEY_API_KEY)",
    });
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
