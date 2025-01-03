import { EndlessConfig } from "../api/endlessConfig";
import { postEndlessFullNode } from "../client";
import {
  TableItemRequest,
  LedgerVersionArg,
  PaginationArgs,
  WhereArg,
  OrderByArg,
  GetTableItemsDataResponse,
  GetTableItemsMetadataResponse,
} from "../types";
import { GetTableItemsDataQuery, GetTableItemsMetadataQuery } from "../types/generated/operations";
import { GetTableItemsData, GetTableItemsMetadata } from "../types/generated/queries";
import { TableItemsBoolExp, TableMetadatasBoolExp } from "../types/generated/types";
import { queryIndexer } from "./general";

export async function getTableItem<T>(args: {
  endlessConfig: EndlessConfig;
  handle: string;
  data: TableItemRequest;
  options?: LedgerVersionArg;
}): Promise<T> {
  const { endlessConfig, handle, data, options } = args;
  const response = await postEndlessFullNode<TableItemRequest, any>({
    endlessConfig,
    originMethod: "getTableItem",
    path: `tables/${handle}/item`,
    params: { ledger_version: options?.ledgerVersion },
    body: data,
  });
  return response.data as T;
}

export async function getTableItemsData(args: {
  endlessConfig: EndlessConfig;
  options?: PaginationArgs & WhereArg<TableItemsBoolExp> & OrderByArg<GetTableItemsDataResponse[0]>;
}) {
  const { endlessConfig, options } = args;

  const graphqlQuery = {
    query: GetTableItemsData,
    variables: {
      where_condition: options?.where,
      offset: options?.offset,
      limit: options?.limit,
      order_by: options?.orderBy,
    },
  };

  const data = await queryIndexer<GetTableItemsDataQuery>({
    endlessConfig,
    query: graphqlQuery,
    originMethod: "getTableItemsData",
  });

  return data.table_items;
}

export async function getTableItemsMetadata(args: {
  endlessConfig: EndlessConfig;
  options?: PaginationArgs & WhereArg<TableMetadatasBoolExp> & OrderByArg<GetTableItemsMetadataResponse[0]>;
}): Promise<GetTableItemsMetadataResponse> {
  const { endlessConfig, options } = args;

  const graphqlQuery = {
    query: GetTableItemsMetadata,
    variables: {
      where_condition: options?.where,
      offset: options?.offset,
      limit: options?.limit,
      order_by: options?.orderBy,
    },
  };

  const data = await queryIndexer<GetTableItemsMetadataQuery>({
    endlessConfig,
    query: graphqlQuery,
    originMethod: "getTableItemsMetadata",
  });

  return data.table_metadatas;
}
