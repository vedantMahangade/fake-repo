import {
  TokenCreateTransaction, TokenType, TokenSupplyType,
  CustomRoyaltyFee, CustomFixedFee, Hbar, PrivateKey
} from "@hashgraph/sdk";
import { getClient, operatorId } from "../client.js";

export async function createTicketToken() {
  const client = getClient();

  // Every key must be decided NOW — none can be added later, none removed once set.
  const adminKey    = PrivateKey.generateECDSA();
  const supplyKey   = PrivateKey.generateECDSA(); // required to mint serials
  const freezeKey   = PrivateKey.generateECDSA(); // freeze used/stolen tickets
  const pauseKey    = PrivateKey.generateECDSA(); // pause all (match cancelled)
  const metadataKey = PrivateKey.generateECDSA(); // update NFT metadata (resale flag)

  // Royalty: 10% of each resale goes to the issuer (operator).
  // Fallback fee applies if an NFT moves with no payment (anti gift-evasion).
  const royalty = new CustomRoyaltyFee()
    .setNumerator(10)
    .setDenominator(100)
    .setFeeCollectorAccountId(operatorId)
    .setFallbackFee(new CustomFixedFee().setHbarAmount(new Hbar(5)));

  const tx = await new TokenCreateTransaction()
    .setTokenName("WorldCup Ticket")
    .setTokenSymbol("WCT")
    .setTokenType(TokenType.NonFungibleUnique)
    .setSupplyType(TokenSupplyType.Finite)
    .setMaxSupply(10000)
    .setInitialSupply(0)               // must be 0 for NFTs
    .setTreasuryAccountId(operatorId)  // treasury = operator (auto-signs)
    .setAdminKey(adminKey.publicKey)
    .setSupplyKey(supplyKey.publicKey)
    .setFreezeKey(freezeKey.publicKey)
    .setPauseKey(pauseKey.publicKey)
    .setMetadataKey(metadataKey.publicKey)
    .setCustomFees([royalty])
    .freezeWith(client)
    .sign(adminKey);                   // admin key must sign; operator auto-signs as treasury + payer

  const receipt = await (await tx.execute(client)).getReceipt(client);
  const tokenId = receipt.tokenId.toString();
  client.close();

  return {
    tokenId,
    keys: {
      admin: adminKey.toStringDer(),
      supply: supplyKey.toStringDer(),
      freeze: freezeKey.toStringDer(),
      pause: pauseKey.toStringDer(),
      metadata: metadataKey.toStringDer(),
    },
  };
}

// const {
//   AccountId,
//   PrivateKey,
//   Client,
//   Hbar,
//   TokenCreateTransaction,
//   TokenType,
//   TokenSupplyType,
//   CustomRoyaltyFee,
//   CustomFixedFee,
// } = require("@hiero-ledger/sdk"); // v2.82.0

// async function main() {
//   let client;
//   try {
//     const MY_ACCOUNT_ID = AccountId.fromString(process.env.HEDERA_ACCOUNT_ID);
//     const MY_PRIVATE_KEY = PrivateKey.fromStringECDSA(process.env.HEDERA_PRIVATE_KEY);

//     client = Client.forTestnet();
//     client.setOperator(MY_ACCOUNT_ID, MY_PRIVATE_KEY);

//     // ---- Permanent keys: must be set NOW, can never be added later ----
//     const adminKey = PrivateKey.generateECDSA();
//     const supplyKey = PrivateKey.generateECDSA(); // required to mint tickets
//     const freezeKey = PrivateKey.generateECDSA(); // freeze used/stolen tickets
//     const pauseKey = PrivateKey.generateECDSA(); // pause all (match cancelled)
//     const metadataKey = PrivateKey.generateECDSA(); // update NFT metadata later

//     // ---- 10% royalty to the issuer on every resale, with anti-evasion fallback ----
//     const royalty = new CustomRoyaltyFee()
//       .setNumerator(10)
//       .setDenominator(100)
//       .setFeeCollectorAccountId(MY_ACCOUNT_ID)
//       .setFallbackFee(new CustomFixedFee().setHbarAmount(new Hbar(5)));

//     // ---- Create the NFT ticket collection ----
//     const txTokenCreate = await new TokenCreateTransaction()
//       .setTokenName("WorldCup Ticket")
//       .setTokenSymbol("WCT")
//       .setTokenType(TokenType.NonFungibleUnique)  // NFT, not fungible
//       .setSupplyType(TokenSupplyType.Finite)
//       .setMaxSupply(10000)
//       .setInitialSupply(0)                         // must be 0 for NFTs
//       .setTreasuryAccountId(MY_ACCOUNT_ID)
//       .setAdminKey(adminKey.publicKey)
//       .setSupplyKey(supplyKey.publicKey)
//       .setFreezeKey(freezeKey.publicKey)
//       .setPauseKey(pauseKey.publicKey)
//       .setMetadataKey(metadataKey.publicKey)
//       .setCustomFees([royalty])
//       .freezeWith(client);

//     // operator signs automatically as treasury + payer; admin key must also sign
//     const signed = await txTokenCreate.sign(adminKey);
//     const txResponse = await signed.execute(client);
//     const receipt = await txResponse.getReceipt(client);

//     const tokenId = receipt.tokenId;
//     const txId = txResponse.transactionId.toString();

//     console.log("--------------------------- Token Creation ---------------------------");
//     console.log("Receipt status :", receipt.status.toString());
//     console.log("Token ID       :", tokenId.toString());
//     console.log("Transaction ID :", txId);
//     console.log("Hashscan URL   :", "https://hashscan.io/testnet/token/" + tokenId.toString());

//     console.log("------------------------- SAVE THESE KEYS ----------------------------");
//     console.log("(You need the supply key to mint tickets next — copy all of these.)");
//     console.log("supplyKey   :", supplyKey.toStringDer());
//     console.log("freezeKey   :", freezeKey.toStringDer());
//     console.log("pauseKey    :", pauseKey.toStringDer());
//     console.log("metadataKey :", metadataKey.toStringDer());
//     console.log("adminKey    :", adminKey.toStringDer());
//   } catch (error) {
//     console.error(error);
//   } finally {
//     if (client) client.close();
//   }
// }

// main();