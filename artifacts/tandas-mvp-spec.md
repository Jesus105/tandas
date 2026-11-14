# Tandas — MVP Implementation Spec (Hackatón México 2026)

**Status:** planning only — do not treat as coded yet.  
**Source brief:** `tandas-brief.md` (product idea; this file is the build plan).  
**Constraint:** No payment concentration. Round charges must use the beneficiary's `bankAccountId`.

---

## 1. Stack recommendation

Single deployable web app for hackathon speed:

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | **Next.js App Router** + **TypeScript** | Routes + API in one repo; fast to demo |
| UI | **Tailwind CSS** | Speed; organizer dashboard without design system tax |
| DB | **SQLite** via **better-sqlite3** *or* **libsql** (`@libsql/client` / Turso local file) | Zero ops; file on disk; enough for MVP |
| ORM (optional) | Drizzle or raw SQL | Prefer Drizzle if team wants migrations; raw SQL OK for 4 tables |
| Auth (MVP) | Soft auth: organizer session cookie / magic link stub, or single shared organizer PIN | Don't burn time on full auth |
| Payments | **Pey API** (CoDi) | Hackathon requirement |
| Webhooks | **Standard Webhooks** signature verify | Pey webhook integrity |
| Deploy | Vercel / Fly / local `next start` + ngrok for webhooks | Need public URL for Pey callbacks |

**Env vars**

```
PEY_API_KEY=
PEY_API_BASE_URL=          # from Pey docs
PEY_WEBHOOK_SECRET=        # Standard Webhooks signing secret
DEMO_MODE=true             # force mock when unset key also implies demo
DATABASE_URL=file:./data/tandas.db
ORGANIZER_PIN=             # optional simple gate
```

If `PEY_API_KEY` is missing → **Demo mode** (see §6).

---

## 2. Data model (tables)

### `tandas`
| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | uuid |
| name | TEXT | |
| frequency | TEXT | `weekly` \| `biweekly` \| `monthly` |
| amount_cents | INTEGER | store minor units (MXN centavos) |
| start_date | TEXT | ISO date |
| status | TEXT | `draft` \| `ready` \| `active` \| `completed` |
| created_at | TEXT | ISO datetime |

### `participants`
| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | |
| tanda_id | TEXT FK → tandas | |
| name | TEXT | |
| phone | TEXT | E.164 preferred |
| clabe | TEXT | 18 digits |
| turn_order | INTEGER | 1..N |
| pey_bank_account_id | TEXT NULL | from Pey `POST /bank-account` |
| pey_status | TEXT | `pending` \| `active` \| `failed` \| `demo` |
| created_at | TEXT | |

Unique: `(tanda_id, turn_order)`, `(tanda_id, clabe)`.

### `rounds`
| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | |
| tanda_id | TEXT FK | |
| number | INTEGER | 1..N |
| beneficiary_id | TEXT FK → participants | |
| date | TEXT | planned/actual |
| status | TEXT | `pending` \| `open` \| `complete` |
| started_at | TEXT NULL | |
| completed_at | TEXT NULL | |

Unique: `(tanda_id, number)`.

### `charges`
| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | |
| round_id | TEXT FK | |
| payer_id | TEXT FK → participants | who must pay |
| pey_charge_id | TEXT NULL | Pey charge/QR/PN id |
| type | TEXT | `qr` \| `pn` \| `link` |
| status | TEXT | `pending` \| `paid` \| `review` \| `failed` |
| amount_cents | INTEGER | expected amount |
| paid_amount_cents | INTEGER NULL | from webhook |
| payment_url | TEXT NULL | link/QR payload for copy |
| num_ref | TEXT | idempotent ref: `tandaId:roundNum:payerId` |
| transaction_id | TEXT NULL | webhook idempotency |
| paid_at | TEXT NULL | |
| created_at | TEXT | |

Unique: `num_ref`. Unique optional: `transaction_id` when set.

### Indexes
- `charges(round_id, status)`
- `participants(tanda_id)`
- `rounds(tanda_id, status)`

**Webhook binding:** match on `numRef` / metadata → `charges.num_ref`; idempotent upsert on `transaction_id`.

---

## 3. Routes / pages (App Router)

