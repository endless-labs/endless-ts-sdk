// Copyright © Endless
// Copyright © Aptos Foundation
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable @typescript-eslint/naming-convention */

import { Serializer, Deserializer, Serializable } from "../../bcs";
import { AccountAddress } from "../../core";
import { AnyPublicKey, AnySignature } from "../../core/crypto";
import { Bls12381PublicKey, Bls12381Signature } from "../../core/crypto/bls12381";
import { Ed25519PublicKey, Ed25519Signature } from "../../core/crypto/ed25519";
import { MultiAuthKeyPublicKey, MultiAuthKeySignature } from "../../core/crypto/multiAuthKey";
import { MultiEd25519PublicKey, MultiEd25519Signature } from "../../core/crypto/multiEd25519";
import { MultiKey, MultiKeySignature } from "../../core/crypto/multiKey";
import { AccountAuthenticatorVariant } from "../../types";

export abstract class AccountAuthenticator extends Serializable {
  abstract serialize(serializer: Serializer): void;

  static deserialize(deserializer: Deserializer): AccountAuthenticator {
    const index = deserializer.deserializeUleb128AsU32();
    switch (index) {
      case AccountAuthenticatorVariant.Ed25519:
        return AccountAuthenticatorEd25519.load(deserializer);
      case AccountAuthenticatorVariant.MultiEd25519:
        return AccountAuthenticatorMultiEd25519.load(deserializer);
      case AccountAuthenticatorVariant.SingleKey:
        return AccountAuthenticatorSingleKey.load(deserializer);
      case AccountAuthenticatorVariant.MultiKey:
        return AccountAuthenticatorMultiKey.load(deserializer);
      case AccountAuthenticatorVariant.MultiAuthKey:
        return AccountAuthenticatorMultiAuthKey.load(deserializer);
      case AccountAuthenticatorVariant.Bls12381:
        return AccountAuthenticatorBls12381.load(deserializer);
      case AccountAuthenticatorVariant.Mock:
        return AccountAuthenticatorMock.load(deserializer);
      default:
        throw new Error(`Unknown variant index for AccountAuthenticator: ${index}`);
    }
  }

  isEd25519(): this is AccountAuthenticatorEd25519 {
    return this instanceof AccountAuthenticatorEd25519;
  }

  isMultiEd25519(): this is AccountAuthenticatorMultiEd25519 {
    return this instanceof AccountAuthenticatorMultiEd25519;
  }

  isSingleKey(): this is AccountAuthenticatorSingleKey {
    return this instanceof AccountAuthenticatorSingleKey;
  }

  isMultiKey(): this is AccountAuthenticatorMultiKey {
    return this instanceof AccountAuthenticatorMultiKey;
  }

  isMultAuthKey(): this is AccountAuthenticatorMultiAuthKey {
    return this instanceof AccountAuthenticatorMultiAuthKey;
  }
}

/**
 * Transaction authenticator Ed25519 for a multi signer transaction
 *
 * @param public_key Account's Ed25519 public key.
 * @param signature Account's Ed25519 signature
 *
 */
export class AccountAuthenticatorEd25519 extends AccountAuthenticator {
  public readonly public_key: Ed25519PublicKey;

  public readonly signature: Ed25519Signature;

  constructor(public_key: Ed25519PublicKey, signature: Ed25519Signature) {
    super();
    this.public_key = public_key;
    this.signature = signature;
  }

  serialize(serializer: Serializer): void {
    serializer.serializeU32AsUleb128(AccountAuthenticatorVariant.Ed25519);
    this.public_key.serialize(serializer);
    this.signature.serialize(serializer);
  }

  static load(deserializer: Deserializer): AccountAuthenticatorEd25519 {
    const public_key = Ed25519PublicKey.deserialize(deserializer);
    const signature = Ed25519Signature.deserialize(deserializer);
    return new AccountAuthenticatorEd25519(public_key, signature);
  }
}

/**
 * Transaction authenticator Multi Ed25519 for a multi signers transaction
 *
 * @param public_key Account's MultiEd25519 public key.
 * @param signature Account's MultiEd25519 signature
 *
 */
export class AccountAuthenticatorMultiEd25519 extends AccountAuthenticator {
  public readonly public_key: MultiEd25519PublicKey;

  public readonly signature: MultiEd25519Signature;

  constructor(public_key: MultiEd25519PublicKey, signature: MultiEd25519Signature) {
    super();
    this.public_key = public_key;
    this.signature = signature;
  }

  serialize(serializer: Serializer): void {
    serializer.serializeU32AsUleb128(AccountAuthenticatorVariant.MultiEd25519);
    this.public_key.serialize(serializer);
    this.signature.serialize(serializer);
  }

