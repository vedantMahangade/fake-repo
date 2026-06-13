const {
  AccountId,
  PrivateKey,
  Client,
  TokenMintTransaction,
} = require("@hiero-ledger/sdk");

async function main() {
  let client;
  try {
    const MY_ACCOUNT_ID = AccountId.fromString(process.env.HEDERA_ACCOUNT_ID);
    const MY_PRIVATE_KEY = PrivateKey.fromStringECDSA(process.env.HEDERA_PRIVATE_KEY);

    client = Client.forTestnet();
    client.setOperator(MY_ACCOUNT_ID, MY_PRIVATE_KEY);

    const TOKEN_ID = "0.0.9219322";
    const SUPPLY_KEY = PrivateKey.fromStringDer(
      "3030020100300706052b8104000a04220420d6c82c644dbb83f8db4f7adfa14ad45297f2ba2a72c9f2567fd2654c11f7b1a2"
    );

    // NFT metadata: a SHORT pointer (<=100 bytes), not the full ticket data.
    // For now a placeholder URL; later this points to your ticket JSON.
    const metadata = Buffer.from("https://yourapp.com/api/tickets/1832.json");

    const txMint = await new TokenMintTransaction()
      .setTokenId(TOKEN_ID)
      .setMetadata([metadata])      // one entry = one ticket; array can mint several at once
      .freezeWith(client);

    const signed = await txMint.sign(SUPPLY_KEY);   // supply key authorizes minting
    const txResponse = await signed.execute(client);
    const receipt = await txResponse.getReceipt(client);

    const serial = receipt.serials[0].toString();

    console.log("------------------------------ Mint Ticket ------------------------------");
    console.log("Receipt status :", receipt.status.toString());
    console.log("Token ID       :", TOKEN_ID);
    console.log("Serial number  :", serial);
    console.log("Hashscan URL   :", `https://hashscan.io/testnet/token/${TOKEN_ID}/${serial}`);
  } catch (error) {
    console.error(error);
  } finally {
    if (client) client.close();
  }
}

main();