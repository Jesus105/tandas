# AGENTS.md — Tandas (Hackatón México 2026)

## CRITICAL: live Pey charge amount is always $0.01 MXN

**Do not change this casually.**

When `PEY_API_KEY` is set (live Pey mode), every real API call that **creates a charge** must send:

```ts
amount: 0.01
```

This is enforced in `src/lib/pey.ts` via:

- `PEY_LIVE_CHARGE_AMOUNT_MXN = 0.01`
- `peyChargeAmountMxn()`
- Applied inside `createCodiQr` and `createCodiPn` before the request body is built

### Why

1. The CLABEs in the seed / portal are **test accounts**, not the user's money.
2. Hackathon demos must not risk charging real amounts while wiring CoDi + webhooks.
3. The tanda can still **display** a story amount (e.g. $500) in the UI; that value is for the narrative only.
4. Changing the live amount without an explicit product decision can drain test balances or break the demo.

### What future agents must do

- Keep the hardcode. Do **not** “fix” live Pey to use `tanda.amount_cents`.
- If product later needs real amounts, require an explicit human OK and update this file + README in the same change.
- UI must keep labeling live CoDi as **$0.01 (prueba)** when Pey is connected.

### Related

- Seed members (test Persona ACTIVE CLABEs): `SEED_MEMBERS` in `src/lib/tandas.ts`
- Portal: https://portal.mipey.mx
- Env: `PEY_API_KEY`, `PEY_WEBHOOK_SECRET`, `SESSION_SECRET` (never `NEXT_PUBLIC_`)
- Auth: organizers own tandas; `/pagar/*` and `/api/webhooks/pey` stay public
