"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function OpenRoundButton({ tandaId }: { tandaId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function open() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/tandas/${tandaId}/rounds`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo abrir");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={open}
        disabled={loading}
        className="rounded-lg bg-forest-800 px-4 py-2 text-sm font-medium text-cream-50 hover:bg-forest-900 disabled:opacity-60"
      >
        {loading ? "Generando cobros CoDi…" : "Abrir ronda / Generar cobros"}
      </button>
      {error && <p className="mt-1 text-xs text-red-700">{error}</p>}
    </div>
  );
}
