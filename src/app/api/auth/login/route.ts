import { NextResponse } from "next/server";
import {
  authenticate,
  createSession,
  setSessionCookie,
} from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const user = await authenticate(
      String(body.email ?? ""),
      String(body.password ?? ""),
    );
    if (!user) {
      return NextResponse.json(
        { error: "Email o contraseña incorrectos" },
        { status: 401 },
      );
    }
    const sessionId = await createSession(user.id);
    await setSessionCookie(sessionId);
    return NextResponse.json({ user });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error" },
      { status: 500 },
    );
  }
}
