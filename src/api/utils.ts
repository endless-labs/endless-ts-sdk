import { sha3_256 } from "@noble/hashes/sha3";
import { waitForIndexer } from "../internal/transaction";
import { ProcessorType } from "../utils";
import { EndlessConfig } from "./endlessConfig";
import { AnyNumber, UserTransactionResponse } from "../types";
import { Serializer } from "../bcs";
import { AccountAddress } from "../core";

/**
 * Utility function to handle optional waiting on indexer for APIs
 *
 * This is purposely placed here to not expose this internal function.
 * @param args
 */
export async function waitForIndexerOnVersion(args: {
  config: EndlessConfig;
  minimumLedgerVersion?: AnyNumber;
  processorType: ProcessorType;
}) {
  if (args.minimumLedgerVersion !== undefined) {
    await waitForIndexer({
      endlessConfig: args.config,
      minimumLedgerVersion: args.minimumLedgerVersion,
      processorType: args.processorType,
    });
  }
}

export function getPaymentChecksum(simulateResult: UserTransactionResponse): Uint8Array {
  const { sender, events } = simulateResult;
  const withdrawEvents = events.filter(evt => (
    evt.type === "0x1::fungible_asset::Withdraw"
    && evt.data.owner === sender
  )).map(evt => {
    const { amount, store } = evt.data;
    const serializer = new Serializer(32 + 16);
    AccountAddress.from(store).serialize(serializer);
    serializer.serializeU128(BigInt(amount));
    return serializer.toUint8Array();
  });
  const serializer = new Serializer();
  serializer.serializeU32AsUleb128(withdrawEvents.length);
  withdrawEvents.forEach(withdrawEvent => serializer.serializeFixedBytes(withdrawEvent));
  return sha3_256(serializer.toUint8Array());
}
