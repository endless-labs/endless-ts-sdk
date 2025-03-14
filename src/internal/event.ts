// Copyright © Endless
// Copyright © Aptos Foundation
// SPDX-License-Identifier: Apache-2.0

/**
 * This file contains the underlying implementations for exposed API surface in
 * the {@link api/event}. By moving the methods out into a separate file,
 * other namespaces and processes can access these methods without depending on the entire
 * event namespace and without having a dependency cycle error.
 */

import { EndlessConfig } from "../api/endlessConfig";
import { AccountAddress, AccountAddressInput } from "../core";
import { AnyNumber, GetEventsResponse, PaginationArgs, MoveStructId, OrderByArg, WhereArg } from "../types";
import { GetEventsQuery } from "../types/generated/operations";
import { GetEvents } from "../types/generated/queries";
import { EventsBoolExp, InputMaybe } from "../types/generated/types";
import { queryIndexer } from "./general";

const MAX_EVENT_TYPE_LENGTH = 300;
const checkEventTypeLength = (eventType?: InputMaybe<string>) => {
  if (eventType && eventType.length > MAX_EVENT_TYPE_LENGTH) {
    throw new Error(`Event type length exceeds the maximum length of ${MAX_EVENT_TYPE_LENGTH}`);
  }
};

export async function getModuleEventsByEventType(args: {
  endlessConfig: EndlessConfig;
  eventType: MoveStructId;
  options?: PaginationArgs & OrderByArg<GetEventsResponse[0]>;
}): Promise<GetEventsResponse> {
  const { endlessConfig, eventType, options } = args;

  const whereCondition: EventsBoolExp = {
    account_address: { _eq: "0x0000000000000000000000000000000000000000000000000000000000000000" },
    creation_number: { _eq: "0" },
    sequence_number: { _eq: "0" },
    indexed_type: { _eq: eventType },
  };

  const customOptions = {
    where: whereCondition,
    pagination: options,
    orderBy: options?.orderBy,
  };

  return getEvents({ endlessConfig, options: customOptions });
}

export async function getAccountEventsByCreationNumber(args: {
  endlessConfig: EndlessConfig;
  accountAddress: AccountAddressInput;
  creationNumber: AnyNumber;
  options?: PaginationArgs & OrderByArg<GetEventsResponse[0]>;
}): Promise<GetEventsResponse> {
  const { accountAddress, endlessConfig, creationNumber, options } = args;
  const address = AccountAddress.from(accountAddress);

  const whereCondition: EventsBoolExp = {
    account_address: { _eq: address.toStringLong() },
    creation_number: { _eq: creationNumber },
  };

  const customOptions = {
    where: whereCondition,
    pagination: options,
    orderBy: options?.orderBy,
  };

  return getEvents({ endlessConfig, options: customOptions });
}

export async function getAccountEventsByEventType(args: {
  endlessConfig: EndlessConfig;
  accountAddress: AccountAddressInput;
  eventType: MoveStructId;
  options?: PaginationArgs & OrderByArg<GetEventsResponse[0]>;
}): Promise<GetEventsResponse> {
  const { accountAddress, endlessConfig, eventType, options } = args;
  const address = AccountAddress.from(accountAddress).toStringLong();

  const whereCondition: EventsBoolExp = {
    account_address: { _eq: address },
    indexed_type: { _eq: eventType },
  };

  const customOptions = {
    where: whereCondition,
    pagination: options,
    orderBy: options?.orderBy,
  };

  return getEvents({ endlessConfig, options: customOptions });
}

export async function getEvents(args: {
  endlessConfig: EndlessConfig;
  options?: PaginationArgs & OrderByArg<GetEventsResponse[0]> & WhereArg<EventsBoolExp>;
}): Promise<GetEventsResponse> {
  const { endlessConfig, options } = args;
  // eslint-disable-next-line no-underscore-dangle
  checkEventTypeLength(options?.where?.indexed_type?._eq);

  const graphqlQuery = {
    query: GetEvents,
    variables: {
      where_condition: options?.where,
      offset: options?.offset,
      limit: options?.limit,
      order_by: options?.orderBy,
    },
  };

  const data = await queryIndexer<GetEventsQuery>({
    endlessConfig,
    query: graphqlQuery,
    originMethod: "getEvents",
  });

  return data.events;
}
