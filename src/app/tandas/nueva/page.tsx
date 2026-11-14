"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function NuevaTandaPage() {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("500");
  const [frequency, setFrequency] = useState("semanal");
  const [startDate, setStartDate] = useState(
    () => new Date().toISOString().slice(0, 10),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => {
        if (!r.ok) window.location.assign("/login");
      })
      .catch(() => window.location.assign("/login"));
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/tandas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          amount: Number(amount),
          frequency,
          startDate,
        }),
      });
      const data = await res.json();
      if (res.status === 401) {
        window.location.assign("/login");
        return;
      }
      if (!res.ok) throw new Error(data.error || "No se pudo crear");
      window.location.assign(`/tandas/${data.id}/miembros`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-lg px-6 py-12">
      <Link href="/app" className="text-sm text-forest-600 hover:text-forest-900">
        ← Mis tandas
      </Link>
      <h1 className="mt-6 font-display text-3xl text-forest-900">
        Nueva tanda
      </h1>
      <p className="mt-2 text-forest-600 text-sm">
        Configura monto, frecuencia e inicio. Después agregas integrantes y
        CLABEs.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-5">
        <label className="block">
          <span className="text-sm font-medium text-forest-800">Nombre</span>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej. Tanda oficina marzo"
            className="mt-1.5 w-full rounded-lg border border-forest-200 bg-white/80 px-3 py-2.5 outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-500/20"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-forest-800">
            Monto por persona (MXN)
          </span>
          <input
            required
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-forest-200 bg-white/80 px-3 py-2.5 outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-500/20"
          />
        </label>

        <fieldset>
          <legend className="text-sm font-medium text-forest-800">
            Frecuencia
          </legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {(["semanal", "quincenal", "mensual"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFrequency(f)}
                className={`rounded-lg px-4 py-2 text-sm capitalize transition ${
                  frequency === f
                    ? "bg-forest-800 text-cream-50"
                    : "bg-white/70 border border-forest-200 text-forest-700 hover:bg-white"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </fieldset>

        <label className="block">
          <span className="text-sm font-medium text-forest-800">
            Fecha de inicio
          </span>
          <input
            required
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-forest-200 bg-white/80 px-3 py-2.5 outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-500/20"
          />
        </label>

        {error && (
          <p className="text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-forest-800 py-3 text-cream-50 font-medium hover:bg-forest-900 transition disabled:opacity-60"
        >
          {loading ? "Creando…" : "Continuar a integrantes"}
        </button>
      </form>
    </main>
  );
}
