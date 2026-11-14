"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type Member = {
  id: string;
  name: string;
  phone: string;
  clabe: string;
  pey_bank_account_id: string | null;
  pey_codi_status: string | null;
  turn_order: number;
};

export default function MiembrosPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [clabe, setClabe] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/tandas/${id}/members`);
    if (res.status === 401) {
      window.location.assign("/login");
      return;
    }
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "No se pudieron cargar integrantes");
      return;
    }
    setMembers(await res.json());
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function addMember(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/tandas/${id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, clabe }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error");
      setName("");
      setPhone("");
      setClabe("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  async function persistOrder(next: Member[]) {
    setMembers(next);
    await fetch(`/api/tandas/${id}/members`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedIds: next.map((m) => m.id) }),
    });
  }

  function onDrop(toIdx: number) {
    if (dragIdx === null || dragIdx === toIdx) return;
    const next = [...members];
    const [item] = next.splice(dragIdx, 1);
    next.splice(toIdx, 0, item);
    setDragIdx(null);
    void persistOrder(next);
  }

  async function shuffle() {
    const res = await fetch(`/api/tandas/${id}/members`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "shuffle" }),
    });
    setMembers(await res.json());
  }

  return (
    <main className="mx-auto max-w-xl px-6 py-12">
      <Link
        href={`/tandas/${id}`}
        className="text-sm text-forest-600 hover:text-forest-900"
      >
        ← Tablero
      </Link>
      <h1 className="mt-6 font-display text-3xl text-forest-900">
        Integrantes y turnos
      </h1>
      <p className="mt-2 text-sm text-forest-600">
        Cada CLABE se registra en Pey (`POST /bank-account`). Arrastra para
        ordenar quién recibe en cada ronda, o usa aleatorio.
      </p>

      <form onSubmit={addMember} className="mt-8 space-y-3">
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre"
          className="w-full rounded-lg border border-forest-200 bg-white/80 px-3 py-2.5 outline-none focus:border-forest-500"
        />
        <input
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
          placeholder="Teléfono (10 dígitos)"
          inputMode="numeric"
          className="w-full rounded-lg border border-forest-200 bg-white/80 px-3 py-2.5 outline-none focus:border-forest-500"
        />
        <input
          required
          value={clabe}
          onChange={(e) => setClabe(e.target.value.replace(/\D/g, "").slice(0, 18))}
          placeholder="CLABE (18 dígitos)"
          inputMode="numeric"
          className="w-full rounded-lg border border-forest-200 bg-white/80 px-3 py-2.5 outline-none focus:border-forest-500 font-mono text-sm"
        />
        {error && <p className="text-sm text-red-700">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-forest-800 py-2.5 text-cream-50 font-medium hover:bg-forest-900 disabled:opacity-60"
        >
          {loading ? "Registrando en Pey…" : "Agregar e registrar en Pey"}
        </button>
      </form>

      <div className="mt-10 flex items-center justify-between">
        <h2 className="font-display text-xl text-forest-900">
          Orden de turnos
        </h2>
        <button
          type="button"
          onClick={shuffle}
          className="text-sm text-forest-700 underline-offset-2 hover:underline"
        >
          Orden aleatorio
        </button>
      </div>

      {members.length === 0 ? (
        <p className="mt-4 text-sm text-forest-500">
          Aún no hay integrantes. Agrega al menos 2 para abrir una ronda.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {members.map((m, idx) => (
            <li
              key={m.id}
              draggable
              onDragStart={() => setDragIdx(idx)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(idx)}
              className="flex items-start gap-3 rounded-lg border border-forest-200/80 bg-white/70 px-3 py-3 cursor-grab active:cursor-grabbing"
            >
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-forest-800 text-cream-50 text-sm font-medium">
                {idx + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-forest-900">{m.name}</p>
                <p className="text-xs text-forest-500 font-mono truncate">
                  {m.clabe} · Pey {m.pey_codi_status ?? "—"}
                </p>
                {m.pey_bank_account_id && (
                  <p className="text-xs text-forest-400 font-mono truncate">
                    {m.pey_bank_account_id}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={() => router.push(`/tandas/${id}`)}
        className="mt-8 w-full rounded-lg border border-forest-600/30 bg-white/80 py-3 font-medium text-forest-800 hover:bg-white"
      >
        Ir al tablero
      </button>
    </main>
  );
}
