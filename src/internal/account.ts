// Copyright © Endless
// Copyright © Aptos Foundation
// SPDX-License-Identifier: Apache-2.0

/**
 * This file contains the underlying implementations for exposed API surface in
 * the {@link api/account}. By moving the methods out into a separate file,
 * other namespaces and processes can access these methods without depending on the entire
 * account namespace and without having a dependency cycle error.
 */

import { EndlessConfig } from "../api/endlessConfig";
import { EndlessApiError, getEndlessFullNode, paginateWithCursor, getEndlessIndexer, postEndlessIndexer } from "../client";
import { AccountAddress, AccountAddressInput } from "../core/accountAddress";
import { Account } from "../account";
import { AnyPublicKey, Ed25519PublicKey, PrivateKey } from "../core/crypto";
import { queryIndexer } from "./general";
import {
  AccountData,
  GetAccountsCoinBalanceResponse,
  GetAccountCoinsDataResponse,
  GetAccountCollectionsWithOwnedTokenResponse,
  GetAccountOwnedObjectsResponse,
  GetAccountOwnedTokensFromCollectionResponse,
  GetAccountOwnedTokensQueryResponse,
  LedgerVersionArg,
  MoveModuleBytecode,
  MoveResource,
  MoveStructId,
  OrderByArg,
  PaginationArgs,
  PaginationArgsOfIndexer,
  TokenStandardArg,
  TransactionResponse,
  WhereArg,
  GetCreatedCoinDataResponse,
} from "../types";
import {
  GetAccountCoinsCountQuery,
  // GetAccountCoinsDataQuery,
  GetAccountCollectionsWithOwnedTokensQuery,
  GetAccountOwnedObjectsQuery,
  GetAccountOwnedTokensFromCollectionQuery,
  GetAccountOwnedTokensQuery,
  GetAccountTokensCountQuery,
  GetAccountTransactionsCountQuery,
} from "../types/generated/operations";
import {
  GetAccountCoinsCount,
  // GetAccountCoinsData,
  GetAccountCollectionsWithOwnedTokens,
  GetAccountOwnedObjects,
  GetAccountOwnedTokens,
  GetAccountOwnedTokensFromCollection,
  GetAccountTokensCount,
  GetAccountTransactionsCount,
} from "../types/generated/queries";
import { memoizeAsync } from "../utils/memoize";
import { Secp256k1PrivateKey, AuthenticationKey, Ed25519PrivateKey } from "../core";
import { CurrentFungibleAssetBalancesBoolExp } from "../types/generated/types";
import { getTableItem } from "./table";

export async function getInfo(args: {
  endlessConfig: EndlessConfig;
  accountAddress: AccountAddressInput;
}): Promise<AccountData> {
  const { endlessConfig, accountAddress } = args;
  const { data } = await getEndlessFullNode<{}, AccountData>({
    endlessConfig,
    originMethod: "getInfo",
    path: `accounts/${AccountAddress.from(accountAddress).toString()}`,
  });
  return data;
}

export async function getModules(args: {
  endlessConfig: EndlessConfig;
  accountAddress: AccountAddressInput;
  options?: PaginationArgs & LedgerVersionArg;
}): Promise<MoveModuleBytecode[]> {
  const { endlessConfig, accountAddress, options } = args;
  return paginateWithCursor<{}, MoveModuleBytecode[]>({
    endlessConfig,
    originMethod: "getModules",
    path: `accounts/${AccountAddress.from(accountAddress).toString()}/modules`,
    params: {
      ledger_version: options?.ledgerVersion,
      start: options?.offset,
      limit: options?.limit ?? 1000,
    },
  });
}

/**
 * Queries for a move module given account address and module name
 *
 * @param args.accountAddress Hex-encoded 32 byte Endless account address
 * @param args.moduleName The name of the module
 * @param args.query.ledgerVersion Specifies ledger version of transactions. By default, latest version will be used
 * @returns The move module.
 */
export async function getModule(args: {
  endlessConfig: EndlessConfig;
  accountAddress: AccountAddressInput;
  moduleName: string;
  options?: LedgerVersionArg;
}): Promise<MoveModuleBytecode> {
  // We don't memoize the account module by ledger version, as it's not a common use case, this would be handled
  // by the developer directly
  if (args.options?.ledgerVersion !== undefined) {
    return getModuleInner(args);
  }

  return memoizeAsync(
    async () => getModuleInner(args),
    `module-${args.accountAddress}-${args.moduleName}`,
    1000 * 60 * 5, // 5 minutes
  )();
}

