/**
 * This file contains the underlying implementations for exposed submission API surface in
 * the {@link api/transaction}. By moving the methods out into a separate file,
 * other namespaces and processes can access these methods without depending on the entire
 * transaction namespace and without having a dependency cycle error.
 */

import { EndlessConfig } from "../api/endlessConfig";
import { MoveVector, U8 } from "../bcs";
import { postEndlessFullNode } from "../client";
import { Account, KeylessAccount, MultiKeyAccount } from "../account";
import { AccountAddress, AccountAddressInput } from "../core/accountAddress";
import { PrivateKey } from "../core/crypto";
import { AccountAuthenticator } from "../transactions/authenticator/account";
import { RotationProofChallenge } from "../transactions/instances/rotationProofChallenge";
import {
  buildTransaction,
  generateTransactionPayload,
  generateSignedTransactionForSimulation,
  generateSignedTransaction,
  generateMockSignedTransactionForSimulation,
} from "../transactions/transactionBuilder/transactionBuilder";
import {
  InputGenerateTransactionData,
  AnyRawTransaction,
  InputSimulateTransactionData,
  InputGenerateTransactionOptions,
  InputGenerateTransactionPayloadDataWithRemoteABI,
  InputSubmitTransactionData,
  InputGenerateMultiAgentRawTransactionData,
  InputGenerateSingleSignerRawTransactionData,
  AnyTransactionPayloadInstance,
  EntryFunctionABI,
  InputSimulateTransactionDataMock,
} from "../transactions/types";
import { getInfo } from "./account";
import { UserTransactionResponse, PendingTransactionResponse, MimeType, HexInput, TransactionResponse } from "../types";
import { TypeTagU8, TypeTagVector, generateSigningMessageForTransaction } from "../transactions";
import { SimpleTransaction } from "../transactions/instances/simpleTransaction";
import { MultiAgentTransaction } from "../transactions/instances/multiAgentTransaction";

/**
 * We are defining function signatures, each with its specific input and output.
 * These are the possible function signature for `generateTransaction` function.
 * When we call `generateTransaction` function with the relevant type properties,
 * Typescript can infer the return type based on the appropriate function overload.
 */
export async function generateTransaction(
  args: { endlessConfig: EndlessConfig } & InputGenerateSingleSignerRawTransactionData,
): Promise<SimpleTransaction>;
export async function generateTransaction(
  args: { endlessConfig: EndlessConfig } & InputGenerateMultiAgentRawTransactionData,
): Promise<MultiAgentTransaction>;
/**
 * Generates any transaction by passing in the required arguments
 *
 * @param args.sender The transaction sender's account address as a AccountAddressInput
 * @param args.data EntryFunctionData | ScriptData | MultiSigData
 * @param args.feePayerAddress optional. For a fee payer (aka sponsored) transaction
 * @param args.secondarySignerAddresses optional. For a multi-agent or fee payer (aka sponsored) transactions
 * @param args.options optional. GenerateTransactionOptions type
 *
 * @example
 * For a single signer entry function
 * move function name, move function type arguments, move function arguments
 * `
 * data: {
 *  function:"0x1::endless_account::transfer",
 *  typeArguments:[]
 *  functionArguments :[receiverAddress,10]
 * }
 * `
 *
 * @example
 * For a single signer script function
 * module bytecode, move function type arguments, move function arguments
 * ```
 * data: {
 *  bytecode:"0x001234567",
 *  typeArguments:[],
 *  functionArguments :[receiverAddress,10]
 * }
 * ```
 *
 * @return An instance of a RawTransaction, plus optional secondary/fee payer addresses
 * ```
 * {
 *  rawTransaction: RawTransaction,
 *  secondarySignerAddresses? : Array<AccountAddress>,
 *  feePayerAddress?: AccountAddress
 * }
 * ```
 */
export async function generateTransaction(
  args: { endlessConfig: EndlessConfig } & InputGenerateTransactionData,
): Promise<AnyRawTransaction> {
  const payload = await buildTransactionPayload(args);
  return buildRawTransaction(args, payload);
}

export async function buildTransactionPayload(
  args: { endlessConfig: EndlessConfig } & InputGenerateTransactionData,
): Promise<AnyTransactionPayloadInstance> {
  const { endlessConfig, data } = args;
  // Merge in endlessConfig for remote ABI on non-script payloads
  let generateTransactionPayloadData: InputGenerateTransactionPayloadDataWithRemoteABI;
  let payload: AnyTransactionPayloadInstance;

  if ("bytecode" in data) {
    // TODO: Add ABI checking later
    payload = await generateTransactionPayload(data);
  } else if ("multisigAddress" in data) {
    generateTransactionPayloadData = {
      endlessConfig,
      multisigAddress: data.multisigAddress,
      function: data.function,
      functionArguments: data.functionArguments,
      typeArguments: data.typeArguments,
      abi: data.abi,
    };
    payload = await generateTransactionPayload(generateTransactionPayloadData);
  } else {
    generateTransactionPayloadData = {
      endlessConfig,
      function: data.function,
      functionArguments: data.functionArguments,
      typeArguments: data.typeArguments,
      abi: data.abi,
    };
    payload = await generateTransactionPayload(generateTransactionPayloadData);
  }
  return payload;
}

