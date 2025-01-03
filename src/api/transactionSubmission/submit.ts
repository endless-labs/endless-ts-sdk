// Copyright © Endless
// Copyright © Aptos Foundation
// SPDX-License-Identifier: Apache-2.0

import { MultiAuthKeyPublicKey, MultiAuthKeySignature, PublicKey, Signature } from "../../core";
import { submitTransaction } from "../../internal/transactionSubmission";
import { AccountAuthenticator, AccountAuthenticatorMultiAuthKey, AnyRawTransaction } from "../../transactions";
import { PendingTransactionResponse } from "../../types";
import { EndlessConfig } from "../endlessConfig";
import { ValidateFeePayerDataOnSubmission } from "./helpers";

/**
 * A class to handle all `Submit` transaction operations
 */
export class Submit {
  readonly config: EndlessConfig;

  constructor(config: EndlessConfig) {
    this.config = config;
  }

  /**
   * Submit a simple transaction
   *
   * @param args.transaction An instance of a raw transaction
   * @param args.senderAuthenticator optional. The sender account authenticator
   * @param args.feePayerAuthenticator optional. The fee payer account authenticator if it is a fee payer transaction
   *
   * @returns PendingTransactionResponse
   */
  @ValidateFeePayerDataOnSubmission
  async simple(args: {
    transaction: AnyRawTransaction;
    senderAuthenticator: AccountAuthenticator;
    feePayerAuthenticator?: AccountAuthenticator;
  }): Promise<PendingTransactionResponse> {
    return submitTransaction({ endlessConfig: this.config, ...args });
  }

  /**
   * Submit a multi agent transaction
   *
   * @param args.transaction An instance of a raw transaction
   * @param args.senderAuthenticator optional. The sender account authenticator
   * @param args.additionalSignersAuthenticators An array of the secondary signers account authenticators
   * @param args.feePayerAuthenticator optional. The fee payer account authenticator if it is a fee payer transaction
   *
   * @returns PendingTransactionResponse
   */
  @ValidateFeePayerDataOnSubmission
  async multiAgent(args: {
    transaction: AnyRawTransaction;
    senderAuthenticator: AccountAuthenticator;
    additionalSignersAuthenticators: Array<AccountAuthenticator>;
    feePayerAuthenticator?: AccountAuthenticator;
  }): Promise<PendingTransactionResponse> {
    return submitTransaction({ endlessConfig: this.config, ...args });
  }

  /**
   * Submit a multi auth key transaction
   *
   * @param args.transaction An instance of a raw transaction
   * @param args.publicKeys An array of the signers public key
   * @param args.signatures An array of the signature
   *
   * @returns PendingTransactionResponse
   */
  @ValidateFeePayerDataOnSubmission
  async multiAuthKey(args: {
    transaction: AnyRawTransaction;
    publicKeys: Array<PublicKey>;
    signatures: Array<Signature>;
  }): Promise<PendingTransactionResponse> {
    const { transaction, publicKeys, signatures } = args;
    const senderAuthenticator = new AccountAuthenticatorMultiAuthKey(
      new MultiAuthKeyPublicKey({ publicKeys }),
      new MultiAuthKeySignature({ signatures })
    );
    return submitTransaction({ endlessConfig: this.config, transaction, senderAuthenticator });
  }
}
