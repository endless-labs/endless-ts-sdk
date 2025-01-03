// Copyright © Endless
// Copyright © Aptos Foundation
// SPDX-License-Identifier: Apache-2.0

import { EndlessRequest } from "../types";

/**
 * The API response type
 *
 * @param status - the response status. i.e. 200
 * @param statusText - the response message
 * @param data the response data
 * @param url the url the request was made to
 * @param headers the response headers
 * @param config (optional) - the request object
 * @param request (optional) - the request object
 */
export interface EndlessResponse<Req, Res> {
  status: number;
  statusText: string;
  data: Res;
  url: string;
  headers: any;
  config?: any;
  request?: Req;
}

/**
 * The type returned from an API error
 *
 * @param name - the error name "EndlessApiError"
 * @param url the url the request was made to
 * @param status - the response status. i.e. 400
 * @param statusText - the response message
 * @param data the response data
 * @param request - the EndlessRequest
 */
export class EndlessApiError extends Error {
  readonly url: string;

  readonly status: number;

  readonly statusText: string;

  readonly data: any;

  readonly request: EndlessRequest;

  constructor(request: EndlessRequest, response: EndlessResponse<any, any>, message: string) {
    super(message);

    this.name = "EndlessApiError";
    this.url = response.url;
    this.status = response.status;
    this.statusText = response.statusText;
    this.data = response.data;
    this.request = request;
  }
}