  static load(deserializer: Deserializer): AccountAuthenticatorMultiEd25519 {
    const public_key = MultiEd25519PublicKey.deserialize(deserializer);
    const signature = MultiEd25519Signature.deserialize(deserializer);
    return new AccountAuthenticatorMultiEd25519(public_key, signature);
  }
}

/**
 * AccountAuthenticatorSingleKey for a single signer
 *
 * @param public_key AnyPublicKey
 * @param signature AnySignature
 *
 */
export class AccountAuthenticatorSingleKey extends AccountAuthenticator {
  public readonly public_key: AnyPublicKey;

  public readonly signature: AnySignature;

  constructor(public_key: AnyPublicKey, signature: AnySignature) {
    super();
    this.public_key = public_key;
    this.signature = signature;
  }

  serialize(serializer: Serializer): void {
    serializer.serializeU32AsUleb128(AccountAuthenticatorVariant.SingleKey);
    this.public_key.serialize(serializer);
    this.signature.serialize(serializer);
  }

  static load(deserializer: Deserializer): AccountAuthenticatorSingleKey {
    const public_key = AnyPublicKey.deserialize(deserializer);
    const signature = AnySignature.deserialize(deserializer);
    return new AccountAuthenticatorSingleKey(public_key, signature);
  }
}

/**
 * AccountAuthenticatorMultiKey for a multi signer
 *
 * @param public_keys MultiKey
 * @param signatures Signature
 *
 */
export class AccountAuthenticatorMultiKey extends AccountAuthenticator {
  public readonly public_keys: MultiKey;

  public readonly signatures: MultiKeySignature;

  constructor(public_keys: MultiKey, signatures: MultiKeySignature) {
    super();
    this.public_keys = public_keys;
    this.signatures = signatures;
  }

  serialize(serializer: Serializer): void {
    serializer.serializeU32AsUleb128(AccountAuthenticatorVariant.MultiKey);
    this.public_keys.serialize(serializer);
    this.signatures.serialize(serializer);
  }

  static load(deserializer: Deserializer): AccountAuthenticatorMultiKey {
    const public_keys = MultiKey.deserialize(deserializer);
    const signatures = MultiKeySignature.deserialize(deserializer);
    return new AccountAuthenticatorMultiKey(public_keys, signatures);
  }
}

export class AccountAuthenticatorMultiAuthKey extends AccountAuthenticator {
  public readonly public_key: MultiAuthKeyPublicKey;

  public readonly signature: MultiAuthKeySignature;

  constructor(public_key: MultiAuthKeyPublicKey, signature: MultiAuthKeySignature) {
    super();
    this.public_key = public_key;
    this.signature = signature;
  }

  serialize(serializer: Serializer): void {
    serializer.serializeU32AsUleb128(AccountAuthenticatorVariant.MultiAuthKey);
    this.public_key.serialize(serializer);
    this.signature.serialize(serializer);
  }

  static load(deserializer: Deserializer): AccountAuthenticatorMultiAuthKey {
    const public_key = MultiAuthKeyPublicKey.deserialize(deserializer);
    const signature = MultiAuthKeySignature.deserialize(deserializer);
    return new AccountAuthenticatorMultiAuthKey(public_key, signature);
  }
}

export class AccountAuthenticatorBls12381 extends AccountAuthenticator {
  public readonly public_key: Bls12381PublicKey;

  public readonly signature: Bls12381Signature;

  constructor(public_key: Bls12381PublicKey, signature: Bls12381Signature) {
    super();
    this.public_key = public_key;
    this.signature = signature;
  }

  serialize(serializer: Serializer): void {
    serializer.serializeU32AsUleb128(AccountAuthenticatorVariant.Bls12381);
    this.public_key.serialize(serializer);
    this.signature.serialize(serializer);
  }

  static load(deserializer: Deserializer): AccountAuthenticatorBls12381 {
    const public_key = Bls12381PublicKey.deserialize(deserializer);
    const signature = Bls12381Signature.deserialize(deserializer);
    return new AccountAuthenticatorBls12381(public_key, signature);
  }
}

export class AccountAuthenticatorMock extends AccountAuthenticator {
  public readonly authenticator: AccountAddress;

  constructor(authenticator: AccountAddress) {
    super();
    this.authenticator = authenticator
  }

  serialize(serializer: Serializer): void {
    serializer.serializeU32AsUleb128(AccountAuthenticatorVariant.Mock);
    this.authenticator.serialize(serializer)
  }

  static load(deserializer: Deserializer): AccountAuthenticatorMock {
    const authenticator = AccountAddress.deserialize(deserializer);
    return new AccountAuthenticatorMock(authenticator);
  }
}