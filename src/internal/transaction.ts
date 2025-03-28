// Copyright © Endless
// Copyright © Aptos Foundation
// SPDX-License-Identifier: Apache-2.0

/**
 * This file contains the underlying implementations for exposed API surface in
 * the {@link api/transaction}. By moving the methods out into a separate file,
 * other namespaces and processes can access these methods without depending on the entire
 * transaction namespace and without having a dependency cycle error.
 */

import { EndlessConfig } from "../api/endlessConfig";
import { EndlessApiError, getEndlessFullNode, paginateWithCursor } from "../client";
import {
  TransactionResponseType,
  type AnyNumber,
  type GasEstimation,
  type HexInput,
  type PaginationArgs,
  type TransactionResponse,
  WaitForTransactionOptions,
  CommittedTransactionResponse,
  Block,
} from "../types";
import { DEFAULT_TXN_TIMEOUT_SEC, ProcessorType } from "../utils/const";
import { sleep } from "../utils/helpers";
import { memoizeAsync } from "../utils/memoize";
import { getIndexerLastSuccessVersion, getProcessorStatus } from "./general";

export async function getTransactions(args: {
  endlessConfig: EndlessConfig;
  options?: PaginationArgs;
}): Promise<TransactionResponse[]> {
  const { endlessConfig, options } = args;
  return paginateWithCursor<{}, TransactionResponse[]>({
    endlessConfig,
    originMethod: "getTransactions",
    path: "transactions",
    params: { start: options?.offset, limit: options?.limit },
  });
}

export async function getGasPriceEstimation(args: { endlessConfig: EndlessConfig }) {
  const { endlessConfig } = args;

  return memoizeAsync(
    async () => {
      const { data } = await getEndlessFullNode<{}, GasEstimation>({
        endlessConfig,
        originMethod: "getGasPriceEstimation",
        path: "estimate_gas_price",
      });
      return data;
    },
    `gas-price-${endlessConfig.network}`,
    1000 * 60 * 5, // 5 minutes
  )();
}

export async function getTransactionByVersion(args: {
  endlessConfig: EndlessConfig;
  ledgerVersion: AnyNumber;
}): Promise<TransactionResponse> {
  const { endlessConfig, ledgerVersion } = args;
  const { data } = await getEndlessFullNode<{}, TransactionResponse>({
    endlessConfig,
    originMethod: "getTransactionByVersion",
    path: `transactions/by_version/${ledgerVersion}`,
  });
  return data;
}

export async function getTransactionByHash(args: {
  endlessConfig: EndlessConfig;
  transactionHash: HexInput;
}): Promise<TransactionResponse> {
  const { endlessConfig, transactionHash } = args;
  const { data } = await getEndlessFullNode<{}, TransactionResponse>({
    endlessConfig,
    path: `transactions/by_hash/${transactionHash}`,
    originMethod: "getTransactionByHash",
  });
  return data;
}

export async function isTransactionPending(args: {
  endlessConfig: EndlessConfig;
  transactionHash: HexInput;
}): Promise<boolean> {
  const { endlessConfig, transactionHash } = args;
  try {
    const transaction = await getTransactionByHash({ endlessConfig, transactionHash });
    return transaction.type === TransactionResponseType.Pending;
  } catch (e: any) {
    if (e?.status === 404) {
      return true;
    }
    throw e;
  }
}

export async function longWaitForTransaction(args: {
  endlessConfig: EndlessConfig;
  transactionHash: HexInput;
}): Promise<TransactionResponse> {
  const { endlessConfig, transactionHash } = args;
  const { data } = await getEndlessFullNode<{}, TransactionResponse>({
    endlessConfig,
    path: `transactions/wait_by_hash/${transactionHash}`,
    originMethod: "longWaitForTransaction",
  });
  return data;
}

