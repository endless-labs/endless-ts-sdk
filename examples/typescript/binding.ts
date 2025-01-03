/* eslint-disable no-console */
import { Account, AccountAddress, Endless, EndlessConfig, MoveVector, MultiAuthKeyAccount, Network, U8 } from "../../dist/common/index";
import bs58 from 'bs58'

/*
 * This example show how to use multi-authkey feature
  * 1. Create 3 accounts: Alice, Bob, Chad
  * 2. Add Bob's authkey into Alice's authkey list
  * 3. Transfer EDS from Alice to Chad, signed by Bob
  * 4. Remove Bob's authkey from Alice's authkey list
  * 5. Batch add Bob&Chad authkey into Alice's authkey list, set Threshold to 2
  * 6. Transfer EDS from Alice to Chad, signed by Alice and Bob
  * 7. Transfer EDS from Alice to Chad, signed by Bob only, will fail
  * 8. Transfer Alice to Chad, siged by Alice and Bob, will success
  *
*/
async function main() {
  const config = new EndlessConfig({
    network: Network.TESTNET,
    fullnode: "https://rpc-test.endless.link/v1",
    indexer: "https://idx-test.endless.link/v1",
  });

  const endless = new Endless(config);

  const alice = Account.generate();
  const bob = Account.generate();
  const chad = Account.generate();

  let pending = await endless.fundAccount({ signer: alice })
  let tx_response = await endless.waitForTransaction({ transactionHash: pending.hash })
  console.log(`Fund alice: version ${tx_response.version}`)

  pending = await endless.fundAccount({ signer: bob })
  tx_response = await endless.waitForTransaction({ transactionHash: pending.hash })
  console.log(`Fund bob: version ${tx_response.version}`)

  pending = await endless.fundAccount({ signer: chad })
  tx_response = await endless.waitForTransaction({ transactionHash: pending.hash })
  console.log(`Fund chad: version ${tx_response.version}`)

  console.log("\n=== Account addresses ===")
  console.log(`Alice: ${alice.accountAddress}`)
  console.log(`Bob:   ${bob.accountAddress}`)
  console.log(`Chad:  ${chad.accountAddress}`)

  console.log("\n=== Authentication keys ===")
  process.stdout.write(`Alice: `)
  await printAuths(alice.accountAddress, endless)
  process.stdout.write(`Bob:   `)
  await printAuths(bob.accountAddress, endless)
  process.stdout.write(`Chad:  `)
  await printAuths(chad.accountAddress, endless)

  /// add Bob's authkey into Alice authkey list
  let txn = await endless.transaction.build.multiAgent({
    sender: alice.accountAddress,
    data: {
      function: "0x1::account::add_authentication_key",
      functionArguments: []
    },
    secondarySignerAddresses: [bob.accountAddress],
  })

  let aliceAuth = alice.signTransactionWithAuthenticator(txn)
  let bobAuth = bob.signTransactionWithAuthenticator(txn)
  pending = await endless.transaction.submit.multiAgent({
    transaction: txn,
    senderAuthenticator: aliceAuth,
    additionalSignersAuthenticators: [bobAuth],
  })
  tx_response = await endless.waitForTransaction({ transactionHash: pending.hash })
  console.log(`\nAdd Bob's authkey into Alice authkey list: version ${tx_response.version}`)

  console.log("\nAlice authentication_key:")
  await printAuths(alice.accountAddress, endless)

  console.log("\nBob controlled accounts:");
  await printControlledAccounts(bob.accountAddress.toStringLong(), endless)

  /// transfer Alice to Chad, siged by Bob
  let transferEDSRawTransaction = await endless.transaction.build.simple({
    sender: alice.accountAddress,
    data: {
      function: "0x1::endless_account::transfer",
      functionArguments: [chad.accountAddress, 1000]
    },
  })
  let multiAuthKeyAccount = new MultiAuthKeyAccount({ sender: alice.accountAddress, signers: [bob] })
  pending = await endless.signAndSubmitTransaction({
    transaction: transferEDSRawTransaction,
    signer: multiAuthKeyAccount,
  })
  tx_response = await endless.waitForTransaction({ transactionHash: pending.hash })
  console.log(`\ntransfer EDS from Alice to Chad with Bob auth: version ${tx_response.version}`)

  /// remove Bob's authkey from Alice authkey list
  txn = await endless.transaction.build.simple({
    sender: alice.accountAddress,
    data: {
      function: "0x1::account::remove_authentication_key",
      functionArguments: [bob.accountAddress.data]
    },
  })
  aliceAuth = alice.signTransactionWithAuthenticator(txn)
  pending = await endless.transaction.submit.simple({
    transaction: txn,
    senderAuthenticator: aliceAuth,
  })
  tx_response = await endless.waitForTransaction({ transactionHash: pending.hash })
  console.log(`\nRemove Bob from Alice's auth key : version ${tx_response.version}`)

  console.log("\nAlice authentication_key:")
  await printAuths(alice.accountAddress, endless)

  console.log("\nBob controlled accounts:");
  await printControlledAccounts(bob.accountAddress.toStringLong(), endless)

  /// batch add Bob&Chad authkey into Alice authkey list, set Threshold to 2
  txn = await endless.transaction.build.multiAgent({
    sender: alice.accountAddress,
    data: {
      function: "0x1::account::batch_add_authentication_key",
      functionArguments: [2]
    },
    secondarySignerAddresses: [bob.accountAddress, chad.accountAddress],
  })

  aliceAuth = alice.signTransactionWithAuthenticator(txn)
  bobAuth = bob.signTransactionWithAuthenticator(txn)
  let chadAuth = chad.signTransactionWithAuthenticator(txn)
  pending = await endless.transaction.submit.multiAgent({
    transaction: txn,
    senderAuthenticator: aliceAuth,
    additionalSignersAuthenticators: [bobAuth, chadAuth],
  })
  tx_response = await endless.waitForTransaction({ transactionHash: pending.hash })
  console.log(`\nBatch Add auth key, set "AuthThreadhold" to 2: version ${tx_response.version}`)

  // try to transfer Alice to Chad, only siged by Bob
  // transfer will fail
  transferEDSRawTransaction = await endless.transaction.build.simple({
    sender: alice.accountAddress,
    data: {
      function: "0x1::endless_account::transfer",
      functionArguments: [chad.accountAddress, 1000]
    },
  })

  multiAuthKeyAccount = new MultiAuthKeyAccount({ sender: alice.accountAddress, signers: [bob] })
  try {
    pending = await endless.signAndSubmitTransaction({
      transaction: transferEDSRawTransaction,
      signer: multiAuthKeyAccount,
    })
    await endless.waitForTransaction({ transactionHash: pending.hash });
  } catch (error) {
    console.log("\nFailed to transfer EDS from Alice to Chad with only by Bob auth, cause `Auth Threshold` is 2")
  }

  // transfer Alice to Chad, siged by Alice and Bob
  multiAuthKeyAccount = new MultiAuthKeyAccount({ sender: alice.accountAddress, signers: [bob, alice] })
  pending = await endless.signAndSubmitTransaction({
    transaction: transferEDSRawTransaction,
    signer: multiAuthKeyAccount,
  })
  tx_response = await endless.waitForTransaction({ transactionHash: pending.hash })
  console.log(`\ntransfer EDS from Alice to Chad with Alice and Bob auth, version ${tx_response.version}`)
}

async function printAuths(accAddress: AccountAddress, endless: Endless) {
  let resource = await endless.getAccountResource({
    accountAddress: accAddress,
    resourceType: "0x1::account::Account",
  })
  for (const [key, value] of Object.entries(resource)) {
    if (key == "authentication_key") {
      // console.log(`${value}`);
      let v = value as string[];
      console.log(`${v.join(',\n')}`)
    }
  }
}

async function printControlledAccounts(controllerAddr: string, endless: Endless) {
  try {
    let controlledAccounts: Array<string> = await endless.getTableItem({
      handle: "0x902e91c0401f85ecbf06f22313e61ce76fcede4059a8f9c8b809c477849b2fc9",
      data: {
        key_type: "vector<u8>",
        value_type: "vector<address>",
        key: controllerAddr
      }
    })
    for (const controlledAccount of controlledAccounts) {
      let addr = Array.from(bs58.decode(controlledAccount))
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('');
      console.log(`0x${addr}`);
    }
  } catch (error) {
    // Table Item not found by Table handle(0x902e91c0401f85ecbf06f22313e61ce76fcede4059a8f9c8b809c477849b2fc9)
    console.log("None")
  }
}

main()
