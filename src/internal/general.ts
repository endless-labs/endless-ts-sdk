// Copyright © Endless
// Copyright © Aptos Foundation
// SPDX-License-Identifier: Apache-2.0

/**
 * This file contains the underlying implementations for exposed API surface in
 * the {@link api/general}. By moving the methods out into a separate file,
 * other namespaces and processes can access these methods without depending on the entire
 * general namespace and without having a dependency cycle error.
 */

import { EndlessConfig } from "../api/endlessConfig";
import { getEndlessFullNode, postEndlessIndexer } from "../client";
import { GetChainTopUserTransactionsResponse, GetProcessorStatusResponse, GraphqlQuery, LedgerInfo } from "../types";
import { GetChainTopUserTransactionsQuery, GetProcessorStatusQuery } from "../types/generated/operations";
import { GetChainTopUserTransactions, GetProcessorStatus } from "../types/generated/queries";
import { ProcessorType } from "../utils/const";

export async function getLedgerInfo(args: { endlessConfig: EndlessConfig }): Promise<LedgerInfo> {
  const { endlessConfig } = args;
  const { data } = await getEndlessFullNode<{}, LedgerInfo>({
    endlessConfig,
    originMethod: "getLedgerInfo",
    path: "",
  });
  return data;
}

export async function getChainTopUserTransactions(args: {
  endlessConfig: EndlessConfig;
  limit: number;
}): Promise<GetChainTopUserTransactionsResponse> {
  const { endlessConfig, limit } = args;
  const graphqlQuery = {
    query: GetChainTopUserTransactions,
    variables: { limit },
  };

  const data = await queryIndexer<GetChainTopUserTransactionsQuery>({
    endlessConfig,
    query: graphqlQuery,
    originMethod: "getChainTopUserTransactions",
  });

  return data.user_transactions;
}

export async function queryIndexer<T extends {}>(args: {
  endlessConfig: EndlessConfig;
  query: GraphqlQuery;
  originMethod?: string;
}): Promise<T> {
  const { endlessConfig, query, originMethod } = args;
  const { data } = await postEndlessIndexer<GraphqlQuery, T>({
    endlessConfig,
    originMethod: originMethod ?? "queryIndexer",
    path: "",
    body: query,
    overrides: { WITH_CREDENTIALS: false },
  });
  return data;
}

export async function getProcessorStatuses(args: { endlessConfig: EndlessConfig }): Promise<GetProcessorStatusResponse> {
  const { endlessConfig } = args;

  const graphqlQuery = {
    query: GetProcessorStatus,
  };

  const data = await queryIndexer<GetProcessorStatusQuery>({
    endlessConfig,
    query: graphqlQuery,
    originMethod: "getProcessorStatuses",
  });

  return data.processor_status;
}

export async function getIndexerLastSuccessVersion(args: { endlessConfig: EndlessConfig }): Promise<bigint> {
  const response = await getProcessorStatuses({ endlessConfig: args.endlessConfig });
  return BigInt(response[0].last_success_version);
}

export async function getProcessorStatus(args: {
  endlessConfig: EndlessConfig;
  processorType: ProcessorType;
}): Promise<GetProcessorStatusResponse[0]> {
  const { endlessConfig, processorType } = args;

  const whereCondition: { processor: { _eq: string } } = {
    processor: { _eq: processorType },
  };

  const graphqlQuery = {
    query: GetProcessorStatus,
    variables: {
      where_condition: whereCondition,
    },
  };

  const data = await queryIndexer<GetProcessorStatusQuery>({
    endlessConfig,
    query: graphqlQuery,
    originMethod: "getProcessorStatus",
  });

  return data.processor_status[0];
}