export async function buildRawTransaction(
  args: { endlessConfig: EndlessConfig } & InputGenerateTransactionData,
  payload: AnyTransactionPayloadInstance,
): Promise<AnyRawTransaction> {
  const { endlessConfig, sender, options } = args;

  let feePayerAddress;
  if (isFeePayerTransactionInput(args)) {
    feePayerAddress = AccountAddress.ZERO.toString();
  }

  if (isMultiAgentTransactionInput(args)) {
    const { secondarySignerAddresses } = args;
    return buildTransaction({
      endlessConfig,
      sender,
      payload,
      options,
      secondarySignerAddresses,
      feePayerAddress,
    });
  }

  return buildTransaction({
    endlessConfig,
    sender,
    payload,
    options,
    feePayerAddress,
  });
}

function isFeePayerTransactionInput(data: InputGenerateTransactionData): boolean {
  return data.withFeePayer === true;
}

function isMultiAgentTransactionInput(
  data: InputGenerateTransactionData,
): data is InputGenerateMultiAgentRawTransactionData {
  return "secondarySignerAddresses" in data;
}

/**
 * Builds a signing message that can be signed by external signers
 *
 * Note: Please prefer using `signTransaction` unless signing outside the SDK
 *
 * @param args.transaction AnyRawTransaction, as generated by `generateTransaction()`
 *
 * @return The message to be signed
 */
export function getSigningMessage(args: { transaction: AnyRawTransaction }): Uint8Array {
  const { transaction } = args;
  return generateSigningMessageForTransaction(transaction);
}

/**
 * Sign a transaction that can later be submitted to chain
 *
 * @param args.signer The signer account to sign the transaction
 * @param args.transaction An instance of a RawTransaction, plus optional secondary/fee payer addresses
 * ```
 * {
 *  rawTransaction: RawTransaction,
 *  secondarySignerAddresses? : Array<AccountAddress>,
 *  feePayerAddress?: AccountAddress
 * }
 * ```
 *
 * @return The signer AccountAuthenticator
 */
export function signTransaction(args: { signer: Account; transaction: AnyRawTransaction }): AccountAuthenticator {
  const { signer, transaction } = args;
  return signer.signTransactionWithAuthenticator(transaction);
}

/**
 * Simulates a transaction before singing it.
 *
 * @param args.signerPublicKey The signer public key
 * @param args.transaction The raw transaction to simulate
 * @param args.secondarySignersPublicKeys optional. For when the transaction is a multi signers transaction
 * @param args.feePayerPublicKey optional. For when the transaction is a fee payer (aka sponsored) transaction
 * @param args.options optional. A config to simulate the transaction with
 */
export async function simulateTransaction(
  args: { endlessConfig: EndlessConfig } & InputSimulateTransactionData,
): Promise<Array<UserTransactionResponse>> {
  const { endlessConfig, transaction, signerPublicKey, secondarySignersPublicKeys, feePayerPublicKey, options } = args;

  const signedTransaction = generateSignedTransactionForSimulation({
    transaction,
    signerPublicKey,
    secondarySignersPublicKeys,
    feePayerPublicKey,
    options,
  });

  const { data } = await postEndlessFullNode<Uint8Array, Array<UserTransactionResponse>>({
    endlessConfig,
    body: signedTransaction,
    path: "transactions/simulate",
    params: {
      estimate_gas_unit_price: args.options?.estimateGasUnitPrice ?? false,
      estimate_max_gas_amount: args.options?.estimateMaxGasAmount ?? false,
      estimate_prioritized_gas_unit_price: args.options?.estimatePrioritizedGasUnitPrice ?? false,
    },
    originMethod: "simulateTransaction",
    contentType: MimeType.BCS_SIGNED_TRANSACTION,
  });
  return data;
}

/**
 * Simulates a transaction before singing it.
 *
 * @param args.signer The signer authentication key
 * @param args.transaction The raw transaction to simulate
 * @param args.secondarySigners optional. For when the transaction is a multi signers transaction
 * @param args.feePayer optional. For when the transaction is a fee payer (aka sponsored) transaction
 * @param args.options optional. A config to simulate the transaction with
 */
export async function mockTransaction(
  args: { endlessConfig: EndlessConfig } & InputSimulateTransactionDataMock,
): Promise<Array<UserTransactionResponse>> {
  const { endlessConfig, transaction } = args;

  const signedTransaction = generateMockSignedTransactionForSimulation(transaction);

  const { data } = await postEndlessFullNode<Uint8Array, Array<UserTransactionResponse>>({
    endlessConfig,
    body: signedTransaction,
    path: "transactions/simulate",
    params: {
      estimate_gas_unit_price: args.options?.estimateGasUnitPrice ?? false,
      estimate_max_gas_amount: args.options?.estimateMaxGasAmount ?? false,
      estimate_prioritized_gas_unit_price: args.options?.estimatePrioritizedGasUnitPrice ?? false,
    },
    originMethod: "simulateTransaction",
    contentType: MimeType.BCS_SIGNED_TRANSACTION,
  });
  return data;
}

