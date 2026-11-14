import { customAlphabet } from "nanoid";

const nano = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 12);

export function id(prefix: string): string {
  return `${prefix}_${nano()}`;
}

/** Referencia CoDi ≤7 dígitos */
export function numRef(): string {
  return String(Math.floor(1000000 + Math.random() * 8999999));
}
