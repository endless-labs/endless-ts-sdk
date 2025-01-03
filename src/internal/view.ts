// Copyright © Endless
// Copyright © Aptos Foundation
// SPDX-License-Identifier: Apache-2.0

import { LedgerVersionArg, MimeType, MoveValue } from "../types";
import { EndlessConfig } from "../api/endlessConfig";
import { generateViewFunctionPayload, InputViewFunctionData } from "../transactions";
import { Serializer } from "../bcs";
import { postEndlessFullNode } from "../client";

export async function view<T extends Array<MoveValue> = Array<MoveValue>>(args: {
  endlessConfig: EndlessConfig;
  payload: InputViewFunctionData;
  options?: LedgerVersionArg;
}): Promise<T> {
  const { endlessConfig, payload, options } = args;
  const viewFunctionPayload = await generateViewFunctionPayload({
    ...payload,
    endlessConfig,
  });

  const serializer = new Serializer();
  viewFunctionPayload.serialize(serializer);
  const bytes = serializer.toUint8Array();

  const { data } = await postEndlessFullNode<Uint8Array, MoveValue[]>({
    endlessConfig,
    path: "view",
    originMethod: "view",
    contentType: MimeType.BCS_VIEW_FUNCTION,
    params: { ledger_version: options?.ledgerVersion },
    body: bytes,
  });

  return data as T;
}
