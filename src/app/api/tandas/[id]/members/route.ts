import { NextResponse } from "next/server";
import { addMember, listMembers, reorderMembers, shuffleTurns } from "@/lib/tandas";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const members = await listMembers(id);
  return NextResponse.json(members);
}

export async function POST(req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const body = await req.json();
    const name = String(body.name ?? "").trim();
    const phone = String(body.phone ?? "").replace(/\D/g, "");
    const clabe = String(body.clabe ?? "").replace(/\D/g, "");
    if (!name || phone.length !== 10 || clabe.length !== 18) {
      return NextResponse.json(
        { error: "Nombre, teléfono (10) y CLABE (18) son requeridos" },
        { status: 400 },
      );
    }
    const existing = await listMembers(id);
    const member = await addMember({
      tandaId: id,
      name,
      phone,
      clabe,
      turnOrder: existing.length + 1,
    });
    return NextResponse.json(member);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const body = await req.json();
    if (body.action === "shuffle") {
      const members = await shuffleTurns(id);
      return NextResponse.json(members);
    }
    if (Array.isArray(body.orderedIds)) {
      const members = await reorderMembers(id, body.orderedIds.map(String));
      return NextResponse.json(members);
    }
    return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error" },
      { status: 500 },
    );
  }
}
