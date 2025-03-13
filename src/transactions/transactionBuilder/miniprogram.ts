// Copyright © Endless
// Copyright © Aptos Foundation
// SPDX-License-Identifier: Apache-2.0

/**
 * This file handles the transaction creation lifecycle.
 * It holds different operations to generate a transaction payload, a raw transaction,
 * and a signed transaction that can be simulated, signed and submitted to chain.
 */
import { EndlessConfig } from "../../api/endlessConfig";
import { AccountAddress, AccountAddressInput, Hex } from "../../core";
import { getInfo } from "../../internal/account";
import { getLedgerInfo } from "../../internal/general";
import { getGasPriceEstimation } from "../../internal/transaction";
import { NetworkToChainId } from "../../utils/apiEndpoints";
import { DEFAULT_MAX_GAS_AMOUNT, DEFAULT_TXN_EXP_SEC_FROM_NOW } from "../../utils/const";
import {
  ChainId,
  EntryFunction,
  MultiSig,
  MultiSigTransactionPayload,
  RawTransaction,
  Script,
  TransactionPayloadEntryFunction,
  TransactionPayloadMultiSig,
  TransactionPayloadScript,
} from "../instances";
import {
  AnyRawTransaction,
  AnyTransactionPayloadInstance,
  EntryFunctionArgumentTypes,
  InputGenerateMultiAgentRawTransactionArgs,
  InputGenerateRawTransactionArgs,
  InputGenerateSingleSignerRawTransactionArgs,
  InputGenerateTransactionOptions,
  InputScriptData,
  InputMultiSigDataWithRemoteABI,
  InputEntryFunctionDataWithRemoteABI,
  InputGenerateTransactionPayloadDataWithRemoteABI,
  InputGenerateTransactionPayloadDataWithABI,
  InputEntryFunctionDataWithABI,
  InputMultiSigDataWithABI,
  FunctionABI,
} from "../types";
import { convertArgument, fetchEntryFunctionAbi, standardizeTypeTags } from "./remoteAbi";
import { memoizeAsync } from "../../utils/memoize";
import { getFunctionParts, isScriptDataInput } from "./helpers";
import { SimpleTransaction } from "../instances/simpleTransaction";
import { MultiAgentTransaction } from "../instances/multiAgentTransaction";

/**
 * We are defining function signatures, each with its specific input and output.
 * These are the possible function signature for our `generateTransactionPayload` function.
 * When we call our `generateTransactionPayload` function with the relevant type properties,
 * Typescript can infer the return type based on the appropriate function overload.
 */
export async function generateTransactionPayload(args: InputScriptData): Promise<TransactionPayloadScript>;
export async function generateTransactionPayload(
  args: InputEntryFunctionDataWithRemoteABI,
): Promise<TransactionPayloadEntryFunction>;
export async function generateTransactionPayload(
  args: InputMultiSigDataWithRemoteABI,
): Promise<TransactionPayloadMultiSig>;

/**
 * Builds a transaction payload based on the data argument and returns
 * a transaction payload - TransactionPayloadScript | TransactionPayloadMultiSig | TransactionPayloadEntryFunction
 *
 * This uses the RemoteABI by default, and the remote ABI can be skipped by using generateTransactionPayloadWithABI
 *
 * @param args.data GenerateTransactionPayloadData
 *
 * @return TransactionPayload
 */
export async function generateTransactionPayload(
  args: InputGenerateTransactionPayloadDataWithRemoteABI,
): Promise<AnyTransactionPayloadInstance> {
  if (isScriptDataInput(args)) {
    return generateTransactionPayloadScript(args);
  }
  const { moduleAddress, moduleName, functionName } = getFunctionParts(args.function);

  const functionAbi = await fetchAbi({
    key: "entry-function",
    moduleAddress,
    moduleName,
    functionName,
    endlessConfig: args.endlessConfig,
    abi: args.abi,
    fetch: fetchEntryFunctionAbi,
  });

  // Fill in the ABI
  return generateTransactionPayloadWithABI({ ...args, abi: functionAbi });
}

