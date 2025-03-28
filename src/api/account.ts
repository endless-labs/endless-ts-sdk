// Copyright © Endless
// Copyright © Aptos Foundation
// SPDX-License-Identifier: Apache-2.0

import { Account as AccountModule } from "../account";
import { AccountAddress, PrivateKey, AccountAddressInput } from "../core";
import {
  AccountData,
  AnyNumber,
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
  TokenStandardArg,
  TransactionResponse,
  WhereArg,
  PaginationArgsOfIndexer,
  GetCreatedCoinDataResponse,
} from "../types";
import {
  deriveAccountFromPrivateKey,
  getAccountCoinAmount,
  getAccountsCoinBalance,
  getAccountCoinsCount,
  getAccountCoinsData,
  getAccountCollectionsWithOwnedTokens,
  getAccountOwnedObjects,
  getAccountOwnedTokens,
  getAccountOwnedTokensFromCollectionAddress,
  getAccountTokensCount,
  getAccountTransactionsCount,
  getInfo,
  getModule,
  getModules,
  getResource,
  getResources,
  getTransactions,
  lookupOriginalAccountAddress,
  getCoinsDataCreatedBy,
} from "../internal/account";
import {
  // ENDLESS_COIN,
  ENDLESS_COIN_ID,
  ProcessorType,
} from "../utils/const";
import { EndlessConfig } from "./endlessConfig";
import { waitForIndexerOnVersion } from "./utils";
import { CurrentFungibleAssetBalancesBoolExp } from "../types/generated/types";

/**
 * A class to query all `Account` related queries on Endless.
 */
export class Account {
  constructor(readonly config: EndlessConfig) { }

  /**
   * Queries the current state for an Endless account given its account address
   *
   * @param args.accountAddress Endless account address
   *
   * @returns The account data
   *
   * @example An example of the returned account
   * ```
   * {
   *    sequence_number: "1",
   *    authentication_key: "0x5307b5f4bc67829097a8ba9b43dba3b88261eeccd1f709d9bde240fc100fbb69"
   * }
   * ```
   */
  async getAccountInfo(args: { accountAddress: AccountAddressInput }): Promise<AccountData> {
    return getInfo({ endlessConfig: this.config, ...args });
  }

  /**
   * Queries for all modules in an account given an account address
   *
   * Note: In order to get all account modules, this function may call the API
   * multiple times as it auto paginates.
   *
   * @param args.accountAddress Endless account address
   * @param args.options.offset The number module to start returning results from
   * @param args.options.limit The number of results to return
   * @param args.options.ledgerVersion The ledger version to query, if not provided it will get the latest version
   *
   * @returns Account modules
   */

  async getAccountModules(args: {
    accountAddress: AccountAddressInput;
    options?: PaginationArgs & LedgerVersionArg;
  }): Promise<MoveModuleBytecode[]> {
    return getModules({ endlessConfig: this.config, ...args });
  }

  /**
   * Queries for a specific account module given account address and module name
   *
   * @param args.accountAddress Endless account address
   * @param args.moduleName The name of the module
   * @param args.options.ledgerVersion The ledger version to query, if not provided it will get the latest version
   *
   * @returns Account module
   *
   * @example
   * const module = await endless.getAccountModule({accountAddress:"0x456"})
   * // An example of an account module response
   * ```
   * {
   *    bytecode: "0xa11ceb0b0600000006010002030206050807070f0d081c200",
   *    abi: { address: "0x1" }
   * }
   * ```
   */
  async getAccountModule(args: {
    accountAddress: AccountAddressInput;
    moduleName: string;
    options?: LedgerVersionArg;
  }): Promise<MoveModuleBytecode> {
    return getModule({ endlessConfig: this.config, ...args });
  }

  /**
   * Queries account transactions given an account address
   *
   * Note: In order to get all account transactions, this function may call the API
   * multiple times as it auto paginates.
   *
   * @example
   * const transactions = await endless.getAccountTransactions({accountAddress:"0x456"})
   *
   * @param args.accountAddress Endless account address
   * @param args.options.offset The number transaction to start returning results from
   * @param args.options.limit The number of results to return
   *
   * @returns The account transactions
   */
  async getAccountTransactions(args: {
    accountAddress: AccountAddressInput;
    options?: PaginationArgs;
  }): Promise<TransactionResponse[]> {
    return getTransactions({
      endlessConfig: this.config,
      ...args,
    });
  }