async function getModuleInner(args: {
  endlessConfig: EndlessConfig;
  accountAddress: AccountAddressInput;
  moduleName: string;
  options?: LedgerVersionArg;
}): Promise<MoveModuleBytecode> {
  const { endlessConfig, accountAddress, moduleName, options } = args;

  const { data } = await getEndlessFullNode<{}, MoveModuleBytecode>({
    endlessConfig,
    originMethod: "getModule",
    path: `accounts/${AccountAddress.from(accountAddress).toString()}/module/${moduleName}`,
    params: { ledger_version: options?.ledgerVersion },
  });
  return data;
}

export async function getTransactions(args: {
  endlessConfig: EndlessConfig;
  accountAddress: AccountAddressInput;
  options?: PaginationArgs;
}): Promise<TransactionResponse[]> {
  const { endlessConfig, accountAddress, options } = args;
  return paginateWithCursor<{}, TransactionResponse[]>({
    endlessConfig,
    originMethod: "getTransactions",
    path: `accounts/${AccountAddress.from(accountAddress).toString()}/transactions`,
    params: { start: options?.offset, limit: options?.limit },
  });
}

export async function getResources(args: {
  endlessConfig: EndlessConfig;
  accountAddress: AccountAddressInput;
  options?: PaginationArgs & LedgerVersionArg;
}): Promise<MoveResource[]> {
  const { endlessConfig, accountAddress, options } = args;
  return paginateWithCursor<{}, MoveResource[]>({
    endlessConfig,
    originMethod: "getResources",
    path: `accounts/${AccountAddress.from(accountAddress).toString()}/resources`,
    params: {
      ledger_version: options?.ledgerVersion,
      start: options?.offset,
      limit: options?.limit ?? 999,
    },
  });
}

export async function getResource<T extends {}>(args: {
  endlessConfig: EndlessConfig;
  accountAddress: AccountAddressInput;
  resourceType: MoveStructId;
  options?: LedgerVersionArg;
}): Promise<T> {
  const { endlessConfig, accountAddress, resourceType, options } = args;
  const { data } = await getEndlessFullNode<{}, MoveResource>({
    endlessConfig,
    originMethod: "getResource",
    path: `accounts/${AccountAddress.from(accountAddress).toString()}/resource/${resourceType}`,
    params: { ledger_version: options?.ledgerVersion },
  });
  return data.data as T;
}

export async function lookupOriginalAccountAddress(args: {
  endlessConfig: EndlessConfig;
  authenticationKey: AccountAddressInput;
  options?: LedgerVersionArg;
}): Promise<AccountAddress> {
  const { endlessConfig, authenticationKey, options } = args;
  type OriginatingAddress = {
    address_map: { handle: string };
  };
  const resource = await getResource<OriginatingAddress>({
    endlessConfig,
    accountAddress: "0x1",
    resourceType: "0x1::account::OriginatingAddress",
    options,
  });

  const {
    address_map: { handle },
  } = resource;

  const authKeyAddress = AccountAddress.from(authenticationKey);

  // If the address is not found in the address map, which means its not rotated
  // then return the address as is
  try {
    const originalAddress = await getTableItem<string>({
      endlessConfig,
      handle,
      data: {
        key: authKeyAddress.toString(),
        key_type: "address",
        value_type: "address",
      },
      options,
    });

    return AccountAddress.from(originalAddress);
  } catch (err) {
    if (err instanceof EndlessApiError && err.data.error_code === "table_item_not_found") {
      return authKeyAddress;
    }

    throw err;
  }
}

export async function getAccountTokensCount(args: {
  endlessConfig: EndlessConfig;
  accountAddress: AccountAddressInput;
}): Promise<number> {
  const { endlessConfig, accountAddress } = args;

  const address = AccountAddress.from(accountAddress).toStringLong();

  const whereCondition: { owner_address: { _eq: string }; amount: { _gt: number } } = {
    owner_address: { _eq: address },
    amount: { _gt: 0 },
  };

  const graphqlQuery = {
    query: GetAccountTokensCount,
    variables: { where_condition: whereCondition },
  };

  const data = await queryIndexer<GetAccountTokensCountQuery>({
    endlessConfig,
    query: graphqlQuery,
    originMethod: "getAccountTokensCount",
  });

  // commonjs (aka cjs) doesnt handle Nullish Coalescing for some reason
  // might be because of how ts infer the graphql generated scheme type
  return data.current_token_ownerships_v2_aggregate.aggregate
    ? data.current_token_ownerships_v2_aggregate.aggregate.count
    : 0;
}

