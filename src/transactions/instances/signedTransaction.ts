// Copyright © Endless
// Copyright © Aptos Foundation
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable @typescript-eslint/naming-convention */

import { TransactionAuthenticator } from "../authenticator/transaction";
import { Deserializer } from "../../bcs/deserializer";
import { Serializable, Serializer } from "../../bcs/serializer";
import { RawTransaction } from "./rawTransaction";

export class SignedTransaction extends Serializable {
  public readonly raw_txn: RawTransaction;

  public readonly authenticator: TransactionAuthenticator;

  /**
   * A SignedTransaction consists of a raw transaction and an authenticator. The authenticator
   * contains a client's public key and the signature of the raw transaction.
   *
   * @see {@link https://endless.dev/integration/creating-a-signed-transaction | Creating a Signed Transaction}
   *
   * @param raw_txn
   * @param authenticator Contains a client's public key and the signature of the raw transaction.
   * Authenticator has 3 flavors: single signature, multi-signature and multi-agent.
   * @see {@link https://github.com/endless-labs/endless-core/blob/main/types/src/transaction/authenticator.rs} for details.
   */
  constructor(raw_txn: RawTransaction, authenticator: TransactionAuthenticator) {
    super();
    this.raw_txn = raw_txn;
    this.authenticator = authenticator;
  }

  serialize(serializer: Serializer): void {
    this.raw_txn.serialize(serializer);
    this.authenticator.serialize(serializer);
  }

  static deserialize(deserializer: Deserializer): SignedTransaction {
    const raw_txn = RawTransaction.deserialize(deserializer);
    const authenticator = TransactionAuthenticator.deserialize(deserializer);
    return new SignedTransaction(raw_txn, authenticator);
  }
}
