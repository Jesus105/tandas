import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { listTandasForOrganizer } from "@/lib/tandas";
import { formatDate, formatMxn, frequencyLabel } from "@/lib/types";
import { LogoutButton } from "@/components/LogoutButton";
import { SeedButton } from "@/components/SeedButton";

export default async function AppHomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const tandas = await listTandasForOrganizer(user.id);

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-forest-600">Hola, {user.name}</p>
          <h1 className="font-display text-3xl text-forest-900">Mis tandas</h1>
        </div>
        <LogoutButton />
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Link
          href="/tandas/nueva"
          className="inline-flex rounded-lg bg-forest-800 px-5 py-2.5 text-sm font-medium text-cream-50 hover:bg-forest-900"
        >
          Crear tanda
        </Link>
        <SeedButton />
      </div>

      {tandas.length === 0 ? (
        <p className="mt-10 rounded-lg border border-dashed border-forest-300 bg-white/50 px-4 py-8 text-center text-sm text-forest-600">
          Aún no tienes tandas. Crea una o prueba la demo con las CLABEs de
          prueba Pey.
        </p>
      ) : (
        <ul className="mt-10 space-y-3">
          {tandas.map((t) => (
            <li key={t.id}>
              <Link
                href={`/tandas/${t.id}`}
                className="block rounded-xl border border-forest-200/80 bg-white/70 px-4 py-4 hover:border-forest-400 transition"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-display text-xl text-forest-900">
                      {t.name}
                    </p>
                    <p className="mt-1 text-sm text-forest-600">
                      {formatMxn(t.amount_cents)} · {frequencyLabel(t.frequency)}{" "}
                      · {formatDate(t.start_date)}
                    </p>
                  </div>
                  <span className="text-xs uppercase tracking-wide text-forest-500">
                    {t.status}
                    {t.current_round > 0 ? ` · ronda ${t.current_round}` : ""}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
