// Copyright © Endless
// Copyright © Aptos Foundation
// SPDX-License-Identifier: Apache-2.0

import {
  getAccountEventsByCreationNumber,
  getAccountEventsByEventType,
  getModuleEventsByEventType,
  getEvents,
} from "../internal/event";
import { AnyNumber, GetEventsResponse, MoveStructId, OrderByArg, PaginationArgs, WhereArg } from "../types";
import { EventsBoolExp } from "../types/generated/types";
import { AccountAddressInput } from "../core";
import { ProcessorType } from "../utils/const";
import { EndlessConfig } from "./endlessConfig";
import { waitForIndexerOnVersion } from "./utils";

/**
 * A class to query all `Event` Endless related queries
 */
export class Event {
  constructor(readonly config: EndlessConfig) { }

  /**
   * Get module events by event type
   *
   * @example
   * const events = await endless.getModuleEventsByEventType({eventType:"0x1::transaction_fee::FeeStatement"})
   *
   * @param args.eventType - The event type
   * @param args.minimumLedgerVersion Optional ledger version to sync up to, before querying
   *
   * @returns Promise<GetEventsResponse>
   */
  async getModuleEventsByEventType(args: {
    eventType: MoveStructId;
    minimumLedgerVersion?: AnyNumber;
    options?: PaginationArgs & OrderByArg<GetEventsResponse[0]>;
  }): Promise<GetEventsResponse> {
    await waitForIndexerOnVersion({
      config: this.config,
      minimumLedgerVersion: args.minimumLedgerVersion,
      processorType: ProcessorType.EVENTS_PROCESSOR,
    });
    return getModuleEventsByEventType({ endlessConfig: this.config, ...args });
  }

  /**
   * Get events by creation number and an account address
   *
   * @example
   * const events = await endless.getAccountEventsByCreationNumber({accountAddress:"0x123",creationNumber: 0})
   *
   * @param args.accountAddress - The account address
   * @param args.creationNumber - The event creation number
   * @param args.minimumLedgerVersion Optional ledger version to sync up to, before querying
   *
   * @returns Promise<GetEventsResponse>
   */
  async getAccountEventsByCreationNumber(args: {
    accountAddress: AccountAddressInput;
    creationNumber: AnyNumber;
    minimumLedgerVersion?: AnyNumber;
  }): Promise<GetEventsResponse> {
    await waitForIndexerOnVersion({
      config: this.config,
      minimumLedgerVersion: args.minimumLedgerVersion,
      processorType: ProcessorType.EVENTS_PROCESSOR,
    });
    return getAccountEventsByCreationNumber({ endlessConfig: this.config, ...args });
  }

  /**
   * Get events by event type and an account address
   *
   * @example
   * const events = await endless.getAccountEventsByEventType({accountAddress:"0x123",eventType: "0x1::transaction_fee::FeeStatement"})
   *
   * @param args.accountAddress - The account address
   * @param args.eventType - The event type
   * @param args.minimumLedgerVersion Optional ledger version to sync up to, before querying
   *
   * @returns Promise<GetEventsResponse>
   */
  async getAccountEventsByEventType(args: {
    accountAddress: AccountAddressInput;
    eventType: MoveStructId;
    minimumLedgerVersion?: AnyNumber;
    options?: PaginationArgs & OrderByArg<GetEventsResponse[0]>;
  }): Promise<GetEventsResponse> {
    await waitForIndexerOnVersion({
      config: this.config,
      minimumLedgerVersion: args.minimumLedgerVersion,
      processorType: ProcessorType.EVENTS_PROCESSOR,
    });
    return getAccountEventsByEventType({ endlessConfig: this.config, ...args });
  }

  /**
   * Get all events
   *
   * An optional `where` can be passed in to filter out the response.
   * @param args.minimumLedgerVersion Optional ledger version to sync up to, before querying
   * @example
   * const events = await endless.getEvents()
   * // with filtering
   * const events = await endless.getEvents({options: { where: { account_address: { _eq: "0x123" } } }});
   *
   * @returns GetEventsQuery response type
   */
  async getEvents(args?: {
    minimumLedgerVersion?: AnyNumber;
    options?: PaginationArgs & OrderByArg<GetEventsResponse[0]> & WhereArg<EventsBoolExp>;
  }): Promise<GetEventsResponse> {
    await waitForIndexerOnVersion({
      config: this.config,
      minimumLedgerVersion: args?.minimumLedgerVersion,
      processorType: ProcessorType.EVENTS_PROCESSOR,
    });
    return getEvents({ endlessConfig: this.config, ...args });
  }
}