  /**
   * Queries all account resources given an account address
   *
   * Note: In order to get all account resources, this function may call the API
   * multiple times as it auto paginates.
   *
   * @example
   * const resources = await endless.getAccountResources({accountAddress:"0x456"})
   *
   * @param args.accountAddress Endless account address
   * @param args.options.offset The number resource to start returning results from
   * @param args.options.limit The number of results to return
   * @param args.options.ledgerVersion The ledger version to query, if not provided it will get the latest version
   * @returns Account resources
   */
  async getAccountResources(args: {
    accountAddress: AccountAddressInput;
    options?: PaginationArgs & LedgerVersionArg;
  }): Promise<MoveResource[]> {
    return getResources({ endlessConfig: this.config, ...args });
  }

  /**
   * Queries a specific account resource given account address and resource type. Note that the default is `any` in order
   * to allow for ease of accessing properties of the object.
   *
   * @type The typed output of the resource
   * @param args.accountAddress Endless account address
   * @param args.resourceType String representation of an on-chain Move struct type, i.e "0x1::endless_coin::EndlessCoin"
   * @param args.options.ledgerVersion The ledger version to query, if not provided it will get the latest version
   *
   * @returns Account resource
   *
   * @example
   * const resource = await endless.getAccountResource({accountAddress:"0x456"})
   *
   */
  async getAccountResource<T extends {} = any>(args: {
    accountAddress: AccountAddressInput;
    resourceType: MoveStructId;
    options?: LedgerVersionArg;
  }): Promise<T> {
    return getResource<T>({ endlessConfig: this.config, ...args });
  }

  /**
   * Looks up the account address for a given authentication key
   *
   * This handles both if the account's authentication key has been rotated or not.
   *
   * @example
   * const accountAddress = await endless.lookupOriginalAccountAddress({authenticationKey:account.accountAddress})
   *
   * @param args.authenticationKey The authentication key
   * @param args.minimumLedgerVersion Optional ledger version to sync up to, before querying
   * @param args.options.ledgerVersion The ledger version to query, if not provided it will get the latest version
   * @returns Promise<AccountAddress> The accountAddress associated with the authentication key
   */
  async lookupOriginalAccountAddress(args: {
    authenticationKey: AccountAddressInput;
    minimumLedgerVersion?: AnyNumber;
    options?: LedgerVersionArg;
  }): Promise<AccountAddress> {
    return lookupOriginalAccountAddress({ endlessConfig: this.config, ...args });
  }

  /**
   * Queries the current count of tokens owned by an account
   *
   * @example
   * const tokensCount = await endless.getAccountTokensCount({accountAddress:"0x456"})
   *
   * @param args.accountAddress The account address
   * @param args.minimumLedgerVersion Optional ledger version to sync up to, before querying
   * @returns Current count of tokens owned by the account
   */
  async getAccountTokensCount(args: {
    accountAddress: AccountAddressInput;
    minimumLedgerVersion?: AnyNumber;
  }): Promise<number> {
    await waitForIndexerOnVersion({
      config: this.config,
      minimumLedgerVersion: args.minimumLedgerVersion,
      processorType: ProcessorType.ACCOUNT_TRANSACTION_PROCESSOR,
    });
    return getAccountTokensCount({
      endlessConfig: this.config,
      ...args,
    });
  }

  /**
   * Queries the account's current owned tokens.
   *
   * This query returns all tokens (v1 and v2 standards) an account owns, including NFTs, fungible, soulbound, etc.
   * If you want to get only the token from a specific standard, you can pass an optional tokenStandard param
   *
   * @example
   * const accountOwnedTokens = await endless.getAccountOwnedTokens({accountAddress:"0x456"})
   *
   * @param args.accountAddress The account address we want to get the tokens for
   * @param args.minimumLedgerVersion Optional ledger version to sync up to, before querying
   * @param args.options.tokenStandard The NFT standard to query for
   * @param args.options.offset The number token to start returning results from
   * @param args.options.limit The number of results to return
   * @param args.options.orderBy The order to sort the tokens by
   * @returns Tokens array with the token data
   */
  async getAccountOwnedTokens(args: {
    accountAddress: AccountAddressInput;
    minimumLedgerVersion?: AnyNumber;
    options?: TokenStandardArg & PaginationArgs & OrderByArg<GetAccountOwnedTokensQueryResponse[0]>;
  }): Promise<GetAccountOwnedTokensQueryResponse> {
    await waitForIndexerOnVersion({
      config: this.config,
      minimumLedgerVersion: args.minimumLedgerVersion,
      processorType: ProcessorType.TOKEN_V2_PROCESSOR,
    });
    return getAccountOwnedTokens({
      endlessConfig: this.config,
      ...args,
    });
  }

