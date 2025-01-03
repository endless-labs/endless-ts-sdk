// Copyright © Endless
// Copyright © Aptos Foundation
// SPDX-License-Identifier: Apache-2.0

import { EndlessConfig } from "../api/endlessConfig";
import { EndlessApiError, EndlessResponse } from "./types";
import { VERSION } from "../version";
import { AnyNumber, EndlessRequest, Client, ClientRequest, ClientResponse, MimeType } from "../types";
import { EndlessApiType } from "../utils";

/**
 * Meaningful errors map
 */
const errors: Record<number, string> = {
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
  429: "Too Many Requests",
  500: "Internal Server Error",
  502: "Bad Gateway",
  503: "Service Unavailable",
};

/**
 * Given a url and method, sends the request with axios and
 * returns the response.
 */
export async function request<Req, Res>(options: ClientRequest<Req>, client: Client): Promise<ClientResponse<Res>> {
  const { url, method, body, contentType, params, overrides, originMethod } = options;
  const headers: Record<string, string | AnyNumber | boolean | undefined> = {
    ...overrides?.HEADERS,
    "x-endless-client": `endless-typescript-sdk/${VERSION}`,
    "content-type": contentType ?? MimeType.JSON,
    "x-endless-typescript-sdk-origin-method": originMethod,
  };
  if (overrides?.API_KEY) {
    headers.Authorization = `Bearer ${overrides?.API_KEY}`;
  }

  /*
   * make a call using the @endless-labs/endless-client package
   * {@link https://www.npmjs.com/package/@endless-labs/endless-client}
   */
  return client.provider<Req, Res>({
    url,
    method,
    body,
    params,
    headers,
    overrides,
  });
}

/**
 * The main function to use when doing an API request.
 *
 * @param options EndlessRequest
 * @param endlessConfig The config information for the SDK client instance
 * @returns the response or EndlessApiError
 */
export async function endlessRequest<Req extends {}, Res extends {}>(
  options: EndlessRequest,
  endlessConfig: EndlessConfig,
  apiType: EndlessApiType,
): Promise<EndlessResponse<Req, Res>> {
  const { url, path } = options;
  const fullUrl = path ? `${url}/${path}` : url;
  const response = await request<Req, Res>({ ...options, url: fullUrl }, endlessConfig.client);

  const result: EndlessResponse<Req, Res> = {
    status: response.status,
    statusText: response.statusText!,
    data: response.data,
    headers: response.headers,
    config: response.config,
    request: response.request,
    url: fullUrl,
  };

  // Handle case for `Unauthorized` error (i.e API_KEY error)
  if (result.status === 401) {
    throw new EndlessApiError(options, result, `Error: ${result.data}`);
  }

  // to support both fullnode and indexer responses,
  // check if it is an indexer query, and adjust response.data
  if (apiType === EndlessApiType.INDEXER) {
    const indexerResponse = result.data as any;
    // Handle Indexer general errors
    if (indexerResponse.errors) {
      throw new EndlessApiError(
        options,
        result,
        indexerResponse.errors?.[0]?.message
          ? `Indexer error: ${indexerResponse.errors[0].message}`
          : `Indexer unhandled Error ${response.status} : ${response.statusText}`,
      );
    }
    result.data = indexerResponse as Res;
  }

  if (result.status >= 200 && result.status < 300) {
    return result;
  }

  let errorMessage: string;

  if (result && result.data && "message" in result.data && "error_code" in result.data) {
    errorMessage = JSON.stringify(result.data);
  } else if (result.status in errors) {
    // If it's not an API type, it must come form infra, these are prehandled
    errorMessage = errors[result.status];
  } else {
    // Everything else is unhandled
    errorMessage = `Unhandled Error ${result.status} : ${result.statusText}`;
  }

  // We have to explicitly check for all request types, because if the error is a non-indexer error, but
  // comes from an indexer request (e.g. 404), we'll need to mention it appropriately
  throw new EndlessApiError(options, result, `${apiType} error: ${errorMessage}`);
}
