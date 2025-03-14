import { EndlessConfig } from "../api/endlessConfig";
import { endlessRequest } from "./core";
import { EndlessResponse } from "./types";
import { AnyNumber, ClientConfig, MimeType } from "../types";
import { EndlessApiType } from "../utils/const";

export type GetRequestOptions = {
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
   * Specific client overrides for this request to override endlessConfig
   */
  overrides?: ClientConfig;
};

export type GetEndlessRequestOptions = Omit<GetRequestOptions, "type">;

/**
 * Main function to do a Get request
 *
 * @param options GetRequestOptions
 * @returns
 */
export async function get<Req extends {}, Res extends {}>(
  options: GetRequestOptions,
): Promise<EndlessResponse<Req, Res>> {
  const { endlessConfig, overrides, params, contentType, acceptType, path, originMethod, type } = options;
  const url = endlessConfig.getRequestUrl(type);

  return endlessRequest<Req, Res>(
    {
      url,
      method: "GET",
      originMethod,
      path,
      contentType,
      acceptType,
      params,
      overrides: {
        ...endlessConfig.clientConfig,
        ...overrides,
      },
    },
    endlessConfig,
    options.type,
  );
}

export async function getEndlessFullNode<Req extends {}, Res extends {}>(
  options: GetEndlessRequestOptions,
): Promise<EndlessResponse<Req, Res>> {
  const { endlessConfig } = options;

  return get<Req, Res>({
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

export async function getEndlessIndexer<Req extends {}, Res extends {}>(
  options: GetEndlessRequestOptions,
): Promise<EndlessResponse<Req, Res>> {
  const { endlessConfig } = options;

  return get<Req, Res>({
    ...options,
    type: EndlessApiType.INDEXER,
    overrides: {
      ...endlessConfig.clientConfig,
      ...endlessConfig.indexerConfig,
      HEADERS: { ...endlessConfig.clientConfig?.HEADERS, ...endlessConfig.indexerConfig?.HEADERS },
    },
  });
}

/// This function is a helper for paginating using a function wrapping an API
export async function paginateWithCursor<Req extends Record<string, any>, Res extends Array<{}>>(
  options: GetEndlessRequestOptions,
): Promise<Res> {
  const out: any[] = [];
  let cursor: string | undefined;
  const requestParams = options.params as { start?: string; limit?: number };
  do {
    // eslint-disable-next-line no-await-in-loop
    const response = await get<Req, Res>({
      type: EndlessApiType.FULLNODE,
      endlessConfig: options.endlessConfig,
      originMethod: options.originMethod,
      path: options.path,
      params: requestParams,
      overrides: options.overrides,
    });
    /**
     * the cursor is a "state key" from the API perspective. Client
     * should not need to "care" what it represents but just use it
     * to query the next chunk of data.
     */
    cursor = response.headers["x-endless-cursor"];
    // Now that we have the cursor (if any), we remove the headers before
    // adding these to the output of this function.
    delete response.headers;
    out.push(...response.data);
    requestParams.start = cursor;
  } while (cursor !== null && cursor !== undefined);
  return out as Res;
}
