# Typescript SDK for Endless

### Reference Docs
 1. For SDK documentation, check out the [TypeScript SDK documentation](https://docs.endless.link/endless/devbuild/build/endless-sdks/typescript-sdk/)
 2. For in-depth examples, check out the [examples](./examples) folder with ready-made `package.json` files to get you going quickly!


The Endless TypeScript SDK provides a convenient way to interact with the Endless blockchain using TypeScript. It offers a set of utility functions, classes, and types to simplify the integration process and enhance developer productivity.

This repository supports version >= 0.0.0 of the [Endless SDK npm package](https://www.npmjs.com/package/@endlesslab/endless-ts-sdk).

## Installation

##### For use in Node.js or a web application

Install with your favorite package manager such as npm, yarn, or pnpm:

```bash
pnpm install @endlesslab/endless-ts-sdk
```
## Usage

Initialize `Endless` to access the SDK API.

```ts
// initiate the main entry point into Endless SDK
const endless = new Endless();
```

If you want to pass in a custom config

```ts
// an optional config information for the SDK client instance.
const config = new EndlessConfig({ network: Network.LOCAL }); // default network is devnet
const endless = new Endless(config);
```

### Account management (default to Ed25519)

> Note: We introduce a Single Sender authentication. Generating an account defaults to Legacy Ed25519 authentication with the option to use the Single Sender unified authentication

#### Generate new keys

```ts
const account = Account.generate(); // defaults to Legacy Ed25519
```

#### Derive from private key

```ts
// Create a private key instance for Ed25519 scheme
const privateKey = new Ed25519PrivateKey("myEd25519privatekeystring");

// Derive an account from private key

// This is used as a local calculation and therefore is used to instantiate an `Account`
// that has not had its authentication key rotated
const account = await Account.fromPrivateKey({ privateKey });
```

#### Derive from private key and address

```ts
// Create a private key instance for Ed25519 scheme
const privateKey = new Ed25519PrivateKey("myEd25519privatekeystring");
```

#### Derive from path

```ts
const path = "m/44'/637'/0'/0'/1";
const mnemonic = "various float stumble...";
const account = Account.fromDerivationPath({ path, mnemonic });
```

### Submit transaction

---

#### Single Signer transaction

Using transaction submission api

```ts
const alice: Account = Account.generate();
const bobAddress = "0xb0b";
// build transaction
const transaction = await endless.transaction.build.simple({
  sender: alice.accountAddress,
  data: {
    function: "0x1::coin::transfer",
    typeArguments: ["0x1::endless_coin::EndlessCoin"],
    functionArguments: [bobAddress, 100],
  },
});

// using sign and submit separately
const senderAuthenticator = endless.transaction.sign({ signer: alice, transaction });
const committedTransaction = await endless.transaction.submit.simple({ transaction, senderAuthenticator });

// using signAndSubmit combined
const committedTransaction = await endless.signAndSubmitTransaction({ signer: alice, transaction });
```

Using built in `transferCoinTransaction`

```ts
const alice: Account = Account.generate();
const bobAddress = "0xb0b";
// build transaction
const transaction = await endless.transferCoinTransaction({
  sender: alice,
  recipient: bobAddress,
  amount: 100,
});

const pendingTransaction = await endless.signAndSubmitTransaction({ signer: alice, transaction });
```

## Troubleshooting

If you see import error when you do this

```typescript
import { Endless, EndlessConfig, Network } from "@endlesslab/endless-ts-sdk";
```

It could be your `tsconfig.json` is not incompatible, make sure your `moduleResolution` is set to `node` instead of `bundler`.