export async function waitForTransaction(args: {
  endlessConfig: EndlessConfig;
  transactionHash: HexInput;
  options?: WaitForTransactionOptions;
}): Promise<CommittedTransactionResponse> {
  const { endlessConfig, transactionHash, options } = args;
  const timeoutSecs = options?.timeoutSecs ?? DEFAULT_TXN_TIMEOUT_SEC;
  const checkSuccess = options?.checkSuccess ?? true;

  let isPending = true;
  let timeElapsed = 0;
  let lastTxn: TransactionResponse | undefined;
  let lastError: EndlessApiError | undefined;
  let backoffIntervalMs = 200;
  const backoffMultiplier = 1.5;

  function handleAPIError(e: any) {
    // In short, this means we will retry if it was an EndlessApiError and the code was 404 or 5xx.
    const isEndlessApiError = e instanceof EndlessApiError;
    if (!isEndlessApiError) {
      throw e; // This would be unexpected
    }
    lastError = e;
    const isRequestError = e.status !== 404 && e.status >= 400 && e.status < 500;
    if (isRequestError) {
      throw e;
    }
  }

  // check to see if the txn is already on the blockchain
  try {
    lastTxn = await getTransactionByHash({ endlessConfig, transactionHash });
    isPending = lastTxn.type === TransactionResponseType.Pending;
  } catch (e) {
    handleAPIError(e);
  }

  // If the transaction is pending, we do a long wait once to avoid polling
  if (isPending) {
    const startTime = Date.now();
    try {
      lastTxn = await longWaitForTransaction({ endlessConfig, transactionHash });
      isPending = lastTxn.type === TransactionResponseType.Pending;
    } catch (e) {
      handleAPIError(e);
    }
    timeElapsed = (Date.now() - startTime) / 1000;
  }

  // Now we do polling to see if the transaction is still pending
  while (isPending) {
    if (timeElapsed >= timeoutSecs) {
      break;
    }
    try {
      // eslint-disable-next-line no-await-in-loop
      lastTxn = await getTransactionByHash({ endlessConfig, transactionHash });

      isPending = lastTxn.type === TransactionResponseType.Pending;

      if (!isPending) {
        break;
      }
    } catch (e) {
      handleAPIError(e);
    }
    // eslint-disable-next-line no-await-in-loop
    await sleep(backoffIntervalMs);
    timeElapsed += backoffIntervalMs / 1000; // Convert to seconds
    backoffIntervalMs *= backoffMultiplier;
  }

  // There is a chance that lastTxn is still undefined. Let's throw the last error otherwise a WaitForTransactionError
  if (lastTxn === undefined) {
    if (lastError) {
      throw lastError;
    } else {
      throw new WaitForTransactionError(
        `Fetching transaction ${transactionHash} failed and timed out after ${timeoutSecs} seconds`,
        lastTxn,
      );
    }
  }

  if (lastTxn.type === TransactionResponseType.Pending) {
    throw new WaitForTransactionError(
      `Transaction ${transactionHash} timed out in pending state after ${timeoutSecs} seconds`,
      lastTxn,
    );
  }
  if (!checkSuccess) {
    return lastTxn;
  }
  if (!lastTxn.success) {
    throw new FailedTransactionError(
      `Transaction ${transactionHash} failed with an error: ${lastTxn.vm_status}`,
      lastTxn,
    );
  }

  return lastTxn;
}

/**
 * Waits for the indexer to sync up to the ledgerVersion. Timeout is 3 seconds.
 */
export async function waitForIndexer(args: {
  endlessConfig: EndlessConfig;
  minimumLedgerVersion: AnyNumber;
  processorType?: ProcessorType;
}): Promise<void> {
  const { endlessConfig, processorType } = args;
  const minimumLedgerVersion = BigInt(args.minimumLedgerVersion);
  const timeoutMilliseconds = 3000; // 3 seconds
  const startTime = new Date().getTime();
  let indexerVersion = BigInt(-1);

  while (indexerVersion < minimumLedgerVersion) {
    // check for timeout
    if (new Date().getTime() - startTime > timeoutMilliseconds) {
      throw new Error("waitForLastSuccessIndexerVersionSync timeout");
    }

    if (processorType === undefined) {
      // Get the last success version from all processor
      // eslint-disable-next-line no-await-in-loop
      indexerVersion = await getIndexerLastSuccessVersion({ endlessConfig });
    } else {
      // Get the last success version from the specific processor
      // eslint-disable-next-line no-await-in-loop
      const processor = await getProcessorStatus({ endlessConfig, processorType });
      indexerVersion = processor.last_success_version;
    }

    if (indexerVersion >= minimumLedgerVersion) {
      // break out immediately if we are synced
      break;
    }

    // eslint-disable-next-line no-await-in-loop
    await sleep(200);
  }
}

