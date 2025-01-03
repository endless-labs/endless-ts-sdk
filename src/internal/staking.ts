// Copyright © Endless
// Copyright © Aptos Foundation
// SPDX-License-Identifier: Apache-2.0

/**
 * This file contains the underlying implementations for exposed API surface in
 * the {@link api/staking}. By moving the methods out into a separate file,
 * other namespaces and processes can access these methods without depending on the entire
 * faucet namespace and without having a dependency cycle error.
 */

import { EndlessConfig } from "../api/endlessConfig";
import { AccountAddress, AccountAddressInput } from "../core";
import { GetDelegatedStakingActivitiesResponse, GetNumberOfDelegatorsResponse, OrderByArg } from "../types";
import { GetDelegatedStakingActivitiesQuery, GetNumberOfDelegatorsQuery } from "../types/generated/operations";
import { GetDelegatedStakingActivities, GetNumberOfDelegators } from "../types/generated/queries";
import { queryIndexer } from "./general";

export async function getNumberOfDelegators(args: {
  endlessConfig: EndlessConfig;
  poolAddress: AccountAddressInput;
}): Promise<number> {
  const { endlessConfig, poolAddress } = args;
  const address = AccountAddress.from(poolAddress).toStringLong();
  const query = {
    query: GetNumberOfDelegators,
    variables: { where_condition: { pool_address: { _eq: address } } },
  };
  const data = await queryIndexer<GetNumberOfDelegatorsQuery>({ endlessConfig, query });

  // commonjs (aka cjs) doesnt handle Nullish Coalescing for some reason
  // might be because of how ts infer the graphql generated scheme type
  return data.num_active_delegator_per_pool[0] ? data.num_active_delegator_per_pool[0].num_active_delegator : 0;
}

export async function getNumberOfDelegatorsForAllPools(args: {
  endlessConfig: EndlessConfig;
  options?: OrderByArg<GetNumberOfDelegatorsResponse[0]>;
}): Promise<GetNumberOfDelegatorsResponse> {
  const { endlessConfig, options } = args;
  const query = {
    query: GetNumberOfDelegators,
    variables: { order_by: options?.orderBy },
  };
  const data = await queryIndexer<GetNumberOfDelegatorsQuery>({
    endlessConfig,
    query,
  });
  return data.num_active_delegator_per_pool;
}

export async function getDelegatedStakingActivities(args: {
  endlessConfig: EndlessConfig;
  delegatorAddress: AccountAddressInput;
  poolAddress: AccountAddressInput;
}): Promise<GetDelegatedStakingActivitiesResponse> {
  const { endlessConfig, delegatorAddress, poolAddress } = args;
  const query = {
    query: GetDelegatedStakingActivities,
    variables: {
      delegatorAddress: AccountAddress.from(delegatorAddress).toStringLong(),
      poolAddress: AccountAddress.from(poolAddress).toStringLong(),
    },
  };
  const data = await queryIndexer<GetDelegatedStakingActivitiesQuery>({ endlessConfig, query });
  return data.delegated_staking_activities;
}
