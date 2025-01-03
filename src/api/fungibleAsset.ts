// Copyright © Endless
// Copyright © Aptos Foundation
// SPDX-License-Identifier: Apache-2.0

import {
  AnyNumber,
  GetCurrentFungibleAssetBalancesResponse,
  GetFungibleAssetActivitiesResponse,
  GetFungibleAssetMetadataResponse,
  PaginationArgs,
  WhereArg,
} from "../types";
import {
  getCurrentFungibleAssetBalances,
  getFungibleAssetActivities,
  getFungibleAssetMetadata,
  transferFungibleAsset,
} from "../internal/fungibleAsset";
import {
  CurrentFungibleAssetBalancesBoolExp,
  FungibleAssetActivitiesBoolExp,
  FungibleAssetMetadataBoolExp,
} from "../types/generated/types";
import { ProcessorType } from "../utils/const";
import { EndlessConfig } from "./endlessConfig";
import { waitForIndexerOnVersion } from "./utils";
import { Account } from "../account";
import { AccountAddressInput } from "../core";
import { InputGenerateTransactionOptions } from "../transactions";
import { SimpleTransaction } from "../transactions/instances/simpleTransaction";

/**
 * A class to query all `FungibleAsset` related queries on Endless.
 */
export class FungibleAsset {
  constructor(readonly config: EndlessConfig) { }

  /**
   * Queries all fungible asset metadata.
   *
   * @example
   * const fungibleAsset = await endless.getFungibleAssetMetadata()
   *
   * @param args.minimumLedgerVersion Optional ledger version to sync up to, before querying
   * @param args.options Optional configuration for pagination and filtering
   *
   * @returns A list of fungible asset metadata
   */
  async getFungibleAssetMetadata(args?: {
    minimumLedgerVersion?: AnyNumber;
    options?: PaginationArgs & WhereArg<FungibleAssetMetadataBoolExp>;
  }): Promise<GetFungibleAssetMetadataResponse> {
    await waitForIndexerOnVersion({
      config: this.config,
      minimumLedgerVersion: args?.minimumLedgerVersion,
      processorType: ProcessorType.FUNGIBLE_ASSET_PROCESSOR,
    });
    return getFungibleAssetMetadata({ endlessConfig: this.config, ...args });
  }

  /**
   * Queries a fungible asset metadata
   *
   * This query returns the fungible asset metadata for a specific fungible asset.
   *
   * @example
   * const fungibleAsset = await endless.getFungibleAssetMetadataByAssetType({assetType:"0x123::test_coin::TestCoin"})
   *
   * @param args.minimumLedgerVersion Optional ledger version to sync up to, before querying
   * @param args.assetType The asset type of the fungible asset.
   * e.g
   * "0x1::endless_coin::EndlessCoin" for Endless Coin
   * "0xc2948283c2ce03aafbb294821de7ee684b06116bb378ab614fa2de07a99355a8" - address format if this is fungible asset
   *
   * @returns A fungible asset metadata item
   */
  async getFungibleAssetMetadataByAssetType(args: {
    assetType: string;
    minimumLedgerVersion?: AnyNumber;
  }): Promise<GetFungibleAssetMetadataResponse[0]> {
    await waitForIndexerOnVersion({
      config: this.config,
      minimumLedgerVersion: args?.minimumLedgerVersion,
      processorType: ProcessorType.FUNGIBLE_ASSET_PROCESSOR,
    });
    const data = await getFungibleAssetMetadata({
      endlessConfig: this.config,
      options: {
        where: {
          asset_type: { _eq: args.assetType },
        },
      },
    });

    return data[0];
  }

  /**
   * Queries all fungible asset activities
   *
   * @example
   * const fungibleAssetActivities = await endless.getFungibleAssetActivities()
   *
   * @param args.minimumLedgerVersion Optional ledger version to sync up to, before querying
   * @param args.options Optional configuration for pagination and filtering
   *
   * @returns A list of fungible asset metadata
   */
  async getFungibleAssetActivities(args?: {
    minimumLedgerVersion?: AnyNumber;
    options?: PaginationArgs & WhereArg<FungibleAssetActivitiesBoolExp>;
  }): Promise<GetFungibleAssetActivitiesResponse> {
    await waitForIndexerOnVersion({
      config: this.config,
      minimumLedgerVersion: args?.minimumLedgerVersion,
      processorType: ProcessorType.FUNGIBLE_ASSET_PROCESSOR,
    });
    return getFungibleAssetActivities({ endlessConfig: this.config, ...args });
  }

  /**
   * Queries all fungible asset balances
   *
   * @example
   * const fungibleAssetBalances = await endless.getCurrentFungibleAssetBalances()
   *
   * @param args.minimumLedgerVersion Optional ledger version to sync up to, before querying
   * @param args.options Optional configuration for pagination and filtering
   *
   * @returns A list of fungible asset metadata
   */
  async getCurrentFungibleAssetBalances(args?: {
    minimumLedgerVersion?: AnyNumber;
    options?: PaginationArgs & WhereArg<CurrentFungibleAssetBalancesBoolExp>;
  }): Promise<GetCurrentFungibleAssetBalancesResponse> {
    await waitForIndexerOnVersion({
      config: this.config,
      minimumLedgerVersion: args?.minimumLedgerVersion,
      processorType: ProcessorType.FUNGIBLE_ASSET_PROCESSOR,
    });
    return getCurrentFungibleAssetBalances({ endlessConfig: this.config, ...args });
  }

  /**
   * Transfer `amount` of fungible asset from sender's primary store to recipient's primary store.
   *
   * Use this method to transfer any fungible asset including fungible token.
   *
   * @example
   * const transaction = await endless.transferFungibleAsset({
   *  sender: alice,
   *  fungibleAssetMetadataAddress: "0x123",
   *  recipient: "0x456",
   *  amount: 5
   * })
   *
   * @param sender The sender account
   * @param fungibleAssetMetadataAddress The fungible asset account address.
   * For example if you’re transferring USDT this would be the USDT address
   * @param recipient The recipient account address
   * @param amount Number of assets to transfer
   *
   * @returns A SimpleTransaction that can be simulated or submitted to chain.
   */
  async transferFungibleAsset(args: {
    sender: Account;
    fungibleAssetMetadataAddress: AccountAddressInput;
    recipient: AccountAddressInput;
    amount: AnyNumber;
    options?: InputGenerateTransactionOptions;
  }): Promise<SimpleTransaction> {
    return transferFungibleAsset({ endlessConfig: this.config, ...args });
  }
}