  /**
   * Queries all current tokens of a specific collection that an account owns by the collection address
   *
   * This query returns all tokens (v1 and v2 standards) an account owns, including NFTs, fungible, soulbound, etc.
   * If you want to get only the token from a specific standard, you can pass an optional tokenStandard param
   *
   * @example
   * const accountOwnedTokens = await endless.getAccountOwnedTokensFromCollectionAddress({
   *   accountAddress:"0x123",
   *   collectionAddress:"0x456"
   * })
   *
   * @param args.accountAddress The account address we want to get the tokens for
   * @param args.collectionAddress The address of the collection being queried
   * @param args.minimumLedgerVersion Optional ledger version to sync up to, before querying
   * @param args.options.tokenStandard The NFT standard to query for
   * @param args.options.offset The number token to start returning results from
   * @param args.options.limit The number of results to return
   * @param args.options.orderBy The order to sort the tokens by
   * @returns Tokens array with the token data
   */
  async getAccountOwnedTokensFromCollectionAddress(args: {
    accountAddress: AccountAddressInput;
    collectionAddress: AccountAddressInput;
    minimumLedgerVersion?: AnyNumber;
    options?: TokenStandardArg & PaginationArgs & OrderByArg<GetAccountOwnedTokensFromCollectionResponse[0]>;
  }): Promise<GetAccountOwnedTokensFromCollectionResponse> {
    await waitForIndexerOnVersion({
      config: this.config,
      minimumLedgerVersion: args.minimumLedgerVersion,
      processorType: ProcessorType.TOKEN_V2_PROCESSOR,
    });
    return getAccountOwnedTokensFromCollectionAddress({
      endlessConfig: this.config,
      ...args,
    });
  }

  /**
   * Queries for all collections that an account currently has tokens for.
   *
   * This query returns all tokens (v1 and v2 standards) an account owns, including NFTs, fungible, soulbound, etc.
   * If you want to get only the token from a specific standard, you can pass an optional tokenStandard param
   *
   * @example
   * const accountCollectionsWithOwnedTokens = await endless.getAccountCollectionsWithOwnedTokens({accountAddress:"0x123"})
   *
   * @param args.accountAddress The account address we want to get the collections for
   * @param args.minimumLedgerVersion Optional ledger version to sync up to, before querying
   * @param args.options.tokenStandard The NFT standard to query for
   * @param args.options.offset The number collection to start returning results from
   * @param args.options.limit The number of results to return
   * @param args.options.orderBy The order to sort the tokens by
   * @returns Collections array with the collections data
   */
  async getAccountCollectionsWithOwnedTokens(args: {
    accountAddress: AccountAddressInput;
    minimumLedgerVersion?: AnyNumber;
    options?: TokenStandardArg & PaginationArgs & OrderByArg<GetAccountCollectionsWithOwnedTokenResponse[0]>;
  }): Promise<GetAccountCollectionsWithOwnedTokenResponse> {
    await waitForIndexerOnVersion({
      config: this.config,
      minimumLedgerVersion: args.minimumLedgerVersion,
      processorType: ProcessorType.TOKEN_V2_PROCESSOR,
    });
    return getAccountCollectionsWithOwnedTokens({
      endlessConfig: this.config,
      ...args,
    });
  }

