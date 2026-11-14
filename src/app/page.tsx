import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";

export default async function HomePage() {
  const user = await getCurrentUser();

  return (
    <main className="relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%233e6354' fill-opacity='0.06'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
        }}
      />

      <div className="relative mx-auto max-w-3xl px-6 pt-16 pb-24 sm:pt-24">
        <div className="flex justify-end gap-3 text-sm">
          {user ? (
            <Link
              href="/app"
              className="font-medium text-forest-800 underline-offset-2 hover:underline"
            >
              Ir a mis tandas
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="text-forest-700 underline-offset-2 hover:underline"
              >
                Iniciar sesión
              </Link>
              <Link
                href="/registro"
                className="font-medium text-forest-800 underline-offset-2 hover:underline"
              >
                Crear cuenta
              </Link>
            </>
          )}
        </div>

        <p className="animate-fade-up mt-8 text-sm font-medium tracking-wide text-gold-600 uppercase">
          Hackatón México 2026 · Pey CoDi
        </p>
        <h1 className="animate-fade-up-delay mt-4 font-display text-5xl sm:text-6xl font-semibold tracking-tight text-forest-900 leading-[1.05]">
          Tandas
        </h1>
        <p className="animate-fade-up-delay-2 mt-5 max-w-xl text-lg text-forest-700 leading-relaxed">
          Ahorro rotativo sin capturas ni concentración de fondos. Cada ronda,
          CoDi cobra directo a la CLABE de quien recibe — el organizador solo
          configura y ve quién ya pagó.
        </p>

        <div className="animate-fade-up-delay-2 mt-10 flex flex-wrap items-center gap-3">
          {user ? (
            <Link
              href="/app"
              className="inline-flex items-center justify-center rounded-lg bg-forest-800 px-6 py-3 text-base font-medium text-cream-50 shadow-sm hover:bg-forest-900 transition"
            >
              Mis tandas
            </Link>
          ) : (
            <>
              <Link
                href="/registro"
                className="inline-flex items-center justify-center rounded-lg bg-forest-800 px-6 py-3 text-base font-medium text-cream-50 shadow-sm hover:bg-forest-900 transition"
              >
                Empezar gratis
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-lg border border-forest-600/30 bg-white/70 px-5 py-2.5 text-sm font-medium text-forest-800 hover:bg-white transition"
              >
                Ya tengo cuenta
              </Link>
            </>
          )}
        </div>

        <section className="mt-20 grid gap-8 sm:grid-cols-3">
          {[
            {
              title: "Configura una vez",
              body: "Monto, frecuencia, integrantes y orden de turnos.",
            },
            {
              title: "Cobro a quien le toca",
              body: "Cada CoDi apunta al bankAccountId del beneficiario de la ronda.",
            },
            {
              title: "Webhook = pagado",
              body: "Pey avisa; el tablero se actualiza. Sin capturas de pantalla.",
            },
          ].map((item) => (
            <div key={item.title}>
              <h2 className="font-display text-xl text-forest-900">
                {item.title}
              </h2>
              <p className="mt-2 text-sm text-forest-600 leading-relaxed">
                {item.body}
              </p>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