export async function getAccountOwnedTokens(args: {
  endlessConfig: EndlessConfig;
  accountAddress: AccountAddressInput;
  options?: TokenStandardArg & PaginationArgs & OrderByArg<GetAccountOwnedTokensQueryResponse[0]>;
}): Promise<GetAccountOwnedTokensQueryResponse> {
  const { endlessConfig, accountAddress, options } = args;
  const address = AccountAddress.from(accountAddress).toStringLong();

  const whereCondition: { owner_address: { _eq: string }; amount: { _gt: number }; token_standard?: { _eq: string } } =
  {
    owner_address: { _eq: address },
    amount: { _gt: 0 },
  };

  if (options?.tokenStandard) {
    whereCondition.token_standard = { _eq: options?.tokenStandard };
  }

  const graphqlQuery = {
    query: GetAccountOwnedTokens,
    variables: {
      where_condition: whereCondition,
      offset: options?.offset,
      limit: options?.limit,
      order_by: options?.orderBy,
    },
  };

  const data = await queryIndexer<GetAccountOwnedTokensQuery>({
    endlessConfig,
    query: graphqlQuery,
    originMethod: "getAccountOwnedTokens",
  });

  return data.current_token_ownerships_v2;
}

export async function getAccountOwnedTokensFromCollectionAddress(args: {
  endlessConfig: EndlessConfig;
  accountAddress: AccountAddressInput;
  collectionAddress: AccountAddressInput;
  options?: TokenStandardArg & PaginationArgs & OrderByArg<GetAccountOwnedTokensFromCollectionResponse[0]>;
}): Promise<GetAccountOwnedTokensFromCollectionResponse> {
  const { endlessConfig, accountAddress, collectionAddress, options } = args;
  const ownerAddress = AccountAddress.from(accountAddress).toStringLong();
  const collAddress = AccountAddress.from(collectionAddress).toStringLong();

  const whereCondition: {
    owner_address: { _eq: string };
    current_token_data: { collection_id: { _eq: string } };
    amount: { _gt: number };
    token_standard?: { _eq: string };
  } = {
    owner_address: { _eq: ownerAddress },
    current_token_data: { collection_id: { _eq: collAddress } },
    amount: { _gt: 0 },
  };

  if (options?.tokenStandard) {
    whereCondition.token_standard = { _eq: options?.tokenStandard };
  }

  const graphqlQuery = {
    query: GetAccountOwnedTokensFromCollection,
    variables: {
      where_condition: whereCondition,
      offset: options?.offset,
      limit: options?.limit,
      order_by: options?.orderBy,
    },
  };

  const data = await queryIndexer<GetAccountOwnedTokensFromCollectionQuery>({
    endlessConfig,
    query: graphqlQuery,
    originMethod: "getAccountOwnedTokensFromCollectionAddress",
  });

  return data.current_token_ownerships_v2;
}

export async function getAccountCollectionsWithOwnedTokens(args: {
  endlessConfig: EndlessConfig;
  accountAddress: AccountAddressInput;
  options?: TokenStandardArg & PaginationArgs & OrderByArg<GetAccountCollectionsWithOwnedTokenResponse[0]>;
}): Promise<GetAccountCollectionsWithOwnedTokenResponse> {
  const { endlessConfig, accountAddress, options } = args;
  const address = AccountAddress.from(accountAddress).toStringLong();

  const whereCondition: {
    owner_address: { _eq: string };
    amount: { _gt: number };
    current_collection?: { token_standard: { _eq: string } };
  } = {
    owner_address: { _eq: address },
    amount: { _gt: 0 },
  };

  if (options?.tokenStandard) {
    whereCondition.current_collection = {
      token_standard: { _eq: options?.tokenStandard },
    };
  }

  const graphqlQuery = {
    query: GetAccountCollectionsWithOwnedTokens,
    variables: {
      where_condition: whereCondition,
      offset: options?.offset,
      limit: options?.limit,
      order_by: options?.orderBy,
    },
  };

  const data = await queryIndexer<GetAccountCollectionsWithOwnedTokensQuery>({
    endlessConfig,
    query: graphqlQuery,
    originMethod: "getAccountCollectionsWithOwnedTokens",
  });

  return data.current_collection_ownership_v2_view;
}

