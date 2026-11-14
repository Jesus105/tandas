"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SeedButton({ className = "" }: { className?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function seed() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/seed", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al crear demo");
      router.push(`/tandas/${data.tanda.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
      setLoading(false);
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
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
    </div>
  );
}
