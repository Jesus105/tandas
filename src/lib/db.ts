import { readdir, readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import pg from "pg";

const databaseUrl = process.env.DATABASE_URL?.trim() ?? "";
let pool: pg.Pool | undefined;

type GlobalDb = {
  __tandas_pglite?: Promise<PGlite>;
};

const g = globalThis as unknown as GlobalDb;

/** PGlite/pg may return Date objects — React cannot render those. */
function serializeRow<T>(row: Record<string, unknown>): T {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (value instanceof Date) {
      out[key] = value.toISOString();
    } else {
      out[key] = value;
    }
  }
  return out as T;
}

export async function sql<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  if (databaseUrl !== "") {
    pool ??= new pg.Pool({ connectionString: databaseUrl, max: 5 });
    const rows = (await pool.query(text, params)).rows as Record<
      string,
      unknown
    >[];
    return rows.map((r) => serializeRow<T>(r));
  }
  g.__tandas_pglite ??= startLocal().catch((error: unknown) => {
    g.__tandas_pglite = undefined;
    throw error;
  });
  const rows = (await (await g.__tandas_pglite).query<Record<string, unknown>>(
    text,
    params,
  )).rows;
  return rows.map((r) => serializeRow<T>(r));
}

async function startLocal(): Promise<PGlite> {
  const db = new PGlite();
  const files = (await readdir("migrations").catch(() => []))
    .filter((f) => f.endsWith(".sql"))
    .sort();
  for (const file of files) {
    await db.exec(await readFile(`migrations/${file}`, "utf8"));
  }
  return db;
}
