import { NextResponse } from "next/server";
import { getCurrentUser, unauthorizedResponse } from "@/lib/auth";
import { sql } from "@/lib/db";
import { isPeyLive } from "@/lib/pey";
import { markChargePaid } from "@/lib/tandas";

type Ctx = { params: Promise<{ id: string }> };

/** Demo only, and only the organizer who owns the tanda. */
export async function POST(_req: Request, ctx: Ctx) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedResponse();

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
    const owner = await sql<{ organizer_id: string | null }>(
      `SELECT t.organizer_id
       FROM charges c
       JOIN rounds r ON r.id = c.round_id
       JOIN tandas t ON t.id = r.tanda_id
       WHERE c.id = $1`,
      [id],
    );
    if (!owner[0]) {
      return NextResponse.json({ error: "Cobro no encontrado" }, { status: 404 });
    }
    if (owner[0].organizer_id !== user.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
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
