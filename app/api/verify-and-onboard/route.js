import { NextResponse } from "next/server";
import { createUserAccount } from "../../../src/hedera/createAccount.js";
import { findByNullifier, createUser } from "../../../src/db/users.js";
import { verifyWorldIdProof, extractNullifier } from "../../../src/world/verifyProof.js";
import { saveState } from "../../../src/state.js";
import { buildManualEnsBinding } from "../../../src/ens/identity.js";

async function fetchEvmAddress(accountId) {
  await new Promise((r) => setTimeout(r, 5000));
  const res = await fetch(
    `https://testnet.mirrornode.hedera.com/api/v1/accounts/${accountId}`
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data.evm_address ?? null;
}

export async function POST(request) {
  try {
    const { proof, role: requestedRole = "purchaser" } = await request.json();
    const role = requestedRole === "organizer" ? "organizer" : "purchaser";
    const nullifierHash = extractNullifier(proof);
    if (!nullifierHash) {
      return NextResponse.json({ error: "Missing proof" }, { status: 400 });
    }

    const action = process.env.WORLD_ACTION;
    if (!action) {
      return NextResponse.json({ error: "WORLD_ACTION is not configured" }, { status: 500 });
    }

    await verifyWorldIdProof(proof, action);

    const existing = findByNullifier(nullifierHash);
    if (existing) {
      return NextResponse.json(
        {
          error: "This human identity already has an account associated with it.",
          accountId: existing.account_id,
          role: existing.role,
        },
        { status: 409 }
      );
    }

    const buyer = await createUserAccount(60);
    const evmAddress = await fetchEvmAddress(buyer.accountId);
    const ens = buildManualEnsBinding({
      accountId: buyer.accountId,
      publicKey: buyer.publicKey,
      network: "testnet",
      worldVerified: true,
      nullifierHash,
    });

    createUser({
      nullifierHash,
      accountId: buyer.accountId,
      privateKey: buyer.privateKey,
      ensName: ens?.ensName,
      ensLabel: ens?.ensSubnameLabel,
      ensRecords: ens?.textRecords,
      role,
    });

    saveState({ buyer: { ...buyer, evmAddress } });

    return NextResponse.json({
      success: true,
      accountId: buyer.accountId,
      role,
      evmAddress,
      ens,
      hashscanUrl: `https://hashscan.io/testnet/account/${buyer.accountId}`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Onboarding failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
