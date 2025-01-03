/* eslint-disable no-console */

/**
 * This example shows how to use the Endless client to create accounts, fund them, and transfer between them.
 * Similar to ./simple_transfer.ts, but uses transferCoinTransaction to generate the transaction.
 */

import { Account, AccountAddress, Endless, EndlessConfig, Ed25519PrivateKey, Network } from "../../dist/common/index";

const TRANSFER_AMOUNT = 1000000;

// Setup the client
const config = new EndlessConfig({
  network: Network.TESTNET,
  fullnode: "https://rpc-test.endless.link/v1",
  indexer: "https://idx-test.endless.link/v1",
});
const endless = new Endless(config);

const example = async () => {
  console.log(
    "This example will create two accounts (Alice and Bob), fund Alice, and transfer between them using transferCoinTransaction.",
  );

  // Create two accounts
  const alice = Account.generate();
  const bob = Account.generate();

  console.log("=== Addresses ===\n");
  console.log(`Alice's address is: ${alice.accountAddress}`);
  console.log(`Bob's address is: ${bob.accountAddress}`);

  // Fund the accounts
  console.log("\n=== Funding Alice ===\n");

  // Fund alice account
  const fund_tx = await endless.fundAccount({ signer: alice });
  await endless.waitForTransaction({ transactionHash: fund_tx.hash });

  // Show the balances
  console.log("\n=== Initial Balances ===\n");
  const ALICE_INITIAL_BALANCE = await endless.viewEDSBalance(alice.accountAddress);
  const BOB_INITIAL_BALANCE = await endless.viewEDSBalance(bob.accountAddress);
  console.log(`Alice's balance is: ${ALICE_INITIAL_BALANCE}`);
  console.log(`Bob's balance is: ${BOB_INITIAL_BALANCE}`);

  // Transfer between users
  console.log(`\n=== Transfer ${TRANSFER_AMOUNT} from Alice to Bob ===\n`);
  const transaction = await endless.transferEDS({
    sender: alice,
    recipient: bob.accountAddress,
    amount: Number(TRANSFER_AMOUNT),
  });
  const pendingTxn = await endless.signAndSubmitTransaction({ signer: alice, transaction });
  const response = await endless.waitForTransaction({ transactionHash: pendingTxn.hash });
  console.log(`Committed transaction: ${response.hash}`);

  console.log("\n=== Balances after transfer ===\n");
  const newAliceBalance = await endless.viewEDSBalance(alice.accountAddress);
  const newBobBalance = await endless.viewEDSBalance(bob.accountAddress);
  console.log(`Alice's balance is: ${newAliceBalance}`);
  console.log(`Bob's balance is: ${newBobBalance}`);

  // Bob should have the transfer amount
  if (newBobBalance !== BigInt(TRANSFER_AMOUNT) + BOB_INITIAL_BALANCE)
    throw new Error("Bob's balance after transfer is incorrect");

  // Alice should have the remainder minus gas
  if (newAliceBalance >= ALICE_INITIAL_BALANCE - BigInt(TRANSFER_AMOUNT))
    throw new Error("Alice's balance after transfer is incorrect");
};

example();
