// Copyright © Endless
// Copyright © Aptos Foundation
// SPDX-License-Identifier: Apache-2.0

import { EndlessConfig } from "../api/endlessConfig";
import { endlessRequest } from "./core";
import { EndlessResponse } from "./types";
import { AnyNumber, ClientConfig, MimeType } from "../types";
import { EndlessApiType } from "../utils/const";

export type PostRequestOptions = {
  /**
   * The config for the API client
   */
  endlessConfig: EndlessConfig;
  /**
   * The type of API endpoint to call e.g. fullnode, indexer, etc
   */
  type: EndlessApiType;
  /**
   * The name of the API method
   */
  originMethod: string;
  /**
   * The URL path to the API method
   */
  path: string;
  /**
   * The content type of the request body
   */
  contentType?: MimeType;
  /**
   * The accepted content type of the response of the API
   */
  acceptType?: MimeType;
  /**
   * The query parameters for the request
   */
  params?: Record<string, string | AnyNumber | boolean | undefined>;
  /**
   * The body of the request, should match the content type of the request
   */
  body?: any;
  /**
   * Specific client overrides for this request to override endlessConfig
   */
  overrides?: ClientConfig;
};

export type PostEndlessRequestOptions = Omit<PostRequestOptions, "type">;

/**
 * Main function to do a Post request
 *
 * @param options PostRequestOptions
 * @returns
 */
export async function post<Req extends {}, Res extends {}>(
  options: PostRequestOptions,
): Promise<EndlessResponse<Req, Res>> {
  const { type, originMethod, path, body, acceptType, contentType, params, endlessConfig, overrides } = options;
  const url = endlessConfig.getRequestUrl(type);

  return endlessRequest<Req, Res>(
    {
      url,
      method: "POST",
      originMethod,
      path,
      body,
      contentType,
      acceptType,
      params,
      overrides,
    },
    endlessConfig,
    options.type,
  );
}

export async function postEndlessFullNode<Req extends {}, Res extends {}>(
  options: PostEndlessRequestOptions,
): Promise<EndlessResponse<Req, Res>> {
  const { endlessConfig } = options;

  return post<Req, Res>({
    ...options,
    type: EndlessApiType.FULLNODE,
    overrides: {
      ...endlessConfig.clientConfig,
      ...endlessConfig.fullnodeConfig,
      ...options.overrides,
      HEADERS: { ...endlessConfig.clientConfig?.HEADERS, ...endlessConfig.fullnodeConfig?.HEADERS },
    },
  });
}

export async function postEndlessIndexer<Req extends {}, Res extends {}>(
  options: PostEndlessRequestOptions,
): Promise<EndlessResponse<Req, Res>> {
  const { endlessConfig } = options;

  return post<Req, Res>({
    ...options,
    type: EndlessApiType.INDEXER,
    overrides: {
      ...endlessConfig.clientConfig,
      ...endlessConfig.indexerConfig,
      ...options.overrides,
      HEADERS: { ...endlessConfig.clientConfig?.HEADERS, ...endlessConfig.indexerConfig?.HEADERS },
    },
  });
}

export async function postEndlessFaucet<Req extends {}, Res extends {}>(
  options: PostEndlessRequestOptions,
): Promise<EndlessResponse<Req, Res>> {
  const { endlessConfig } = options;
  // Faucet does not support API_KEY
  // Create a new object with the desired modification
  const modifiedEndlessConfig = {
    ...endlessConfig,
    clientConfig: { ...endlessConfig.clientConfig },
  };
  // Delete API_KEY config
  delete modifiedEndlessConfig?.clientConfig?.API_KEY;

  return post<Req, Res>({
    ...options,
    type: EndlessApiType.FAUCET,
    overrides: {
      ...modifiedEndlessConfig.clientConfig,
      ...options.overrides,
      HEADERS: { ...modifiedEndlessConfig.clientConfig?.HEADERS },
    },
  });
}

/**
 * Makes a post request to the pepper service
 *
 * @param options GetEndlessRequestOptions
 * @returns EndlessResponse
 */
export async function postEndlessPepperService<Req extends {}, Res extends {}>(
  options: PostEndlessRequestOptions,
): Promise<EndlessResponse<Req, Res>> {
  return post<Req, Res>({ ...options, type: EndlessApiType.PEPPER });
}

export async function postEndlessProvingService<Req extends {}, Res extends {}>(
  options: PostEndlessRequestOptions,
): Promise<EndlessResponse<Req, Res>> {
  return post<Req, Res>({ ...options, type: EndlessApiType.PROVER });
}
