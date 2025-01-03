/* eslint-disable no-console */
/* eslint-disable max-len */

import { a } from "../../dist/common/accountAddress-BmYmU_u5";
import {
    Account,
    AccountAddress,
    AnyNumber,
    InputViewFunctionData,
    Network, Endless, EndlessConfig,
    Ed25519Account
} from "../../dist/common/index";

import { execSync } from 'child_process';

/**
 * This example demonstrate how one can compile, deploy, and mint its own fungible asset (FA)
 * It uses the fa_coin.move module that can be found in the move folder
 *
 * Before running this example, we should compile the package locally:
 * 1. Acquire the Endless CLI
 * 2. cd `~/endless-ts-sdk/examples/typescript`
 * 3. Run `pnpm run your_fungible_asset`
 */

// Set up the client
const config = new EndlessConfig({
    network: Network.TESTNET,
    fullnode: "https://rpc-test.endless.link/v1",
    indexer: "https://idx-test.endless.link/api/v1",
});

const endless = new Endless(config);

/** Admin create coin */
async function createCoin(admin: Ed25519Account): Promise<void> {
    const COIN_NAME = "FACoin";
    const COIN_SYM = "FA";
    const DECIMAL = 8;
    const MAX_SUPPLY = 0;
    const command = `endless coin create ${COIN_NAME} ${COIN_SYM}  ${DECIMAL} ${MAX_SUPPLY} "" "" --url https://rpc-test.endless.link --sender-account ${admin.accountAddress.toString()} --private-key ${admin.privateKey.toString()} --assume-yes`;
    const output = execSync(command, { encoding: 'utf8', maxBuffer: 1024 * 1024 * 10 });
    // console.log(output);
}

/** Admin mint the newly created coins to the specified receiver address */
async function mintCoin(coinAddr: string, admin: Ed25519Account, receiver: AccountAddress, amount: AnyNumber): Promise<void> {
    const command = `endless coin mint ${coinAddr} ${receiver} ${amount} --url https://rpc-test.endless.link --sender-account ${admin.accountAddress.toString()} --private-key ${admin.privateKey.toString()} --assume-yes`;
    const output = execSync(command, { encoding: 'utf8', maxBuffer: 1024 * 1024 * 10 });
}

/** Admin burns amount of owned coins */
async function burnCoin(coinAddr: string, admin: Ed25519Account, amount: AnyNumber): Promise<void> {
    const command = `endless coin burn ${coinAddr} ${amount} --url https://rpc-test.endless.link --sender-account ${admin.accountAddress.toString()} --private-key ${admin.privateKey.toString()} --assume-yes`;
    const output = execSync(command, { encoding: 'utf8', maxBuffer: 1024 * 1024 * 10 });
}

/** Admin freezes the primary fungible store of the specified account */
async function freeze(coinAddr: string, admin: Ed25519Account, account: AccountAddress): Promise<void> {
    const command = `endless coin freeze-account ${coinAddr} ${account} --url https://rpc-test.endless.link --sender-account ${admin.accountAddress.toString()} --private-key ${admin.privateKey.toString()} --assume-yes`;
    const output = execSync(command, { encoding: 'utf8', maxBuffer: 1024 * 1024 * 10 });
}

/** Admin unfreezes the primary fungible store of the specified account */
async function unfreeze(coinAddr: string, admin: Ed25519Account, account: AccountAddress): Promise<void> {
    const command = `endless coin unfreeze-account ${coinAddr} ${account} --url https://rpc-test.endless.link --sender-account ${admin.accountAddress.toString()} --private-key ${admin.privateKey.toString()} --assume-yes`;
    const output = execSync(command, { encoding: 'utf8', maxBuffer: 1024 * 1024 * 10 });
}

const getFaBalance = async (account: Account, fungibleAssetMetadataAddress: string): Promise<bigint> => {
    return await endless.viewCoinBalance(account.accountAddress, AccountAddress.fromBs58String(fungibleAssetMetadataAddress));
};

/** Return the address of the managed fungible asset that's created */
async function getMetadata(admin: Account): Promise<string> {
    const coinMeta = await endless.getCoinsDataCreatedBy(admin);
    const metadataAddress = coinMeta?.data[0].id;
    console.log("FA coin metadata address:", metadataAddress);
    return metadataAddress;
}

async function main() {
    const alice = Account.generate();
    const bob = Account.generate();

    console.log("\n=== Addresses ===");
    console.log(`Alice: ${alice.accountAddress.toString()}`);
    console.log(`Bob: ${bob.accountAddress.toString()}`);

    await endless.fundAccount({ signer: alice });
    await endless.fundAccount({ signer: bob });

    console.log("Alice create FACoin");
    createCoin(alice);
    const metadataAddress = await getMetadata(alice);

    console.log("All the balances in this example refer to balance in primary fungible stores of each account.");
    console.log(`Alice's initial FACoin balance: ${await getFaBalance(alice, metadataAddress)}.`);
    console.log(`Bob's initial FACoin balance: ${await getFaBalance(bob, metadataAddress)}.`);

    console.log("Alice mints Bob 100 coins.");
    await mintCoin(metadataAddress, alice, bob.accountAddress, 100);
    console.log(
        `Bob's updated FACoin primary fungible store balance: ${await getFaBalance(bob, metadataAddress)}.`,
    );

    console.log("Alice freezes Bob's account.");
    await freeze(metadataAddress, alice, bob.accountAddress);

    console.log("Alice unfreezes Bob's account.");
    const unfreezeTransactionHash = await unfreeze(metadataAddress, alice, bob.accountAddress);

    console.log("Alice mints herself 100 coins.");
    await mintCoin(metadataAddress, alice, alice.accountAddress, 100);

    console.log("Alice burns 50 coins from herself.");
    await burnCoin(metadataAddress, alice, 50);
    console.log(`Alice's updated FACoin balance: ${await getFaBalance(alice, metadataAddress)}.`);

    /// Normal fungible asset transfer between primary stores
    console.log("Bob transfers 10 coins to Alice.");
    const transferFungibleAssetRawTransaction = await endless.transferFungibleAsset({
        sender: bob,
        fungibleAssetMetadataAddress: AccountAddress.fromBs58String(metadataAddress),
        recipient: alice.accountAddress,
        amount: 10,
    });
    const transferFungibleAssetTransaction = await endless.signAndSubmitTransaction({
        signer: bob,
        transaction: transferFungibleAssetRawTransaction,
    });
    await endless.waitForTransaction({ transactionHash: transferFungibleAssetTransaction.hash });

    console.log(`Alice's updated FACoin balance: ${await getFaBalance(alice, metadataAddress)}.`);
    console.log(`Bob's updated FACoin balance: ${await getFaBalance(bob, metadataAddress)}.`);
    console.log("done.");
}

main();