"use client";

import { useState } from "react";

export function CopyLinkButton({ chargeId }: { chargeId: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const url = `${window.location.origin}/pagar/${chargeId}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="w-full rounded-lg bg-forest-800 py-3 text-sm font-medium text-cream-50 hover:bg-forest-900"
    >
      {copied ? "Link copiado" : "Copiar link de pago"}
    </button>
  );
}