export function generateTransactionPayloadWithABI(args: InputEntryFunctionDataWithABI): TransactionPayloadEntryFunction;
export function generateTransactionPayloadWithABI(args: InputMultiSigDataWithABI): TransactionPayloadMultiSig;
export function generateTransactionPayloadWithABI(
  args: InputGenerateTransactionPayloadDataWithABI,
): AnyTransactionPayloadInstance {
  const functionAbi = args.abi;
  const { moduleAddress, moduleName, functionName } = getFunctionParts(args.function);

  // Ensure that all type arguments are typed properly
  const typeArguments = standardizeTypeTags(args.typeArguments);

  // Check the type argument count against the ABI
  if (typeArguments.length !== functionAbi.typeParameters.length) {
    throw new Error(
      `Type argument count mismatch, expected ${functionAbi.typeParameters.length}, received ${typeArguments.length}`,
    );
  }

  // Check all BCS types, and convert any non-BCS types
  const functionArguments: Array<EntryFunctionArgumentTypes> = args.functionArguments.map((arg, i) =>
    convertArgument(args.function, functionAbi, arg, i, typeArguments),
  );

  // Check that all arguments are accounted for
  if (functionArguments.length !== functionAbi.parameters.length) {
    throw new Error(
      // eslint-disable-next-line max-len
      `Too few arguments for '${moduleAddress}::${moduleName}::${functionName}', expected ${functionAbi.parameters.length} but got ${functionArguments.length}`,
    );
  }

  // Generate entry function payload
  const entryFunctionPayload = EntryFunction.build(
    `${moduleAddress}::${moduleName}`,
    functionName,
    typeArguments,
    functionArguments,
  );

  // Send it as multi sig if it's a multisig payload
  if ("multisigAddress" in args) {
    const multisigAddress = AccountAddress.from(args.multisigAddress);
    return new TransactionPayloadMultiSig(
      new MultiSig(multisigAddress, new MultiSigTransactionPayload(entryFunctionPayload)),
    );
  }

  // Otherwise send as an entry function
  return new TransactionPayloadEntryFunction(entryFunctionPayload);
}

function generateTransactionPayloadScript(args: InputScriptData) {
  return new TransactionPayloadScript(
    new Script(
      Hex.fromHexInput(args.bytecode).toUint8Array(),
      standardizeTypeTags(args.typeArguments),
      args.functionArguments,
    ),
  );
}

/**
 * Generates a raw transaction
 *
 * @param args.endlessConfig EndlessConfig
 * @param args.sender The transaction's sender account address as a hex input
 * @param args.payload The transaction payload - can create by using generateTransactionPayload()
 *
 * @returns RawTransaction
 */
export async function generateRawTransaction(args: {
  endlessConfig: EndlessConfig;
  sender: AccountAddressInput;
  payload: AnyTransactionPayloadInstance;
  options?: InputGenerateTransactionOptions;
  feePayerAddress?: AccountAddressInput;
}): Promise<RawTransaction> {
  const { endlessConfig, sender, payload, options, feePayerAddress } = args;

  const getChainId = async () => {
    if (NetworkToChainId[endlessConfig.network]) {
      return { chainId: NetworkToChainId[endlessConfig.network] };
    }
    const info = await getLedgerInfo({ endlessConfig });
    return { chainId: info.chain_id };
  };

  const getGasUnitPrice = async () => {
    if (options?.gasUnitPrice) {
      return { gasEstimate: options.gasUnitPrice };
    }
    const estimation = await getGasPriceEstimation({ endlessConfig });
    return { gasEstimate: estimation.gas_estimate };
  };

  const getSequenceNumberForAny = async () => {
    const getSequenceNumber = async () => {
      if (options?.accountSequenceNumber !== undefined) {
        return options.accountSequenceNumber;
      }

      try {
        return (await getInfo({ endlessConfig, accountAddress: sender })).sequence_number;
      } catch (error: any) {
        if ("status" in error && error.status === 404) {
          return 0;
        }
        throw error;
      }
    };

    /**
     * Check if is sponsored transaction to honor AIP-52
     * {@link https://github.com/endless-foundation/AIPs/blob/main/aips/aip-52.md}
     */
    if (feePayerAddress && AccountAddress.from(feePayerAddress).equals(AccountAddress.ZERO)) {
      // Handle sponsored transaction generation with the option that
      // the main signer has not been created on chain
      try {
        // Check if main signer has been created on chain, if not assign sequence number 0
        return await getSequenceNumber();
      } catch (e: any) {
        return 0;
      }
    } else {
      return getSequenceNumber();
    }
  };
  const [{ chainId }, { gasEstimate }, sequenceNumber] = await Promise.all([
    getChainId(),
    getGasUnitPrice(),
    getSequenceNumberForAny(),
  ]);

  const { maxGasAmount, gasUnitPrice, expireTimestamp } = {
    maxGasAmount: options?.maxGasAmount ? BigInt(options.maxGasAmount) : BigInt(DEFAULT_MAX_GAS_AMOUNT),
    gasUnitPrice: options?.gasUnitPrice ?? BigInt(gasEstimate),
    expireTimestamp: options?.expireTimestamp ?? BigInt(Math.floor(Date.now() / 1000) + DEFAULT_TXN_EXP_SEC_FROM_NOW),
  };

  return new RawTransaction(
    AccountAddress.from(sender),
    BigInt(sequenceNumber),
    payload,
    BigInt(maxGasAmount),
    BigInt(gasUnitPrice),
    BigInt(expireTimestamp),
    new ChainId(chainId),
  );
}