export async function getAccountTransactionsCount(args: {
  endlessConfig: EndlessConfig;
  accountAddress: AccountAddressInput;
}): Promise<number> {
  const { endlessConfig, accountAddress } = args;

  const address = AccountAddress.from(accountAddress).toStringLong();

  const graphqlQuery = {
    query: GetAccountTransactionsCount,
    variables: { address },
  };

  const data = await queryIndexer<GetAccountTransactionsCountQuery>({
    endlessConfig,
    query: graphqlQuery,
    originMethod: "getAccountTransactionsCount",
  });

  // commonjs (aka cjs) doesnt handle Nullish Coalescing for some reason
  // might be because of how ts infer the graphql generated scheme type
  return data.account_transactions_aggregate.aggregate ? data.account_transactions_aggregate.aggregate.count : 0;
}

export async function getAccountCoinAmount(args: {
  endlessConfig: EndlessConfig;
  accountAddress: AccountAddressInput;
  coinId: string;
}): Promise<number> {
  const { endlessConfig, accountAddress, coinId } = args;
  const address = AccountAddress.from(accountAddress).toStringLong();

  const { data } = await getAccountCoinsData({
    endlessConfig,
    accountAddress: address,
    options: {
      where: { coin_id: coinId },
    },
  });

  const balance = data[0].balance && data[0].metadata.decimals ?
    parseInt(data[0].balance, 10) / (10 ** data[0].metadata.decimals) : 0;

  // commonjs (aka cjs) doesnt handle Nullish Coalescing for some reason
  // might be because of how ts infer the graphql generated scheme type
  return balance;
}

export async function getCoinsDataCreatedBy(args: {
  endlessConfig: EndlessConfig;
  accountAddress: AccountAddressInput;
  options?: PaginationArgsOfIndexer & OrderByArg<GetAccountCoinsDataResponse> & WhereArg<CurrentFungibleAssetBalancesBoolExp>;
}): Promise<GetCreatedCoinDataResponse> {
  const { endlessConfig, accountAddress, options } = args;
  const address = AccountAddress.from(accountAddress).toStringLong();

  const { data } = await getEndlessIndexer<{}, GetCreatedCoinDataResponse>({
    endlessConfig,
    originMethod: "getCoinsDataCreatedBy",
    path: `coins/created_by/${address}`,
    params: {
      page: options?.page,
      pageSize: options?.pageSize,
      coin: options?.where?.coin_id,
    }
  })

  return data
}

export async function getAccountCoinsData(args: {
  endlessConfig: EndlessConfig;
  accountAddress: AccountAddressInput;
  options?: PaginationArgsOfIndexer & OrderByArg<GetAccountCoinsDataResponse> & WhereArg<CurrentFungibleAssetBalancesBoolExp>;
}): Promise<GetAccountCoinsDataResponse> {
  const { endlessConfig, accountAddress, options } = args;
  const address = AccountAddress.from(accountAddress).toStringLong();

  const { data } = await getEndlessIndexer<{}, GetAccountCoinsDataResponse>({
    endlessConfig,
    originMethod: "getAccountCoinsData",
    path: `accounts/${address}/coins`,
    params: {
      page: options?.page,
      pageSize: options?.pageSize,
      coin: options?.where?.coin_id,
    }
  })

  return data;
}


export async function getAccountCoinsCount(args: {
  endlessConfig: EndlessConfig;
  accountAddress: AccountAddressInput;
}): Promise<number> {
  const { endlessConfig, accountAddress } = args;
  const address = AccountAddress.from(accountAddress).toStringLong();

  const graphqlQuery = {
    query: GetAccountCoinsCount,
    variables: { address },
  };

  const data = await queryIndexer<GetAccountCoinsCountQuery>({
    endlessConfig,
    query: graphqlQuery,
    originMethod: "getAccountCoinsCount",
  });

  if (!data.current_fungible_asset_balances_aggregate.aggregate) {
    throw Error("Failed to get the count of account coins");
  }

  return data.current_fungible_asset_balances_aggregate.aggregate.count;
}

