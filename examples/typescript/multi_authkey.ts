/* eslint-disable no-console */
import { Account, AccountAddress, Endless, EndlessConfig, MultiAuthKeyAccount, Network, U128, U64 } from "../../dist/common/index";

/*
 * This example show how to use multi-authkey feature
  * 1. Create 3 accounts: Alice, Bob, Charlie
  * 2. Add Bob's and Charlie's authkey into Alice's authkey list, ans set threshold to 3
  * 3. Transfer EDS from Alice to Bob and Charlie, signed by Alice, Bob, and Charlie, will success
  * 4. Transfer EDS from Alice to Bob and Charlie, signed individually by Alice, Bob, Chad, 
  *    then collect signatures and build transaction,  will success
*/
async function main() {
  const config = new EndlessConfig({ network: Network.TESTNET });
  const endless = new Endless(config);
  const alice = Account.generate();
  const bob = Account.generate();
  const charlie = Account.generate();

  /// Create 3 accounts: Alice, Bob, Charlie and fund them
  let pending = await endless.fundAccount({ signer: alice })
  let tx = await endless.waitForTransaction({ transactionHash: pending.hash })
  console.log(`Fund alice: version ${tx.version}`)

  pending = await endless.fundAccount({ signer: bob })
  tx = await endless.waitForTransaction({ transactionHash: pending.hash })
  console.log(`Fund bob: version ${tx.version}`)

  pending = await endless.fundAccount({ signer: charlie })
  tx = await endless.waitForTransaction({ transactionHash: pending.hash })
  console.log(`Fund charlie: version ${tx.version}`)

  /// Add Bob's and Charlie's authkey into Alice's authkey list, ans set threshold to 3
  const txn = await endless.transaction.build.multiAgent({
    sender: alice.accountAddress,
    data: {
      function: "0x1::account::batch_add_authentication_key",
      functionArguments: [new U64(3)]
    },
    options: {
      expireTimestamp: 1727665208596
    },
    secondarySignerAddresses: [bob.accountAddress, charlie.accountAddress],
  })
  const aliceAuth = alice.signTransactionWithAuthenticator(txn)
  const bobAuth = bob.signTransactionWithAuthenticator(txn)
  const charlieAuth = charlie.signTransactionWithAuthenticator(txn)
  pending = await endless.transaction.submit.multiAgent({
    transaction: txn,
    senderAuthenticator: aliceAuth,
    additionalSignersAuthenticators: [bobAuth, charlieAuth],
  })
  tx = await endless.waitForTransaction({ transactionHash: pending.hash })
  console.log(`Update auth key: version ${tx.version}`)

  const aliceResource = await endless.getAccountResource({
    accountAddress: alice.accountAddress,
    resourceType: "0x1::account::Account",
  })
  console.log(`alice resource: ${JSON.stringify(aliceResource, null, 2)}`)

  /// Transfer EDS from Alice to Bob and Charlie, signed by Alice, Bob, and Charlie, will success
  let transferTxn = await endless.transaction.build.simple({
    sender: alice.accountAddress,
    data: {
      function: "0x1::endless_coin::transfer",
      functionArguments: [AccountAddress.ONE, new U128(100)]
    },
  })
  const multiAuthKeyAccount = new MultiAuthKeyAccount({ sender: alice.accountAddress, signers: [alice, bob, charlie] })
  pending = await endless.signAndSubmitTransaction({ transaction: transferTxn, signer: multiAuthKeyAccount })
  console.log(`Transfer with MultiAuthKeyAccount, tx: `, pending)
  tx = await endless.waitForTransaction({ transactionHash: pending.hash })
  console.log(`Transfer with MultiAuthKeyAccount, version: ${tx.version}`)

  /// Sign individually, then collect signatures
  transferTxn = await endless.transaction.build.simple({
    sender: alice.accountAddress,
    data: {
      function: "0x1::endless_coin::transfer",
      functionArguments: [AccountAddress.ONE, new U128(100)]
    },
  })
  const aliceSignature = alice.signTransaction(transferTxn)
  const bobSignature = bob.signTransaction(transferTxn)
  const charlieSignature = charlie.signTransaction(transferTxn)
  pending = await endless.transaction.submit.multiAuthKey({
    transaction: transferTxn,
    publicKeys: [alice.publicKey, bob.publicKey, charlie.publicKey],
    signatures: [aliceSignature, bobSignature, charlieSignature]
  })
  console.log(`Signed individually and collect signatures, tx:`, pending)
  tx = await endless.waitForTransaction({ transactionHash: pending.hash })
  console.log(`Signed individually and collect signatures: version: ${tx.version}`)
}

main()