  /**
   * Queries the current count of transactions submitted by an account
   *
   * @example
   * const accountTransactionsCount = await endless.getAccountTransactionsCount({accountAddress:"0x123"})
   *
   * @param args.accountAddress The account address we want to get the total count for
   * @param args.minimumLedgerVersion Optional ledger version to sync up to, before querying
   * @returns Current count of transactions made by an account
   */
  async getAccountTransactionsCount(args: {
    accountAddress: AccountAddressInput;
    minimumLedgerVersion?: AnyNumber;
  }): Promise<number> {
    await waitForIndexerOnVersion({
      config: this.config,
      minimumLedgerVersion: args.minimumLedgerVersion,
      processorType: ProcessorType.ACCOUNT_TRANSACTION_PROCESSOR,
    });
    return getAccountTransactionsCount({
      endlessConfig: this.config,
      ...args,
    });
  }

  /**
   * Queries an account's coins data
   *
   * @example
   * const accountCoinsData = await endless.getAccountCoinsData({accountAddress:"0x123"})
   *
   * @param args.accountAddress The account address we want to get the coins data for
   * @param args.minimumLedgerVersion Optional ledger version to sync up to, before querying
   * @param args.options.offset optional. The number coin to start returning results from
   * @param args.options.limit optional. The number of results to return
   * @param args.options.orderBy optional. The order to sort the coins by
   * @param args.options.where optional. Filter the results by
   * @returns Array with the coins data
   */
  async getAccountCoinsData(args: {
    accountAddress: AccountAddressInput;
    minimumLedgerVersion?: AnyNumber;
    options?: PaginationArgsOfIndexer & OrderByArg<GetAccountCoinsDataResponse> & WhereArg<CurrentFungibleAssetBalancesBoolExp>;
  }): Promise<GetAccountCoinsDataResponse> {
    await waitForIndexerOnVersion({
      config: this.config,
      minimumLedgerVersion: args.minimumLedgerVersion,
      processorType: ProcessorType.FUNGIBLE_ASSET_PROCESSOR,
    });
    return getAccountCoinsData({
      endlessConfig: this.config,
      ...args,
    });
  }

  /**
   * Queries coins data Created by account 
   *
   * @example
   * const accountCoinsData = await endless.getCoinsDataCreatedBy({accountAddress:"0x123"})
   *
   * @param args.accountAddress The account address of who create the coins
   * @param args.minimumLedgerVersion Optional ledger version to sync up to, before querying
   * @param args.options.offset optional. The number coin to start returning results from
   * @param args.options.limit optional. The number of results to return
   * @param args.options.orderBy optional. The order to sort the coins by
   * @param args.options.where optional. Filter the results by
   * @returns Array with the coins data
   */
  async getCoinsDataCreatedBy(args: {
    accountAddress: AccountAddressInput;
    minimumLedgerVersion?: AnyNumber;
    options?: PaginationArgsOfIndexer & OrderByArg<GetAccountCoinsDataResponse> & WhereArg<CurrentFungibleAssetBalancesBoolExp>;
  }): Promise<GetCreatedCoinDataResponse> {
    await waitForIndexerOnVersion({
      config: this.config,
      minimumLedgerVersion: args.minimumLedgerVersion,
      processorType: ProcessorType.FUNGIBLE_ASSET_PROCESSOR,
    });
    return getCoinsDataCreatedBy({
      endlessConfig: this.config,
      ...args,
    });
  }

  /**
   * Queries the current count of an account's coins aggregated
   *
   * @example
   * const accountCoinsCount = await endless.getAccountCoinsCount({accountAddress:"0x123"})
   *
   * @param args.accountAddress The account address we want to get the total count for
   * @param args.minimumLedgerVersion Optional ledger version to sync up to, before querying
   * @returns Current count of the aggregated count of all account's coins
   */
  async getAccountCoinsCount(args: {
    accountAddress: AccountAddressInput;
    minimumLedgerVersion?: AnyNumber;
  }): Promise<number> {
    await waitForIndexerOnVersion({
      config: this.config,
      minimumLedgerVersion: args.minimumLedgerVersion,
      processorType: ProcessorType.FUNGIBLE_ASSET_PROCESSOR,
    });
    return getAccountCoinsCount({ endlessConfig: this.config, ...args });
  }