/**
 * Submit transaction to chain
 *
 * @param args.transaction A endless transaction type
 * @param args.senderAuthenticator The account authenticator of the transaction sender
 * @param args.secondarySignerAuthenticators optional. For when the transaction is a multi signers transaction
 *
 * @return PendingTransactionResponse
 */
export async function submitTransaction(
  args: {
    endlessConfig: EndlessConfig;
  } & InputSubmitTransactionData,
): Promise<PendingTransactionResponse> {
  const { endlessConfig } = args;
  const signedTransaction = generateSignedTransaction({ ...args });
  const { data } = await postEndlessFullNode<Uint8Array, PendingTransactionResponse>({
    endlessConfig,
    body: signedTransaction,
    path: "transactions",
    originMethod: "submitTransaction",
    contentType: MimeType.BCS_SIGNED_TRANSACTION,
  });
  return data;
}

export async function signAndSubmitTransaction(args: {
  endlessConfig: EndlessConfig;
  signer: Account;
  transaction: AnyRawTransaction;
}): Promise<PendingTransactionResponse> {
  const { endlessConfig, signer, transaction } = args;

  if (signer instanceof KeylessAccount || signer instanceof MultiKeyAccount) {
    await signer.waitForProofFetch();
  }

  const authenticator = signTransaction({ signer, transaction });
  return submitTransaction({
    endlessConfig,
    transaction,
    senderAuthenticator: authenticator,
  });
}

const packagePublishAbi: EntryFunctionABI = {
  typeParameters: [],
  parameters: [TypeTagVector.u8(), new TypeTagVector(TypeTagVector.u8())],
};

export async function publicPackageTransaction(args: {
  endlessConfig: EndlessConfig;
  account: AccountAddressInput;
  metadataBytes: HexInput;
  moduleBytecode: Array<HexInput>;
  options?: InputGenerateTransactionOptions;
}): Promise<SimpleTransaction> {
  const { endlessConfig, account, metadataBytes, moduleBytecode, options } = args;

  const totalByteCode = moduleBytecode.map((bytecode) => MoveVector.U8(bytecode));

  return generateTransaction({
    endlessConfig,
    sender: AccountAddress.from(account),
    data: {
      function: "0x1::code::publish_package_txn",
      functionArguments: [MoveVector.U8(metadataBytes), new MoveVector(totalByteCode)],
      abi: packagePublishAbi,
    },
    options,
  });
}

const rotateAuthKeyAbi: EntryFunctionABI = {
  typeParameters: [],
  parameters: [
    new TypeTagU8(),
    TypeTagVector.u8(),
    new TypeTagU8(),
    TypeTagVector.u8(),
    TypeTagVector.u8(),
    TypeTagVector.u8(),
  ],
};

/**
 * TODO: Need to refactor and move this function out of transactionSubmission
 */
export async function rotateAuthKey(args: {
  endlessConfig: EndlessConfig;
  fromAccount: Account;
  toNewPrivateKey: PrivateKey;
}): Promise<TransactionResponse> {
  const { endlessConfig, fromAccount, toNewPrivateKey } = args;
  const accountInfo = await getInfo({
    endlessConfig,
    accountAddress: fromAccount.accountAddress,
  });

  const newAccount = Account.fromPrivateKey({ privateKey: toNewPrivateKey, legacy: true });

  const challenge = new RotationProofChallenge({
    sequenceNumber: BigInt(accountInfo.sequence_number),
    originator: fromAccount.accountAddress,
    currentAuthKey: AccountAddress.from(accountInfo.authentication_key),
    newPublicKey: newAccount.publicKey,
  });

  // Sign the challenge
  const challengeHex = challenge.bcsToBytes();
  const proofSignedByCurrentPrivateKey = fromAccount.sign(challengeHex);
  const proofSignedByNewPrivateKey = newAccount.sign(challengeHex);

  // Generate transaction
  const rawTxn = await generateTransaction({
    endlessConfig,
    sender: fromAccount.accountAddress,
    data: {
      function: "0x1::account::rotate_authentication_key",
      functionArguments: [
        new U8(fromAccount.signingScheme), // from scheme
        MoveVector.U8(fromAccount.publicKey.toUint8Array()),
        new U8(newAccount.signingScheme), // to scheme
        MoveVector.U8(newAccount.publicKey.toUint8Array()),
        MoveVector.U8(proofSignedByCurrentPrivateKey.toUint8Array()),
        MoveVector.U8(proofSignedByNewPrivateKey.toUint8Array()),
      ],
      abi: rotateAuthKeyAbi,
    },
  });
  return signAndSubmitTransaction({
    endlessConfig,
    signer: fromAccount,
    transaction: rawTxn,
  });
}