/**
 * This error is used by `waitForTransaction` when waiting for a
 * transaction to time out or when the transaction response is undefined
 */
export class WaitForTransactionError extends Error {
  public readonly lastSubmittedTransaction: TransactionResponse | undefined;

  constructor(message: string, lastSubmittedTransaction: TransactionResponse | undefined) {
    super(message);
    this.lastSubmittedTransaction = lastSubmittedTransaction;
  }
}

/**
 * This error is used by `waitForTransaction` if `checkSuccess` is true.
 * See that function for more information.
 */
export class FailedTransactionError extends Error {
  public readonly transaction: TransactionResponse;

  constructor(message: string, transaction: TransactionResponse) {
    super(message);
    this.transaction = transaction;
  }
}

export async function getBlockByVersion(args: {
  endlessConfig: EndlessConfig;
  ledgerVersion: AnyNumber;
  options?: { withTransactions?: boolean };
}): Promise<Block> {
  const { endlessConfig, ledgerVersion, options } = args;
  const { data: block } = await getEndlessFullNode<{}, Block>({
    endlessConfig,
    originMethod: "getBlockByVersion",
    path: `blocks/by_version/${ledgerVersion}`,
    params: { with_transactions: options?.withTransactions },
  });

  return fillBlockTransactions({ block, ...args });
}

export async function getBlockByHeight(args: {
  endlessConfig: EndlessConfig;
  blockHeight: AnyNumber;
  options?: { withTransactions?: boolean };
}): Promise<Block> {
  const { endlessConfig, blockHeight, options } = args;
  const { data: block } = await getEndlessFullNode<{}, Block>({
    endlessConfig,
    originMethod: "getBlockByHeight",
    path: `blocks/by_height/${blockHeight}`,
    params: { with_transactions: options?.withTransactions },
  });
  return fillBlockTransactions({ block, ...args });
}

/**
 * Fills in the block with transactions if not enough were returned
 * @param args
 */
async function fillBlockTransactions(args: {
  endlessConfig: EndlessConfig;
  block: Block;
  options?: { withTransactions?: boolean };
}) {
  const { endlessConfig, block, options } = args;
  if (options?.withTransactions) {
    // Transactions should be filled, but this ensures it
    block.transactions = block.transactions ?? [];

    const lastTxn = block.transactions[block.transactions.length - 1];
    const firstVersion = BigInt(block.first_version);
    const lastVersion = BigInt(block.last_version);

    // Convert the transaction to the type
    const curVersion: string | undefined = (lastTxn as any)?.version;
    let latestVersion;

    // This time, if we don't have any transactions, we will try once with the start of the block
    if (curVersion === undefined) {
      latestVersion = firstVersion - 1n;
    } else {
      latestVersion = BigInt(curVersion);
    }

    // If we have all the transactions in the block, we can skip out, otherwise we need to fill the transactions
    if (latestVersion === lastVersion) {
      return block;
    }

    // For now, we will grab all the transactions in groups of 100, but we can make this more efficient by trying larger
    // amounts
    const fetchFutures = [];
    const pageSize = 100n;
    for (let i = latestVersion + 1n; i < lastVersion; i += BigInt(100)) {
      fetchFutures.push(
        getTransactions({
          endlessConfig,
          options: {
            offset: i,
            limit: Math.min(Number(pageSize), Number(lastVersion - i + 1n)),
          },
        }),
      );
    }

    // Combine all the futures
    const responses = await Promise.all(fetchFutures);
    for (const txns of responses) {
      block.transactions.push(...txns);
    }
  }

  return block;
}
