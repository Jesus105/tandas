import { NextResponse } from "next/server";
import { requireUser, unauthorizedResponse } from "@/lib/auth";
import { assertTandaOwner, openRound } from "@/lib/tandas";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    await assertTandaOwner(id, user.id);
    const result = await openRound(id);
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return unauthorizedResponse();
    }
    if (e instanceof Error && e.message === "FORBIDDEN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error" },
      { status: 400 },
    );
  }
}
