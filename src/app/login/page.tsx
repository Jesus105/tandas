"use client";

import Link from "next/link";
import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo iniciar sesión");
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
      <h1 className="mt-6 font-display text-3xl text-forest-900">
        Iniciar sesión
      </h1>
      <p className="mt-2 text-sm text-forest-600">
        Accede a tus tandas como organizador.
      </p>
      <form onSubmit={onSubmit} className="mt-8 space-y-4">
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
          <span className="text-sm font-medium text-forest-800">Contraseña</span>
          <input
            required
            type="password"
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
          {loading ? "Entrando…" : "Entrar"}
        </button>
      </form>
      <p className="mt-4 text-sm text-forest-600">
        ¿Nuevo?{" "}
        <Link href="/registro" className="font-medium text-forest-800 underline">
          Crea una cuenta
        </Link>
      </p>
    </main>
  );
}
