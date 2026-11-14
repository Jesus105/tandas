# Tandas — ahorro rotativo con CoDi (Pey)

MVP para el **Hackatón México 2026**. El organizador configura la tanda una vez; cada ronda genera cobros CoDi **directo a la CLABE del beneficiario** (`bankAccountId`). Sin concentración de fondos. Sin WhatsApp API.

## Requisitos

- Node.js 20+
- Cuenta en [portal.mipey.mx](https://portal.mipey.mx) (para cobros reales)

## Monto live = siempre $0.01

Con `PEY_API_KEY` activo, **todo cobro CoDi real** (`POST /codi/qr`, `/codi/pn`) envía `amount: 0.01` MXN — hardcode en `src/lib/pey.ts` (`PEY_LIVE_CHARGE_AMOUNT_MXN`). Las CLABEs del seed son de prueba. La UI puede mostrar otro monto de historia (ej. $500). Detalle y reglas para agentes: [`AGENTS.md`](./AGENTS.md).

## Variables de entorno

Copia `.env.example` a `.env` (ya existe `.env` vacío en el repo local):

```bash
PEY_API_KEY=          # API Key de portal.mipey.mx
PEY_WEBHOOK_SECRET=   # Signing secret del webhook (Standard Webhooks)
```

| Variable | Uso |
|----------|-----|
| `PEY_API_KEY` | Auth `Authorization: Bearer …` contra `https://api.pey.mx`. **Sin ella → modo demo.** |
| `PEY_WEBHOOK_SECRET` | Verifica firmas en `POST /api/webhooks/pey`. Sin secret, en local se acepta el body sin verificar. |
| `DATABASE_URL` | Opcional. Si no está, la app usa **PGlite** en memoria (ideal para `npm run dev`). |

Nunca uses `NEXT_PUBLIC_` para estos secretos.

### Pasos en portal.mipey.mx

1. Entra a [portal.mipey.mx](https://portal.mipey.mx) y genera una **API Key**.
2. Pégala en `PEY_API_KEY` dentro de `.env`.
3. Configura el webhook hacia `https://TU_DOMINIO/api/webhooks/pey`.
4. Copia el **webhook secret** a `PEY_WEBHOOK_SECRET`.
5. CLABE de prueba Pey: `012180015826225713` (útila para demos / seed).

## Cómo correr

```bash
npm install
# sin DATABASE_URL → PGlite automático
env -u DATABASE_URL npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

Build:

```bash
npm run build
```

## Demo en 3 minutos

### Con Pey real (recomendado para el hackathon)

1. Pon `PEY_API_KEY` (y el secret del webhook) en `.env`.
2. Reinicia `npm run dev`. El banner debe decir **«Pey conectado»**.
3. Clic en **Probar tanda demo** (usa CLABE `012180015826225713`, monto $0.01) o crea una tanda.
4. En el tablero: **Abrir ronda / Generar cobros** → llama `POST /codi/qr` con `bankAccountId` del beneficiario.
5. Abre el link de un cobro, paga con CoDi desde la app bancaria.
6. El webhook marca **Pagado** en el tablero.

### Sin API key (fallback offline)

1. Sin `PEY_API_KEY`, el banner dice **«Datos de muestra / modo demo»**.
2. Seed + abrir ronda generan QR locales.
3. En `/pagar/[chargeId]` usa **Simular pago** (deshabilitado si Pey está vivo).

## Integración Pey (núcleo del producto)

Cliente: `src/lib/pey.ts`

| Endpoint | Uso |
|----------|-----|
| `POST /bank-account` | Registra CLABE de cada integrante (`entity: PERSON`) |
| `GET /bank-account/{id}` | Consulta estado CoDi |
| `POST /codi/qr` | Cobro con `bankAccountId` = **beneficiario de la ronda** |
| `POST /codi/pn` | Push CoDi opcional (teléfono + bankAccountId) |
| Webhook | `codi.qr.payment_received`, push pagado, bank account updated |

Cada cobro de la ronda apunta al `pey_bank_account_id` del beneficiario. El beneficiario **no** se cobra a sí mismo.

## Stack

- Next.js App Router + TypeScript + Tailwind
- Postgres vía `pg` + PGlite local (`cursor-app.json`, `migrations/`, `src/lib/db.ts`)
- `standardwebhooks` para firmar el webhook
- `qrcode` solo para QR de fallback en demo

## Rutas principales

| Ruta | Qué hace |
|------|----------|
| `/` | Landing |
| `/tandas/nueva` | Crear tanda |
| `/tandas/[id]` | Tablero organizador |
| `/tandas/[id]/miembros` | Integrantes + orden de turnos |
| `/pagar/[chargeId]` | Página de pago / QR (sin cuenta) |
| `/api/webhooks/pey` | Webhook Pey |
| `/api/seed` | Tanda demo de 4 personas |

## Principio del hackathon

**No** hay pool ni cuenta concentradora. El dinero va de cada pagador al beneficiario de la ronda vía CoDi.
