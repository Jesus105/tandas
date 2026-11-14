import { isPeyLive } from "@/lib/pey";

export function DemoBanner() {
  if (isPeyLive()) {
    return (
      <div className="border-b border-forest-700/20 bg-forest-800 text-cream-50 text-center text-sm py-2 px-4">
        Pey conectado · cobros CoDi reales vía{" "}
        <span className="font-medium">api.pey.mx</span>
      </div>
    );
  }
  return (
    <div className="border-b border-gold-500/40 bg-gold-500/15 text-forest-900 text-center text-sm py-2 px-4 animate-soft-pulse">
      Datos de muestra / modo demo — configura{" "}
      <code className="font-mono text-xs bg-white/60 px-1 rounded">
        PEY_API_KEY
      </code>{" "}
      en <code className="font-mono text-xs bg-white/60 px-1 rounded">.env</code>{" "}
      para cobros CoDi reales
    </div>
  );
}