### Organizer UI
| Route | Purpose |
|-------|---------|
| `/` | Landing → CTA to organizer |
| `/org` | Mis tandas (list + current round status) |
| `/org/tandas/new` | Create tanda: name, frequency, amount, start date |
| `/org/tandas/[tandaId]` | Tanda hub |
| `/org/tandas/[tandaId]/participants` | Add/edit name, phone, CLABE; show Pey status |
| `/org/tandas/[tandaId]/order` | Drag/reorder turns; randomize |
| `/org/tandas/[tandaId]/rounds/[roundId]` | **Tablero:** beneficiary, paid/pending/N/A, copy payment links, progress |
| `/org/tandas/[tandaId]/history` | Past rounds |

### Participant UI
| Route | Purpose |
|-------|---------|
| `/pay/[chargeId]` | Payment page: amount, concept, QR/link; **no account required** |
| `/t/[tandaId]/me/[participantId]` *(optional)* | “Mi tanda”: paid? when do I receive? |

### API routes
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/tandas` | GET/POST | list / create |
| `/api/tandas/[tandaId]` | GET/PATCH | detail / confirm ready |
| `/api/tandas/[tandaId]/participants` | GET/POST | CRUD participants; register CLABE with Pey |
| `/api/tandas/[tandaId]/order` | PUT | set turn_order[] |
| `/api/tandas/[tandaId]/rounds/start` | POST | open next round; create charges |
| `/api/charges/[chargeId]` | GET | payment page data |
| `/api/webhooks/pey` | POST | Standard Webhooks verify → mark paid |
| `/api/demo/pay/[chargeId]` | POST | Demo-only: simulate payment |
| `/api/seed` | POST | load 4-person demo tanda (dev/demo only) |

---

## 4. Core flows (implementation)

### 4.1 Configure (once)
1. Create `tanda` (`draft`).
2. Add participants → for each CLABE call Pey `POST /bank-account` → store `pey_bank_account_id`, `pey_status`.
3. Set `turn_order` (manual or shuffle).
4. Confirm → status `ready`; pre-create `rounds` rows 1..N with beneficiaries from order (or create round on start only — either OK; prefer create-on-start for less upfront complexity).

**Note:** Banxico CLABE activation can take up to 5 business days → UI must show `pending` / `active`. In demo mode, mark all `demo`/`active` immediately.

### 4.2 Start round
1. Organizer clicks **Iniciar ronda** (MVP: manual only; calendar later).
2. Resolve beneficiary = participant with `turn_order == round.number`.
3. For every other participant:
   - Create `charge` with `num_ref = ${tandaId}:${roundNumber}:${payerId}`.
   - Call Pey create charge:
     - Prefer `POST /codi/qr` (and/or payment link); optional `POST /codi/pn` if phone enrolled.
     - **Critical:** pass `bankAccountId` = **beneficiary's** `pey_bank_account_id` (not organizer, not payer).
     - Amount = tanda amount; concept = `${tanda.name} · Ronda ${n}`.
   - Store `pey_charge_id`, `payment_url` / QR payload, status `pending`.
4. Beneficiary gets **no** charge (`N/A` on board).
5. Round status → `open`.

### 4.3 Pay
- Participant opens `/pay/[chargeId]` (or Pey-hosted URL).
- Pays via CoDi in bank app.
- No screenshot.

### 4.4 Webhook
1. `POST /api/webhooks/pey`
2. Verify signature with **Standard Webhooks** + `PEY_WEBHOOK_SECRET`.
3. Handle `codi.qr.payment_received` / `codi.pn.payment_received` (and account-status events if available).
4. Read `numRef` / metadata → find charge.
5. Idempotency: if `transaction_id` already seen → 200 no-op.
6. If paid amount ≠ expected → status `review`.
7. Else → `paid`, set `paid_at`, `transaction_id`.
8. If all non-beneficiary charges paid → round `complete`.

### 4.5 Next round
Repeat with next beneficiary in order.

---

## 5. Pey integration checklist

| Need | How |
|------|-----|
| Register beneficiary CLABE | `POST /bank-account` per participant |
| Know CLABE ready | account status poll / account webhook → update `pey_status` |
| Create round charge | `POST /codi/qr`, `POST /codi/pn`, or payment link |
| Correct destination | **`bankAccountId` of round beneficiary** |
| Know payment landed | webhook payment_received |
| Separate payers/rounds | `numRef` + metadata `(tanda, round, participant)` |

**Pey limitations to bake in**
- No native recurring charges — app schedules/fires rounds.
- CLABE activation can take days.
- CoDi push only if phone enrolled at bank.
- One webhook URL per API key.

**Rules compliance**
- Never route money to an organizer/platform pooling account.
- Never charge the beneficiary for their own round.
- UI copy should show destination CLABE last-4 for demo judges.

---

## 6. Demo mode (no `PEY_API_KEY`)

When `!process.env.PEY_API_KEY` or `DEMO_MODE=true`:

| Real call | Mock behavior |
|-----------|----------------|
| `POST /bank-account` | Return fake `bankAccountId = ba_demo_${participantId}`; status `active` |
| Create QR/PN/link | Generate local `/pay/[chargeId]` URL; optional SVG QR of that URL |
| Webhook | Not required; use **Pagar (demo)** button on `/pay/[chargeId]` → `POST /api/demo/pay/[chargeId]` marks paid with fake `transaction_id` |
| Banner | Persistent “Modo demo — sin Pey” in UI |

Demo mode must still exercise: create tanda → start round → mark paid → board updates → show beneficiary destination (not concentrator).

---

## 7. Seed data — 4-person tanda

`POST /api/seed` (or `npm run seed`) creates:

**Tanda:** `Tanda Oficina Demo`  
- frequency: `weekly`  
- amount: `$500.00` (50000 centavos)  
- start_date: next Monday (or today)  
- status: `ready`

| turn_order | name | phone | clabe (fake 18) | role in round 1 |
|------------|------|-------|-----------------|-----------------|
| 1 | Ana López | +525511110001 | 646180157000000001 | **Beneficiary** (no charge) |
| 2 | Bruno Díaz | +525511110002 | 646180157000000002 | Payer |
| 3 | Carla Ruiz | +525511110003 | 646180157000000003 | Payer |
| 4 | Diego Soto | +525511110004 | 646180157000000004 | Payer |

- All `pey_status = active` (demo ids).  
- Optionally auto-open **Ronda 1** with 3 pending charges → Ana as beneficiary.  
- Organizer can copy Bruno/Carla/Diego payment links for the demo script.

---

## 8. Screens → build priority

**P0 (demo video)**
1. Create / seed tanda  
2. Participants list with Pey status  
3. Start round + tablero (paid/pending/N/A + copy link)  
4. `/pay/[chargeId]` + demo pay / real CoDi  
5. Webhook (or demo) → board flips to Pagado  
6. Visible proof charge destination = beneficiary CLABE

**P1**
- Turn order editor + randomize  
- History  
- Optional “Mi tanda”

**P2 / out of scope (from product brief)**
- WhatsApp API / Baileys  
- Organizer pooling & redistribute  
- Scoring, guarantees, penalties  
- Complex multi-tanda product  
- Turn auction  
- Native app  
- Bank onboarding beyond CLABE register

---

## 9. Hackathon demo script (≤3 min)

1. Show seeded 4-person tanda (or create live).  
2. Show CLABEs registered (demo or Pey test).  
3. Start round → charges generated; highlight `bankAccountId` / CLABE last-4 of **beneficiary**.  
4. Pay one charge (real CoDi small amount **or** demo button).  
5. Board → **Pagado**.  
6. Say explicitly: money goes to beneficiary CLABE, not a concentrator.

---

## 10. Success criteria (ship checklist)

- [ ] Organizer configures tanda (freq, amount, people, CLABEs, order)  
- [ ] Start round creates CoDi charges (or demo equivalents) to **beneficiary** `bankAccountId`  
- [ ] Webhook (or demo pay) updates board without screenshots  
- [ ] Participant pays via link without app account  
- [ ] Video-ready end-to-end path  

---

## 11. Open decisions (defaults for build)

| Question | MVP default |
|----------|-------------|
| Participant needs account? | **No** — payment link only |
| Round auto by date? | **Manual** start button only |
| Beneficiary sees who paid? | **Organizer only** (optional later) |
| Multi bankAccountId per API key? | Assume yes; fail loud in UI if Pey rejects |
| Legal “a favor de terceros”? | Architect for direct-to-beneficiary; flag for legal@pey.mx |

---

## 12. Suggested repo layout (when coding starts)

```
app/
  (org)/org/...
  pay/[chargeId]/page.tsx
  api/webhooks/pey/route.ts
  api/demo/pay/[chargeId]/route.ts
lib/
  db.ts
  pey/client.ts
  pey/webhooks.ts
  demo.ts
scripts/seed.ts
data/tandas.db   # gitignored
```

**Do not implement until coordinator says go.**
