/* eslint-disable no-console */
const {
  Account, AccountAddress, Endless, EndlessConfig, getPaymentChecksum, Network, U128,
} = require('../../dist/common/index');

async function main() {
  const config = new EndlessConfig({ network: Network.CUSTOM, fullnode: "http://18.163.197.60:8080/v1" });
  const endless = new Endless(config);
  const alice = Account.generate();

  const pending = await endless.fundAccount({ signer: alice })
  const tx = await endless.waitForTransaction({ transactionHash: pending.hash })
  console.log(`Fund alice: version ${tx.version}`)

  const txn = await endless.transaction.build.simple({
    sender: alice.accountAddress,
    data: {
      function: "0x1::endless_coin::transfer",
      functionArguments: [AccountAddress.from("0xcafe"), new U128(100)]
    },
  })

  const simulateResult = await endless.transaction.simulate.simple({
    signerPublicKey: alice.publicKey,
    transaction: txn,
  })

  if (!simulateResult[0].success) {
    throw new Error(simulateResult[0].vm_status)
  }

  const paymentChecksum = getPaymentChecksum(simulateResult[0])
  // paymentChecksum[0] += 1;
  txn.upgradeToSafe(paymentChecksum)

  const signature = alice.signTransactionWithAuthenticator(txn);
  const resp = await endless.transaction.submit.simple({
    transaction: txn,
    senderAuthenticator: signature,
  })
  const result = await endless.waitForTransaction({ transactionHash: resp.hash })
  console.log(result.vm_status)
}

main()
