// Copyright © Endless
// Copyright © Aptos Foundation
// SPDX-License-Identifier: Apache-2.0

import endlessClient from "endless-client";
import { EndlessSettings, ClientConfig, Client, FullNodeConfig, IndexerConfig } from "../types";
import {
  NetworkToNodeAPI,
  NetworkToIndexerAPI,
  Network,
  NetworkToIndexerAPIV2,
  NetworkToProverAPI
} from "../utils/apiEndpoints";
import { EndlessApiType } from "../utils/const";

/**
 * This class holds the config information for the SDK client instance.
 *
 * @example
 *
 * const endlessConfig = new EndlessConfig({network:Network.TESTNET})
 */
export class EndlessConfig {
  /**
   * The Network that this SDK is associated with. Defaults to DEVNET
   */
  readonly network: Network;

  /**
   * The client instance the SDK uses. Defaults to `@endless-labs/endless-client
   */
  readonly client: Client;

  /**
   * The optional hardcoded fullnode URL to send requests to instead of using the network
   */
  readonly fullnode?: string;

  /**
   * The optional hardcoded prover service URL to send requests to instead of using the network
   */
  readonly prover?: string;

  /**
   * The optional hardcoded indexer URL to send requests to instead of using the network
   */
  readonly indexer?: string;

  readonly indexerV2?: string;

  /**
   * Optional client configurations
   */
  readonly clientConfig?: ClientConfig;

  /**
   * Optional specific Fullnode configurations
   */
  readonly fullnodeConfig?: FullNodeConfig;

  /**
   * Optional specific Indexer configurations
   */
  readonly indexerConfig?: IndexerConfig;

  readonly maxExpHorizonSecs?: number;

  constructor(settings?: EndlessSettings) {
    this.network = settings?.network ?? Network.DEVNET;
    this.fullnode = settings?.fullnode;
    this.indexer = settings?.indexer;
    this.prover = settings?.prover;
    this.client = settings?.client ?? { provider: endlessClient };
    this.clientConfig = settings?.clientConfig ?? {};
    this.fullnodeConfig = settings?.fullnodeConfig ?? {};
    this.indexerConfig = settings?.indexerConfig ?? {};
    this.maxExpHorizonSecs = settings?.network === Network.TESTNET ? 10000000 : undefined;
  }

  /**
   * Returns the URL endpoint to send the request to.
   * If a custom URL was provided in the config, that URL is returned.
   * If a custom URL was provided but not URL endpoints, an error is thrown.
   * Otherwise, the URL endpoint is derived from the network.
   *
   * @param apiType - The type of Endless API to get the URL for.
   *
   * @internal
   */
  getRequestUrl(apiType: EndlessApiType): string {
    switch (apiType) {
      case EndlessApiType.FULLNODE:
        if (this.fullnode !== undefined) return this.fullnode;
        if (this.network === Network.CUSTOM) throw new Error("Please provide a custom full node url");
        return NetworkToNodeAPI[this.network];
      case EndlessApiType.INDEXER:
        if (this.indexer !== undefined) return this.indexer;
        if (this.network === Network.CUSTOM) throw new Error("Please provide a custom indexer url");
        return NetworkToIndexerAPI[this.network];
      case EndlessApiType.PROVER:
        if (this.prover !== undefined) return this.prover;
        if (this.network === Network.CUSTOM) throw new Error("Please provide a custom prover service url");
        return NetworkToProverAPI[this.network];
      case EndlessApiType.INDEXERV2:
        if (this.indexerV2 !== undefined) return this.indexerV2;
        if (this.network === Network.CUSTOM) throw new Error("Please provide a custom indexerv2 url");
        return NetworkToIndexerAPIV2[this.network];
      default:
        throw Error(`apiType ${apiType} is not supported`);
    }
  }
}
