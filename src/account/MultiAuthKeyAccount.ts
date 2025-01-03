// Copyright © Endless
// Copyright © Aptos Foundation
// SPDX-License-Identifier: Apache-2.0

import { Account } from "./Account";
import { AccountAddress } from "../core/accountAddress";
import { HexInput, SigningScheme } from "../types";
import { AccountAuthenticatorMultiAuthKey } from "../transactions/authenticator/account";
import { AnyRawTransaction } from "../transactions/types";
import { KeylessAccount } from "./KeylessAccount";
import { MultiAuthKeyPublicKey, MultiAuthKeySignature } from "../core/crypto/multiAuthKey";

export interface VerifyMultiAuthKeySignatureArgs {
  message: HexInput;
  signature: MultiAuthKeySignature;
}

/**
 * Signer implementation for the MultiKey authentication scheme.
 *
 * This accounts to use a M of N signing scheme. M and N are specified in the {@link MultiKey}
 * It signs messages via the array of M number of Accounts that individually correspond to a public key in the {@link MultiKey}.
 *
 * Note: Generating a signer instance does not create the account on-chain.
 */
export class MultiAuthKeyAccount implements Account {

  readonly publicKey: MultiAuthKeyPublicKey;

  /**
   * Account address associated with the account
   */
  readonly accountAddress: AccountAddress;

  /**
   * Signing scheme used to sign transactions
   */
  readonly signingScheme: SigningScheme;

  /**
   * The signers used to sign messages.  These signers should correspond to public keys in the
   * MultiKeyAccount's public key.  The number of signers should be equal or greater
   * than this.publicKey.signaturesRequired
   */
  readonly signers: Account[];

  constructor(args: { sender: AccountAddress; signers: Account[] }) {
    const { sender, signers } = args;

    this.accountAddress = sender;
    this.signingScheme = SigningScheme.MultiAuthKey;
    this.publicKey = new MultiAuthKeyPublicKey({ publicKeys: signers.map((signer) => signer.publicKey) });

    this.signers = signers;
  }

  static isMultiKeySigner(account: Account): account is MultiAuthKeyAccount {
    return account instanceof MultiAuthKeyAccount;
  }

  /**
   * Sign a message using the account's signers.
   * @param message the signing message, as binary input
   * @return the AccountAuthenticator containing the signature, together with the account's public key
   */
  signWithAuthenticator(message: HexInput): AccountAuthenticatorMultiAuthKey {
    return new AccountAuthenticatorMultiAuthKey(this.publicKey, this.sign(message));
  }

  /**
   * Sign a transaction using the account's signers.
   * @param transaction the raw transaction
   * @return the AccountAuthenticator containing the signature of the transaction, together with the account's public key
   */
  signTransactionWithAuthenticator(transaction: AnyRawTransaction): AccountAuthenticatorMultiAuthKey {
    return new AccountAuthenticatorMultiAuthKey(this.publicKey, this.signTransaction(transaction));
  }

  /**
  * Waits for any proofs on any KeylessAccount signers to be fetched. If the proof is fetched a syncronously, call this
  * to ensure signing with the KeylessAccount does not fail as the proof must be ready.
  * @return
  */
  async waitForProofFetch() {
    const keylessSigners = this.signers.filter((signer) => signer instanceof KeylessAccount) as KeylessAccount[];
    const promises = keylessSigners.map(async (signer) => signer.waitForProofFetch());
    await Promise.all(promises);
  }

  /**
   * Sign the given message using the MultiKeyAccount's signers
   * @param message in HexInput format
   * @returns MultiKeySignature
   */
  sign(data: HexInput): MultiAuthKeySignature {
    const signatures = [];
    for (const signer of this.signers) {
      signatures.push(signer.sign(data));
    }
    return new MultiAuthKeySignature({ signatures });
  }

  /**
   * Sign the given transaction using the MultiKeyAccount's signers
   * @param transaction the transaction to be signed
   * @returns MultiKeySignature
   */
  signTransaction(transaction: AnyRawTransaction): MultiAuthKeySignature {
    const signatures = [];
    for (const signer of this.signers) {
      signatures.push(signer.signTransaction(transaction));
    }
    return new MultiAuthKeySignature({ signatures });
  }

  /**
   * Verify the given message and signature with the public key.
   *
   * @param args.message raw message data in HexInput format
   * @param args.signatures signed message MultiKeySignature
   * @returns boolean
   */
  verifySignature(args: VerifyMultiAuthKeySignatureArgs): boolean {
    const { message, signature } = args;
    if (signature.signatures.length !== this.publicKey.publicKeys.length) {
      return false;
    }
    for (let i = 0; i < signature.signatures.length; i += 1) {
      const singleSignature = signature.signatures[i];
      const publicKey = this.publicKey.publicKeys[i];
      if (!publicKey.verifySignature({ message, signature: singleSignature })) {
        return false;
      }
    }
    return true;
  }
}
