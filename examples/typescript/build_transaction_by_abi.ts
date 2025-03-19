import {
    Account, AccountAddress, Endless, EndlessConfig, Network, SimpleTransaction, generateRawTransaction,
    generateTransactionPayloadWithABI, EntryFunctionABI,
    TypeTagAddress,
    TypeTagU128,
    MoveAbility,
    parseTypeTag
} from "../../dist/common/index";

/*
 * This example show how to build transaction by ABI
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

    let pending = await endless.fundAccount({ signer: alice })
    let tx_response = await endless.waitForTransaction({ transactionHash: pending.hash })
    console.log(`Fund alice: version ${tx_response.version}`)

    // Alice transfer 100 EDS to Bob
    // Build transactuion by ABI, without TypeArgs
    {
        const functionName = "0x1::endless_account::transfer";
        const args = [bob.accountAddress, 100];
        const transferCoinAbi: EntryFunctionABI = {
            typeParameters: [],
            parameters: [new TypeTagAddress(), new TypeTagU128()],
        };

        const txn = await endless.transaction.build.simple({
            sender: alice.accountAddress,
            data: {
                function: functionName,
                functionArguments: args,
                abi: transferCoinAbi,
            }
        });
        const authenticator = endless.transaction.sign({ signer: alice, transaction: txn });
        const transactionReponse = await endless.transaction.submit.simple({
            senderAuthenticator: authenticator,
            transaction: txn,
        });
        const tx = (await endless.waitForTransaction({
            transactionHash: transactionReponse.hash,
        }))
        console.log(`transaction version: ${tx.version}`)
    }

    // Alice transfer 100 EDS to Bob
    // Build transactuion by ABI, with TypeArgs
    // Keypoints:
    // 1. transferCoinAbi.parameters
    // 2. in generateTransactionPayloadWithABI({....}), typeArguments is required and should be correct, refer from move contract
    {
        const functionName = "0x1::endless_account::transfer_coins";
        const typeArgs = ["0x1::object::Object"];
        const args = [bob.accountAddress, 100, AccountAddress.fromBs58String("ENDLESSsssssssssssssssssssssssssssssssssssss")];
        const transferCoinAbi: EntryFunctionABI = {
            typeParameters: [{ constraints: [MoveAbility.KEY] }],
            parameters: [new TypeTagAddress(), new TypeTagU128(), parseTypeTag("0x1::object::Object")],
        };

        const payload = await generateTransactionPayloadWithABI({
            function: functionName,
            typeArguments: ["0x1::fungible_asset::Metadata"],
            functionArguments: args,
            abi: transferCoinAbi,
        });

        const rawTransaction = await generateRawTransaction({
            endlessConfig: config,
            sender: alice.accountAddress,
            payload,
        });

        const transaction = new SimpleTransaction(rawTransaction);
        const authenticator = endless.transaction.sign({ signer: alice, transaction });
        const transactionReponse = await endless.transaction.submit.simple({
            senderAuthenticator: authenticator,
            transaction,
        });
        const tx = (await endless.waitForTransaction({
            transactionHash: transactionReponse.hash,
        }))
        console.log(`transaction version: ${tx.version}`)
    }
}

main()