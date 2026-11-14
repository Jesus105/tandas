"use client";

import { useState } from "react";

const SEED_TIMEOUT_MS = 90_000;

export function SeedButton({ className = "" }: { className?: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  async function seed() {
    setLoading(true);
    setError(null);
    setHint(
      "Registrando integrantes en Pey (puede tardar ~10–30 s)…",
    );

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), SEED_TIMEOUT_MS);

    try {
      const res = await fetch("/api/seed", {
        method: "POST",
        signal: controller.signal,
      });
      let data: { tanda?: { id?: string }; error?: string; message?: string } =
        {};
      try {
        data = await res.json();
      } catch {
        throw new Error("Respuesta inválida del servidor");
      }
      if (!res.ok) {
        throw new Error(data.error || `Error al crear demo (${res.status})`);
      }
      const id = data.tanda?.id;
      if (!id) throw new Error("La demo se creó sin id de tanda");

      setHint("Listo — abriendo tablero…");
      // Hard navigation avoids soft-router races after a long seed
      window.location.assign(`/tandas/${id}`);
    } catch (e) {
      const msg =
        e instanceof Error && e.name === "AbortError"
          ? "Tiempo agotado registrando CLABEs en Pey. Reintenta o crea la tanda a mano."
          : e instanceof Error
            ? e.message
            : "Error al crear la demo";
      setError(msg);
      setHint(null);
      setLoading(false);
    } finally {
      clearTimeout(timer);
    }
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={seed}
        disabled={loading}
        className="inline-flex items-center justify-center rounded-lg border border-forest-600/30 bg-white/70 px-5 py-2.5 text-sm font-medium text-forest-800 hover:bg-white transition disabled:opacity-60"
      >
        {loading ? "Creando demo…" : "Probar tanda demo"}
      </button>
      {hint && !error && (
        <p className="mt-2 text-xs text-forest-600 animate-soft-pulse">{hint}</p>
      )}
      {error && (
        <p
          role="alert"
          className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {error}
        </p>
      )}
    </div>
  );
}
