"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SimulatePayButton({ chargeId }: { chargeId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function simulate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/charges/${chargeId}/simulate`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={simulate}
        disabled={loading}
        className="w-full rounded-lg border border-gold-500/50 bg-gold-500/15 py-3 text-sm font-medium text-forest-900 hover:bg-gold-500/25 disabled:opacity-60"
      >
        {loading ? "Marcando…" : "Simular pago (solo modo demo)"}
      </button>
      {error && <p className="mt-1 text-xs text-red-700">{error}</p>}
    </div>
  );
}