  /**
   * Queries the account's EDS amount
   *
   * @example
   * const accountAPTAmount = await endless.getAccountAPTAmount({accountAddress:"0x123"})
   *
   * @param args.accountAddress The account address we want to get the total count for
   * @param args.minimumLedgerVersion Optional ledger version to sync up to, before querying
   * @returns Current amount of account's APT
   */
  // async getAccountAPTAmount(args: {
  //   accountAddress: AccountAddressInput;
  //   minimumLedgerVersion?: AnyNumber;
  // }): Promise<number> {
  //   return this.getAccountCoinAmount({ coinType: ENDLESS_COIN, ...args });
  // }
  async getAccountEDSAmount(args: {
    accountAddress: AccountAddressInput;
    minimumLedgerVersion?: AnyNumber;
  }): Promise<number> {
    return this.getAccountCoinAmount({ coinId: ENDLESS_COIN_ID, ...args });
  }

  /**
   * Queries the account's coin amount by the coin type
   *
   * @example
   * const accountCoinAmount = await endless.getAccountCoinAmount({accountAddress:"0x123", coinType:"0x1::endless_coin::EndlessCoin"})
   *
   * @param args.accountAddress The account address we want to get the total count for
   * @param args.coinType The coin type to query
   * @param args.minimumLedgerVersion Optional ledger version to sync up to, before querying
   * @returns Current amount of account's coin
   */
  async getAccountCoinAmount(args: {
    accountAddress: AccountAddressInput;
    coinId: string;
    minimumLedgerVersion?: AnyNumber;
  }): Promise<number> {
    await waitForIndexerOnVersion({
      config: this.config,
      minimumLedgerVersion: args.minimumLedgerVersion,
      processorType: ProcessorType.FUNGIBLE_ASSET_PROCESSOR,
    });
    return getAccountCoinAmount({ endlessConfig: this.config, ...args });
  }

  /**
   * Queries an account's owned objects
   *
   * @example
   * const accountOwnedObjects = await endless.getAccountOwnedObjects({accountAddress:"0x123"})
   *
   * @param args.accountAddress The account address we want to get the objects for
   * @param args.minimumLedgerVersion Optional ledger version to sync up to, before querying
   * @param args.options.offset The starting position to start returning results from
   * @param args.options.limit The number of results to return
   * @param args.options.orderBy The order to sort the objects by
   * @returns Objects array with the object data
   */
  async getAccountOwnedObjects(args: {
    accountAddress: AccountAddressInput;
    minimumLedgerVersion?: AnyNumber;
    options?: PaginationArgs & OrderByArg<GetAccountOwnedObjectsResponse[0]>;
  }): Promise<GetAccountOwnedObjectsResponse> {
    await waitForIndexerOnVersion({
      config: this.config,
      minimumLedgerVersion: args.minimumLedgerVersion,
      processorType: ProcessorType.DEFAULT,
    });
    return getAccountOwnedObjects({
      endlessConfig: this.config,
      ...args,
    });
  }

  /**
   * Derives an account by providing a private key.
   * This functions resolves the provided private key type and derives the public key from it.
   *
   * If the privateKey is a Secp256k1 type, it derives the account using the derived public key and
   * auth key using the SingleKey scheme locally.
   *
   * If the privateKey is a ED25519 type, it looks up the authentication key on chain, and uses it to resolve
   * whether it is a Legacy ED25519 key or a Unified ED25519 key. It then derives the account based
   * on that.
   *
   * @example
   * const account = await endless.deriveAccountFromPrivateKey({privateKey:new Ed25519PrivateKey("0x123")})
   *
   * @param args.privateKey An account private key
   * @returns Account type
   */
  async deriveAccountFromPrivateKey(args: { privateKey: PrivateKey }): Promise<AccountModule> {
    return deriveAccountFromPrivateKey({ endlessConfig: this.config, ...args });
  }

  /**
   * Queries an account's coins data
   *
   * @example
   * const accountCoinsData = await endless.getAccountCoinsData({accountAddress:["0x123"]})
   *
   * @param args.accountAddress The account address we want to get the coins data for
   * @param args.coinAddress The coinAddress address we want to get the coins data for
   * @returns Array with the coins data
   */
  async getAccountsCoinBalance(args: {
    accountAddress: AccountAddressInput[];
    coinAddress: AccountAddressInput;
  }): Promise<GetAccountsCoinBalanceResponse> {
    return getAccountsCoinBalance({
      endlessConfig: this.config,
      ...args,
    });
  }
}
