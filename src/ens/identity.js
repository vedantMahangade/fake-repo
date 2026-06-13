export function hederaAccountIdToEnsLabel(accountId) {
  const label = accountId
    .trim()
    .toLowerCase()
    .replace(/\./g, "-")
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  if (!label) {
    throw new Error(`Cannot create ENS label from Hedera account ID: ${accountId}`);
  }

  return label;
}

export function buildEnsNameFromHederaAccount(accountId, parentName) {
  return `${hederaAccountIdToEnsLabel(accountId)}.${parentName}`;
}

export function buildManualEnsBinding({
  accountId,
  publicKey,
  parentName = process.env.ENS_PARENT_NAME,
  network = "testnet",
  worldVerified = true,
  nullifierHash = "",
}) {
  if (!parentName) {
    return null;
  }

  const label = hederaAccountIdToEnsLabel(accountId);
  const ensName = buildEnsNameFromHederaAccount(accountId, parentName);
  const textRecords = {
    "hedera.account_id": accountId,
    "hedera.public_key": publicKey,
    "hedera.network": network,
    "world.verified": worldVerified ? "true" : "false",
    "world.nullifier_hash": nullifierHash,
  };

  return {
    ensName,
    ensSubnameLabel: label,
    ensParentName: parentName,
    textRecords,
    manualEnsSteps: [
      `Open ENS Manager for ${parentName}.`,
      `Create this subname: ${label}`,
      `Full ENS name: ${ensName}`,
      "Add each key/value pair from textRecords as ENS text records.",
      "Save the records and verify that the ENS name resolves to these Hedera values.",
    ],
  };
}