export async function getAccountOwnedObjects(args: {
  endlessConfig: EndlessConfig;
  accountAddress: AccountAddressInput;
  options?: PaginationArgs & OrderByArg<GetAccountOwnedObjectsResponse[0]>;
}): Promise<GetAccountOwnedObjectsResponse> {
  const { endlessConfig, accountAddress, options } = args;
  const address = AccountAddress.from(accountAddress).toStringLong();

  const whereCondition: { owner_address: { _eq: string } } = {
    owner_address: { _eq: address },
  };
  const graphqlQuery = {
    query: GetAccountOwnedObjects,
    variables: {
      where_condition: whereCondition,
      offset: options?.offset,
      limit: options?.limit,
      order_by: options?.orderBy,
    },
  };
  const data = await queryIndexer<GetAccountOwnedObjectsQuery>({
    endlessConfig,
    query: graphqlQuery,
    originMethod: "getAccountOwnedObjects",
  });

  return data.current_objects;
}

/**
 * NOTE: There is a potential issue once unified single signer scheme will be adopted
 * by the community.
 *
 * Becuase on could create 2 accounts with the same private key with this new authenticator type,
 * we’ll need to determine the order in which we lookup the accounts. First unified
 * scheme and then legacy scheme vs first legacy scheme and then unified scheme.
 *
 */
export async function deriveAccountFromPrivateKey(args: {
  endlessConfig: EndlessConfig;
  privateKey: PrivateKey;
}): Promise<Account> {
  const { endlessConfig, privateKey } = args;
  const publicKey = new AnyPublicKey(privateKey.publicKey());

  if (privateKey instanceof Secp256k1PrivateKey) {
    // private key is secp256k1, therefore we know it for sure uses a single signer key
    const authKey = AuthenticationKey.fromPublicKey({ publicKey });
    const address = authKey.derivedAddress();
    return Account.fromPrivateKey({ privateKey, address });
  }

  if (privateKey instanceof Ed25519PrivateKey) {
    // lookup single sender ed25519
    const singleSenderTransactionAuthenticatorAuthKey = AuthenticationKey.fromPublicKey({
      publicKey,
    });
    const isSingleSenderTransactionAuthenticator = await isAccountExist({
      authKey: singleSenderTransactionAuthenticatorAuthKey,
      endlessConfig,
    });
    if (isSingleSenderTransactionAuthenticator) {
      const address = singleSenderTransactionAuthenticatorAuthKey.derivedAddress();
      return Account.fromPrivateKey({ privateKey, address, legacy: false });
    }
    // lookup legacy ed25519
    const legacyAuthKey = AuthenticationKey.fromPublicKey({
      publicKey: publicKey.publicKey as Ed25519PublicKey,
    });
    const isLegacyEd25519 = await isAccountExist({ authKey: legacyAuthKey, endlessConfig });
    if (isLegacyEd25519) {
      const address = legacyAuthKey.derivedAddress();
      return Account.fromPrivateKey({ privateKey, address, legacy: true });
    }
  }
  // if we are here, it means we couldn't find an address with an
  // auth key that matches the provided private key
  throw new Error(`Can't derive account from private key ${privateKey}`);
}

export async function isAccountExist(args: { endlessConfig: EndlessConfig; authKey: AuthenticationKey }): Promise<boolean> {
  const { endlessConfig, authKey } = args;
  const accountAddress = await lookupOriginalAccountAddress({
    endlessConfig,
    authenticationKey: authKey.derivedAddress(),
  });

  try {
    await getInfo({
      endlessConfig,
      accountAddress,
    });
    return true;
  } catch (error: any) {
    // account not found
    if (error.status === 404) {
      return false;
    }
    throw new Error(`Error while looking for an account info ${accountAddress.toString()}`);
  }
}

export async function getAccountsCoinBalance(args: {
  endlessConfig: EndlessConfig;
  accountAddress: AccountAddressInput[];
  coinAddress: AccountAddressInput;
}): Promise<GetAccountsCoinBalanceResponse> {
  const { endlessConfig, accountAddress, coinAddress } = args;
  const { data } = await postEndlessIndexer<{}, GetAccountsCoinBalanceResponse>({
    endlessConfig,
    originMethod: "getAccountsCoinBalance",
    path: `accounts/coins/${coinAddress}`,
    body: accountAddress
  })
  return data;
}