/**
 * We are defining function signatures, each with its specific input and output.
 * These are the possible function signature for our `generateTransaction` function.
 * When we call our `generateTransaction` function with the relevant type properties,
 * Typescript can infer the return type based on the appropriate function overload.
 */
export async function buildTransaction(args: InputGenerateSingleSignerRawTransactionArgs): Promise<SimpleTransaction>;
export async function buildTransaction(args: InputGenerateMultiAgentRawTransactionArgs): Promise<MultiAgentTransaction>;

/**
 * Generates a transaction based on the provided arguments
 *
 * Note: we can start with one function to support all different payload/transaction types,
 * and if to complex to use, we could have function for each type
 *
 * @param args.endlessConfig EndlessConfig
 * @param args.sender The transaction's sender account address as a hex input
 * @param args.payload The transaction payload - can create by using generateTransactionPayload()
 * @param args.options optional. Transaction options object
 * @param args.secondarySignerAddresses optional. For when want to create a multi signers transaction
 * @param args.feePayerAddress optional. For when want to create a fee payer (aka sponsored) transaction
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
export async function buildTransaction(args: InputGenerateRawTransactionArgs): Promise<AnyRawTransaction> {
  const { endlessConfig, sender, payload, options, feePayerAddress } = args;
  // generate raw transaction
  const rawTxn = await generateRawTransaction({
    endlessConfig,
    sender,
    payload,
    options,
    feePayerAddress,
  });

  // if multi agent transaction
  if ("secondarySignerAddresses" in args) {
    const signers: Array<AccountAddress> =
      args.secondarySignerAddresses?.map((signer) => AccountAddress.from(signer)) ?? [];

    return new MultiAgentTransaction(
      rawTxn,
      signers,
      args.feePayerAddress ? AccountAddress.from(args.feePayerAddress) : undefined,
    );
  }
  // return the raw transaction
  return new SimpleTransaction(rawTxn, args.feePayerAddress ? AccountAddress.from(args.feePayerAddress) : undefined);
}

/**
 * Fetches and caches ABIs with allowing for pass-through on provided ABIs
 * @param key
 * @param moduleAddress
 * @param moduleName
 * @param functionName
 * @param endlessConfig
 * @param abi
 * @param fetch
 */
async function fetchAbi<T extends FunctionABI>({
  key,
  moduleAddress,
  moduleName,
  functionName,
  endlessConfig,
  abi,
  fetch,
}: {
  key: string;
  moduleAddress: string;
  moduleName: string;
  functionName: string;
  endlessConfig: EndlessConfig;
  abi?: T;
  fetch: (moduleAddress: string, moduleName: string, functionName: string, endlessConfig: EndlessConfig) => Promise<T>;
}): Promise<T> {
  if (abi !== undefined) {
    return abi;
  }

  // We fetch the entry function ABI, and then pretend that we already had the ABI
  return memoizeAsync(
    async () => fetch(moduleAddress, moduleName, functionName, endlessConfig),
    `${key}-${endlessConfig.network}-${moduleAddress}-${moduleName}-${functionName}`,
    1000 * 60 * 5, // 5 minutes
  )();
}
