import { sql } from "./db";
import { id, numRef } from "./ids";
import { createBankAccount, createCodiQr, isPeyLive } from "./pey";
import type { Charge, Frequency, Member, Round, Tanda } from "./types";

export async function createTanda(input: {
  name: string;
  amountCents: number;
  frequency: Frequency;
  startDate: string;
}): Promise<Tanda> {
  const tandaId = id("tanda");
  const rows = await sql<Tanda>(
    `INSERT INTO tandas (id, name, amount_cents, frequency, start_date, status)
     VALUES ($1, $2, $3, $4, $5, 'draft')
     RETURNING *`,
    [tandaId, input.name, input.amountCents, input.frequency, input.startDate],
  );
  return rows[0];
}

export async function getTanda(tandaId: string): Promise<Tanda | null> {
  const rows = await sql<Tanda>(`SELECT * FROM tandas WHERE id = $1`, [tandaId]);
  return rows[0] ?? null;
}

export async function listMembers(tandaId: string): Promise<Member[]> {
  return sql<Member>(
    `SELECT * FROM members WHERE tanda_id = $1 ORDER BY turn_order ASC, created_at ASC`,
    [tandaId],
  );
}

export async function addMember(input: {
  tandaId: string;
  name: string;
  phone: string;
  clabe: string;
  turnOrder: number;
}): Promise<Member> {
  const memberId = id("mem");
  const alias = `tanda-${input.tandaId.slice(-6)}-${input.name.slice(0, 20)}`;
  const ba = await createBankAccount({
    alias,
    name: input.name,
    clabe: input.clabe,
  });

  const rows = await sql<Member>(
    `INSERT INTO members
      (id, tanda_id, name, phone, clabe, pey_bank_account_id, pey_codi_status, turn_order)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      memberId,
      input.tandaId,
      input.name,
      input.phone,
      input.clabe,
      ba.id,
      ba.codiStatus ?? "pending",
      input.turnOrder,
    ],
  );

  await sql(
    `UPDATE tandas SET status = 'ready' WHERE id = $1 AND status = 'draft'`,
    [input.tandaId],
  );

  return rows[0];
}

export async function reorderMembers(
  tandaId: string,
  orderedIds: string[],
): Promise<Member[]> {
  for (let i = 0; i < orderedIds.length; i++) {
    await sql(
      `UPDATE members SET turn_order = $1 WHERE id = $2 AND tanda_id = $3`,
      [i + 1, orderedIds[i], tandaId],
    );
  }
  return listMembers(tandaId);
}

export async function shuffleTurns(tandaId: string): Promise<Member[]> {
  const members = await listMembers(tandaId);
  for (let i = members.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [members[i], members[j]] = [members[j], members[i]];
  }
  return reorderMembers(
    tandaId,
    members.map((m) => m.id),
  );
}

export async function getOpenRound(tandaId: string): Promise<Round | null> {
  const rows = await sql<Round>(
    `SELECT * FROM rounds WHERE tanda_id = $1 AND status = 'open'
     ORDER BY round_number DESC LIMIT 1`,
    [tandaId],
  );
  return rows[0] ?? null;
}

export async function listRounds(tandaId: string): Promise<Round[]> {
  return sql<Round>(
    `SELECT * FROM rounds WHERE tanda_id = $1 ORDER BY round_number ASC`,
    [tandaId],
  );
}

export async function listCharges(roundId: string): Promise<Charge[]> {
  return sql<Charge>(`SELECT * FROM charges WHERE round_id = $1`, [roundId]);
}

export async function getCharge(chargeId: string): Promise<Charge | null> {
  const rows = await sql<Charge>(`SELECT * FROM charges WHERE id = $1`, [
    chargeId,
  ]);
  return rows[0] ?? null;
}

/**
 * Abre una ronda y genera cobros CoDi para TODOS excepto el beneficiario.
 * Destino de cada cobro = pey_bank_account_id del beneficiario (sin concentración).
 */
export async function openRound(tandaId: string): Promise<{
  round: Round;
  charges: Charge[];
  beneficiary: Member;
}> {
  const tanda = await getTanda(tandaId);
  if (!tanda) throw new Error("Tanda no encontrada");

  const existing = await getOpenRound(tandaId);
  if (existing) throw new Error("Ya hay una ronda abierta");

  const members = await listMembers(tandaId);
  if (members.length < 2) {
    throw new Error("Se necesitan al menos 2 integrantes");
  }

  const nextNumber = tanda.current_round + 1;
  if (nextNumber > members.length) {
    throw new Error("Todas las rondas ya se completaron");
  }

  const beneficiary = members.find((m) => m.turn_order === nextNumber);
  if (!beneficiary) {
    throw new Error(`No hay integrante con turno ${nextNumber}`);
  }
  if (!beneficiary.pey_bank_account_id) {
    throw new Error(
      `El beneficiario ${beneficiary.name} no tiene cuenta Pey registrada`,
    );
  }

  const roundId = id("round");
  const roundRows = await sql<Round>(
    `INSERT INTO rounds (id, tanda_id, round_number, beneficiary_member_id, status)
     VALUES ($1, $2, $3, $4, 'open')
     RETURNING *`,
    [roundId, tandaId, nextNumber, beneficiary.id],
  );
  const round = roundRows[0];

  await sql(
    `UPDATE tandas SET current_round = $1, status = 'active' WHERE id = $2`,
    [nextNumber, tandaId],
  );

  const payers = members.filter((m) => m.id !== beneficiary.id);
  const charges: Charge[] = [];
  const expiration = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const amountPesos = tanda.amount_cents / 100;

  for (const payer of payers) {
    const chargeId = id("chg");
    const ref = numRef();
    const concept = `${tanda.name} · Ronda ${nextNumber} · ${payer.name}`.slice(
      0,
      40,
    );
    const metadata = {
      tandaId,
      roundId,
      chargeId,
      payerMemberId: payer.id,
      beneficiaryMemberId: beneficiary.id,
    };

    // Destino = CLABE/cuenta del BENEFICIARIO — no pool de plataforma
    const qr = await createCodiQr({
      amount: amountPesos,
      concept,
      expiration,
      numRef: ref,
      bankAccountId: beneficiary.pey_bank_account_id!,
      metadata,
    });

    const rows = await sql<Charge>(
      `INSERT INTO charges
        (id, round_id, payer_member_id, amount_cents, concept, num_ref,
         pey_qr_id, qr_string, qr_image, status, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'pending',$10::jsonb)
       RETURNING *`,
      [
        chargeId,
        roundId,
        payer.id,
        tanda.amount_cents,
        concept,
        ref,
        qr.id,
        qr.qrString,
        qr.qrImage,
        JSON.stringify(metadata),
      ],
    );
    charges.push(rows[0]);
  }

  return { round, charges, beneficiary };
}

export async function markChargePaid(chargeId: string): Promise<Charge | null> {
  const rows = await sql<Charge>(
    `UPDATE charges SET status = 'paid', paid_at = now()
     WHERE id = $1 AND status = 'pending'
     RETURNING *`,
    [chargeId],
  );
  const charge = rows[0];
  if (!charge) return null;

  const pending = await sql<{ c: string }>(
    `SELECT count(*)::text AS c FROM charges
     WHERE round_id = $1 AND status = 'pending'`,
    [charge.round_id],
  );
  if (Number(pending[0]?.c ?? 1) === 0) {
    await sql(
      `UPDATE rounds SET status = 'complete', closed_at = now() WHERE id = $1`,
      [charge.round_id],
    );
  }
  return charge;
}

export async function markChargePaidByPey(opts: {
  peyQrId?: string;
  numRef?: string;
  chargeId?: string;
}): Promise<Charge | null> {
  let charge: Charge | null = null;
  if (opts.chargeId) {
    charge = await getCharge(opts.chargeId);
  } else if (opts.peyQrId) {
    const rows = await sql<Charge>(
      `SELECT * FROM charges WHERE pey_qr_id = $1 LIMIT 1`,
      [opts.peyQrId],
    );
    charge = rows[0] ?? null;
  } else if (opts.numRef) {
    const rows = await sql<Charge>(
      `SELECT * FROM charges WHERE num_ref = $1 LIMIT 1`,
      [opts.numRef],
    );
    charge = rows[0] ?? null;
  }
  if (!charge) return null;
  if (charge.status === "paid") return charge;
  return markChargePaid(charge.id);
}

export async function seedDemoTanda(): Promise<Tanda> {
  const live = isPeyLive();
  // CLABE de prueba Pey (portal.mipey.mx)
  const testClabe = "012180015826225713";
  const amountCents = live ? 1 : 10000; // $0.01 live / $100 demo display

  const tanda = await createTanda({
    name: "Tanda demo familia",
    amountCents,
    frequency: "semanal",
    startDate: new Date().toISOString().slice(0, 10),
  });

  const people = [
    { name: "Ana López", phone: "5512345678" },
    { name: "Bruno Méndez", phone: "5587654321" },
    { name: "Carla Ruiz", phone: "5522334455" },
    { name: "Diego Soto", phone: "5599887766" },
  ];

  for (let i = 0; i < people.length; i++) {
    const clabe = live
      ? testClabe
      : `01218001582622${String(5713 + i).padStart(4, "0")}`.slice(0, 18);
    await addMember({
      tandaId: tanda.id,
      name: people[i].name,
      phone: people[i].phone,
      clabe: live ? testClabe : clabe.padEnd(18, "0").slice(0, 18),
      turnOrder: i + 1,
    });
  }

  return (await getTanda(tanda.id))!;
}

export { isPeyLive };
