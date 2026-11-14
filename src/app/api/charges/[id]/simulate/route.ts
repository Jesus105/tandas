import { NextResponse } from "next/server";
import { isPeyLive } from "@/lib/pey";
import { markChargePaid } from "@/lib/tandas";

type Ctx = { params: Promise<{ id: string }> };

/** Solo disponible en modo demo (sin PEY_API_KEY). */
export async function POST(_req: Request, ctx: Ctx) {
  if (isPeyLive()) {
    return NextResponse.json(
      {
        error:
          "Simulación deshabilitada: Pey está en vivo. Usa un pago CoDi real o el webhook.",
      },
      { status: 403 },
    );
  }
  try {
    const { id } = await ctx.params;
    const charge = await markChargePaid(id);
    if (!charge) {
      return NextResponse.json(
        { error: "Cobro no encontrado o ya pagado" },
        { status: 404 },
      );
    }
    return NextResponse.json(charge);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error" },
      { status: 500 },
    );
  }
}
