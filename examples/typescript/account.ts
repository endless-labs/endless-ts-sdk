import { Account, AccountAddress, Endless, EndlessConfig, Ed25519PrivateKey, Network } from "../../dist/common/index";

const config = new EndlessConfig({
  network: Network.TESTNET,
  fullnode: "https://rpc-test.endless.link/v1",
  indexer: "https://idx-test.endless.link/v1",
});

const endless = new Endless(config);

async function main() {
  const alice = Account.generate();
  const bob = Account.generate();
  const metadataOfEDS = AccountAddress.from("ENDLESSsssssssssssssssssssssssssssssssssssss");
  console.log("metadataOfEDS", metadataOfEDS.toString());

  const privateKey = new Ed25519PrivateKey("0x50fecb404ac959427a4b82689fb45dbfbd725d3854c5c2d6f311495fe6df0b0f");

  const user = Account.fromPrivateKey({ privateKey });
  console.log(`User: ${user.accountAddress.toString()}`);

  console.log(`User: ${user.accountAddress.toBs58String()}`);

  console.log(`User balance: ${await endless.viewEDSBalance(user.accountAddress)}`);

  console.log(`Alice: ${alice.accountAddress.toString()}`);
  console.log(`Alice: ${alice.accountAddress.toBs58String()}`);
  console.log(`Bob: ${bob.accountAddress.toString()}`);

  await endless.fundAccount({
    signer: alice,
  });

  await endless.fundAccount({
    signer: bob,
  });

  console.log(`Alice balance: ${await endless.viewEDSBalance(alice.accountAddress)}`);
  console.log(`Bob balance: ${await endless.viewEDSBalance(bob.accountAddress)}`);

  const transferEDSRawTransaction = await endless.transferEDS({
    sender: alice,
    recipient: bob.accountAddress,
    amount: 6,
  });

  const [response] = await endless.transaction.simulate.simple({
    signerPublicKey: alice.publicKey,
    transaction: transferEDSRawTransaction,
    feePayerPublicKey: alice.publicKey,
  });
  console.log("response:", JSON.stringify(response));

  console.log(`transferEDS... `);
  const transferEDSTransaction = await endless.signAndSubmitTransaction({
    signer: alice,
    transaction: transferEDSRawTransaction,
  });

  await endless.waitForTransaction({ transactionHash: transferEDSTransaction.hash });

  console.log(`Alice balance: ${await endless.viewEDSBalance(alice.accountAddress)}`);
  console.log(`Bob balance: ${await endless.viewEDSBalance(bob.accountAddress)}`);

  // ################################ transferCoin ################################
  const transferCoinRawTransaction = await endless.transferCoin({
    sender: alice,
    fungibleAssetMetadataAddress: metadataOfEDS,
    recipient: bob.accountAddress,
    amount: 60,
  });

  console.log(`transferCoin... `);
  const transferCoinTransaction = await endless.signAndSubmitTransaction({
    signer: alice,
    transaction: transferCoinRawTransaction,
  });

  await endless.waitForTransaction({ transactionHash: transferCoinTransaction.hash });

  console.log(`Alice balance: ${await endless.viewCoinBalance(alice.accountAddress, metadataOfEDS)}`);
  console.log(`Bob balance: ${await endless.viewCoinBalance(bob.accountAddress, metadataOfEDS)}`);
}

main();
