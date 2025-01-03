// Copyright © Endless
// Copyright © Aptos Foundation
// SPDX-License-Identifier: Apache-2.0

import {
  getDelegatedStakingActivities,
  getNumberOfDelegators,
  getNumberOfDelegatorsForAllPools,
} from "../internal/staking";
import { AnyNumber, GetDelegatedStakingActivitiesResponse, GetNumberOfDelegatorsResponse, OrderByArg } from "../types";
import { AccountAddressInput } from "../core";
import { ProcessorType } from "../utils/const";
import { EndlessConfig } from "./endlessConfig";
import { waitForIndexerOnVersion } from "./utils";

/**
 * A class to query all `Staking` related queries on Endless.
 */
export class Staking {
  constructor(readonly config: EndlessConfig) { }

  /**
   * Queries current number of delegators in a pool.  Throws an error if the pool is not found.
   *
   * @example
   * const delegators = await endless.getNumberOfDelegators({poolAddress:"0x123"})
   *
   * @param args.poolAddress Pool address
   * @param args.minimumLedgerVersion Optional ledger version to sync up to, before querying
   * @returns The number of delegators for the given pool
   */
  async getNumberOfDelegators(args: {
    poolAddress: AccountAddressInput;
    minimumLedgerVersion?: AnyNumber;
  }): Promise<number> {
    await waitForIndexerOnVersion({
      config: this.config,
      minimumLedgerVersion: args?.minimumLedgerVersion,
      processorType: ProcessorType.STAKE_PROCESSOR,
    });
    return getNumberOfDelegators({ endlessConfig: this.config, ...args });
  }

  /**
   * Queries current number of delegators in a pool.  Throws an error if the pool is not found.
   *
   * @example
   * const delegators = await endless.getNumberOfDelegatorsForAllPools()
   *
   * @param args.minimumLedgerVersion Optional ledger version to sync up to, before querying
   * @returns GetNumberOfDelegatorsForAllPoolsResponse response type
   */
  async getNumberOfDelegatorsForAllPools(args?: {
    minimumLedgerVersion?: AnyNumber;
    options?: OrderByArg<GetNumberOfDelegatorsResponse[0]>;
  }): Promise<GetNumberOfDelegatorsResponse> {
    await waitForIndexerOnVersion({
      config: this.config,
      minimumLedgerVersion: args?.minimumLedgerVersion,
      processorType: ProcessorType.STAKE_PROCESSOR,
    });
    return getNumberOfDelegatorsForAllPools({ endlessConfig: this.config, ...args });
  }

  /**
   * Queries delegated staking activities
   *
   * @example
   * const delegators = await endless.getDelegatedStakingActivities({delegatorAddress:"0x123",poolAddress:"0x456"})
   *
   * @param args.delegatorAddress Delegator address
   * @param args.poolAddress Pool address
   * @param args.minimumLedgerVersion Optional ledger version to sync up to, before querying
   * @returns GetDelegatedStakingActivitiesResponse response type
   */
  async getDelegatedStakingActivities(args: {
    delegatorAddress: AccountAddressInput;
    poolAddress: AccountAddressInput;
    minimumLedgerVersion?: AnyNumber;
  }): Promise<GetDelegatedStakingActivitiesResponse> {
    await waitForIndexerOnVersion({
      config: this.config,
      minimumLedgerVersion: args?.minimumLedgerVersion,
      processorType: ProcessorType.STAKE_PROCESSOR,
    });
    return getDelegatedStakingActivities({ endlessConfig: this.config, ...args });
  }
}
