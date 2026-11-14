"use client";

import Link from "next/link";
import { useState } from "react";

export default function RegistroPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo registrar");
      window.location.assign("/app");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-md px-6 py-12">
      <Link href="/" className="text-sm text-forest-600 hover:text-forest-900">
        ← Inicio
      </Link>
      <h1 className="mt-6 font-display text-3xl text-forest-900">Crear cuenta</h1>
      <p className="mt-2 text-sm text-forest-600">
        Para organizar tandas y generar cobros CoDi. Los participantes pagan sin
        cuenta, con el link.
      </p>
      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <label className="block">
          <span className="text-sm font-medium text-forest-800">Nombre</span>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-forest-200 bg-white/80 px-3 py-2.5 outline-none focus:border-forest-500"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-forest-800">Email</span>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-forest-200 bg-white/80 px-3 py-2.5 outline-none focus:border-forest-500"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-forest-800">
            Contraseña (mín. 8)
          </span>
          <input
            required
            type="password"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-forest-200 bg-white/80 px-3 py-2.5 outline-none focus:border-forest-500"
          />
        </label>
        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-forest-800 py-3 font-medium text-cream-50 hover:bg-forest-900 disabled:opacity-60"
        >
          {loading ? "Creando…" : "Registrarme"}
        </button>
      </form>
      <p className="mt-4 text-sm text-forest-600">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="font-medium text-forest-800 underline">
          Inicia sesión
        </Link>
      </p>
    </main>
  );
}
