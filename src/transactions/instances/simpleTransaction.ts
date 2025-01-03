// Copyright © Endless
// Copyright © Aptos Foundation
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable @typescript-eslint/naming-convention */

import { Deserializer } from "../../bcs/deserializer";
import { Serializable, Serializer } from "../../bcs/serializer";
import { AccountAddress } from "../../core";
import { RawTransaction } from "./rawTransaction";
import { TransactionPayloadEntryFunction, TransactionPayloadScript } from "./transactionPayload";

/**
 * Representation of a SimpleTransaction that can serialized and deserialized
 */
export class SimpleTransaction extends Serializable {
  public rawTransaction: RawTransaction;

  public feePayerAddress?: AccountAddress | undefined;

  // We dont really need it, we add it for type checkings we do
  // throughout the SDK
  public readonly secondarySignerAddresses: undefined;

  /**
   * SimpleTransaction represents a simple transaction type of a single signer that
   * can be submitted to Endless chain for execution.
   *
   * SimpleTransaction metadata contains the Raw Transaction and an optional
   * sponsor Account Address to pay the gas fees.
   *
   * @param rawTransaction The Raw Tranasaction
   * @param feePayerAddress The sponsor Account Address
   */
  constructor(rawTransaction: RawTransaction, feePayerAddress?: AccountAddress) {
    super();
    this.rawTransaction = rawTransaction;
    this.feePayerAddress = feePayerAddress;
  }

  serialize(serializer: Serializer): void {
    this.rawTransaction.serialize(serializer);

    if (this.feePayerAddress === undefined) {
      serializer.serializeBool(false);
    } else {
      serializer.serializeBool(true);
      this.feePayerAddress.serialize(serializer);
    }
  }

  static deserialize(deserializer: Deserializer): SimpleTransaction {
    const rawTransaction = RawTransaction.deserialize(deserializer);
    const feepayerPresent = deserializer.deserializeBool();
    let feePayerAddress;
    if (feepayerPresent) {
      feePayerAddress = AccountAddress.deserialize(deserializer);
    }

    return new SimpleTransaction(rawTransaction, feePayerAddress);
  }

  upgradeToSafe(checksum: Uint8Array) {
    if (this.rawTransaction.payload instanceof TransactionPayloadScript
      || this.rawTransaction.payload instanceof TransactionPayloadEntryFunction) {
      this.rawTransaction.payload.paymentChecksum = checksum;
    }
  }
}
