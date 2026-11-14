import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { sql } from "./db";
import { id } from "./ids";

export const SESSION_COOKIE = "tandas_session";
const SESSION_DAYS = 14;

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  created_at: string;
};

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createUser(input: {
  email: string;
  password: string;
  name: string;
}): Promise<AuthUser> {
  const email = input.email.trim().toLowerCase();
  if (!email.includes("@") || input.password.length < 8) {
    throw new Error("Email inválido o contraseña menor a 8 caracteres");
  }
  const existing = await sql<{ id: string }>(
    `SELECT id FROM users WHERE email = $1`,
    [email],
  );
  if (existing[0]) throw new Error("Ya existe una cuenta con ese email");

  const userId = id("usr");
  const passwordHash = await hashPassword(input.password);
  const rows = await sql<AuthUser>(
    `INSERT INTO users (id, email, password_hash, name)
     VALUES ($1, $2, $3, $4)
     RETURNING id, email, name, created_at`,
    [userId, email, passwordHash, input.name.trim() || email.split("@")[0]],
  );
  return rows[0];
}

export async function authenticate(
  email: string,
  password: string,
): Promise<AuthUser | null> {
  const rows = await sql<AuthUser & { password_hash: string }>(
    `SELECT id, email, name, created_at, password_hash FROM users WHERE email = $1`,
    [email.trim().toLowerCase()],
  );
  const user = rows[0];
  if (!user) return null;
  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    created_at: user.created_at,
  };
}

export async function createSession(userId: string): Promise<string> {
  const sessionId = id("ses");
  const expires = new Date(
    Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();
  await sql(
    `INSERT INTO sessions (id, user_id, expires_at) VALUES ($1, $2, $3)`,
    [sessionId, userId, expires],
  );
  return sessionId;
}

export async function destroySession(sessionId: string): Promise<void> {
  await sql(`DELETE FROM sessions WHERE id = $1`, [sessionId]);
}

export async function setSessionCookie(sessionId: string): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const jar = await cookies();
  const sessionId = jar.get(SESSION_COOKIE)?.value;
  if (!sessionId) return null;

  const rows = await sql<AuthUser>(
    `SELECT u.id, u.email, u.name, u.created_at
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.id = $1 AND s.expires_at > now()`,
    [sessionId],
  );
  return rows[0] ?? null;
}

export async function requireUser(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) {
    const err = new Error("UNAUTHORIZED");
    throw err;
  }
  return user;
}

export function unauthorizedResponse() {
  return Response.json({ error: "Inicia sesión para continuar" }, { status: 401 });
}
