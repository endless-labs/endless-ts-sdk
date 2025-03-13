/* eslint-disable no-console */
import {
  Account, AccountAddress, Endless, EndlessConfig, getPaymentChecksum, MultiAuthKeyAccount, Network, U128, U64, UserTransactionResponse
} from "../../dist/common";

/*
 * This example show how to use multi-signature account feature
  * 1. Create 3 accounts: Alice, Bob, Charlie and fund them
  * 2. Create a multi-signature account with threshold 3, and add Alice, Bob, Charlie as signers
  * 3. Fund the multi-signature account
  * 4. Transfer EDS from multi-signature account to another account, signed by Alice, Bob, and Charlie, will success
*/
async function main() {
  const config = new EndlessConfig({ network: Network.LOCAL });
  const endless = new Endless(config);
  const alice = Account.generate();
  const bob = Account.generate();
  const charlie = Account.generate();

  let pending = await endless.fundAccount({ signer: alice })
  let tx = await endless.waitForTransaction({ transactionHash: pending.hash })
  console.log(`Fund alice: version ${tx.version}`)

  pending = await endless.fundAccount({ signer: bob })
  tx = await endless.waitForTransaction({ transactionHash: pending.hash })
  console.log(`Fund bob: version ${tx.version}`)

  pending = await endless.fundAccount({ signer: charlie })
  tx = await endless.waitForTransaction({ transactionHash: pending.hash })
  console.log(`Fund charlie: version ${tx.version}`)

  const txn = await endless.transaction.build.multiAgent({
    sender: alice.accountAddress,
    data: {
      function: "0x1::account::create_multisig_account",
      functionArguments: [new U64(3)]
    },
    secondarySignerAddresses: [alice.accountAddress, bob.accountAddress, charlie.accountAddress],
  })
  const aliceAuth = alice.signTransactionWithAuthenticator(txn)
  const bobAuth = bob.signTransactionWithAuthenticator(txn)
  const charlieAuth = charlie.signTransactionWithAuthenticator(txn)
  pending = await endless.transaction.submit.multiAgent({
    transaction: txn,
    senderAuthenticator: aliceAuth,
    additionalSignersAuthenticators: [aliceAuth, bobAuth, charlieAuth],
  })
  tx = await endless.waitForTransaction({ transactionHash: pending.hash })
  const multisigAddress = AccountAddress.from(
    (tx as UserTransactionResponse).events.find(e => e.type === "0x1::account::AddAuthenticationKey")?.data.account
  )
  console.log(`Create multisig account: version ${tx.version}, account: ${multisigAddress}`)

  const aliceResource = await endless.getAccountResource({
    accountAddress: multisigAddress,
    resourceType: "0x1::account::Account",
  })
  console.log(`multisig account resource: ${JSON.stringify(aliceResource, null, 2)}`)

  const fundTxn = await endless.transaction.build.simple({
    sender: multisigAddress,
    data: {
      function: "0x1::faucet::fund",
      functionArguments: [multisigAddress]
    },
  })
  const multiAuthKeyAccount = new MultiAuthKeyAccount({ sender: alice.accountAddress, signers: [alice, bob, charlie] })
  pending = await endless.signAndSubmitTransaction({ transaction: fundTxn, signer: multiAuthKeyAccount })
  tx = await endless.waitForTransaction({ transactionHash: pending.hash })
  console.log(`Fund with multi auth: version ${tx.version}`)

  // Sign individually, then collect signatures
  const transferTxn = await endless.transaction.build.simple({
    sender: multisigAddress,
    data: {
      function: "0x1::endless_coin::transfer",
      functionArguments: [AccountAddress.ONE, new U128(100)]
    },
  })
  const transferSimulationResp = await endless.transaction.simulate.mock({
    transaction: transferTxn,
  })
  if (!transferSimulationResp[0].success) {
    throw new Error(transferSimulationResp[0].vm_status)
  }
  const paymentChecksum = getPaymentChecksum(transferSimulationResp[0])
  transferTxn.upgradeToSafe(paymentChecksum)
  const aliceSignature = alice.signTransaction(transferTxn)
  const bobSignature = bob.signTransaction(transferTxn)
  const charlieSignature = charlie.signTransaction(transferTxn)
  pending = await endless.transaction.submit.multiAuthKey({
    transaction: transferTxn,
    publicKeys: [alice.publicKey, bob.publicKey, charlie.publicKey],
    signatures: [aliceSignature, bobSignature, charlieSignature]
  })
  tx = await endless.waitForTransaction({ transactionHash: pending.hash })
  console.log(`Transfer with multi auth: version ${tx.version}`)
}

main()
