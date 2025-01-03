// Copyright © Endless
// Copyright © Aptos Foundation
// SPDX-License-Identifier: Apache-2.0

import { bls12_381 as bls } from "@noble/curves/bls12-381";
import { Deserializer } from "../../bcs/deserializer";
import { Serializable, Serializer } from "../../bcs/serializer";
import { AuthenticationKey } from "../authenticationKey";
import { Hex } from "../hex";
import { HexInput, SigningScheme as AuthenticationKeyScheme } from "../../types";
import { PrivateKey } from "./privateKey";
import { AccountPublicKey, VerifySignatureArgs } from "./publicKey";
import { Signature } from "./signature";
import { convertSigningMessage } from "./utils";

export class Bls12381PublicKey extends AccountPublicKey {
  /**
   * Length of an Bls12381 public key
   */
  static readonly LENGTH: number = 48;

  /**
   * Bytes of the public key
   * @private
   */
  private readonly key: Hex;

  /**
   * Create a new PublicKey instance from a Uint8Array or String.
   *
   * @param hexInput A HexInput (string or Uint8Array)
   */
  constructor(hexInput: HexInput) {
    super();

    const hex = Hex.fromHexInput(hexInput);
    if (hex.toUint8Array().length !== Bls12381PublicKey.LENGTH) {
      throw new Error(`PublicKey length should be ${Bls12381PublicKey.LENGTH}`);
    }
    this.key = hex;
  }

  // region AccountPublicKey

  /**
   * Verifies a signed data with a public key
   * @param args.message a signed message as a Hex string or Uint8Array
   * @param args.signature the signature of the message
   */
  verifySignature(args: VerifySignatureArgs): boolean {
    const { message, signature } = args;
    if (!(signature instanceof Bls12381Signature)) {
      return false;
    }
    const messageToVerify = convertSigningMessage(message);
    const messageBytes = Hex.fromHexInput(messageToVerify).toUint8Array();
    const signatureBytes = signature.toUint8Array();
    const publicKeyBytes = this.key.toUint8Array();

    return bls.verify(signatureBytes, messageBytes, publicKeyBytes);
  }

  authKey(): AuthenticationKey {
    return AuthenticationKey.fromSchemeAndBytes({
      scheme: AuthenticationKeyScheme.Bls12381,
      input: this.toUint8Array(),
    });
  }

  /**
   * Get the public key in bytes (Uint8Array).
   *
   * @returns Uint8Array representation of the public key
   */
  toUint8Array(): Uint8Array {
    return this.key.toUint8Array();
  }

  // endregion

  // region Serializable

  serialize(serializer: Serializer): void {
    serializer.serializeBytes(this.key.toUint8Array());
  }

  static deserialize(deserializer: Deserializer): Bls12381PublicKey {
    const bytes = deserializer.deserializeBytes();
    return new Bls12381PublicKey(bytes);
  }

  // endregion

  /**
   * @deprecated use `instanceof Ed25519PublicKey` instead.
   */
  static isPublicKey(publicKey: AccountPublicKey): publicKey is Bls12381PublicKey {
    return publicKey instanceof Bls12381PublicKey;
  }
}

/**
 * Represents the private key of an Ed25519 key pair.
 */
export class Bls12381PrivateKey extends Serializable implements PrivateKey {
  /**
   * Length of an Ed25519 private key
   */
  static readonly LENGTH: number = 32;

  /**
   * The Ed25519 signing key
   * @private
   */
  private readonly signingKey: Hex;

  // region Constructors

  /**
   * Create a new PrivateKey instance from a Uint8Array or String.
   *
   * @param hexInput HexInput (string or Uint8Array)
   */
  constructor(hexInput: HexInput) {
    super();

    const privateKeyHex = Hex.fromHexInput(hexInput);
    if (privateKeyHex.toUint8Array().length !== Bls12381PrivateKey.LENGTH) {
      throw new Error(`PrivateKey length should be ${Bls12381PrivateKey.LENGTH}`);
    }

    // Create keyPair from Private key in Uint8Array format
    this.signingKey = privateKeyHex;
  }

  /**
   * Generate a new random private key.
   *
   * @returns Ed25519PrivateKey
   */
  static generate(): Bls12381PrivateKey {
    const keyPair = bls.utils.randomPrivateKey();
    return new Bls12381PrivateKey(keyPair);
  }

  // endregion

  // region PrivateKey

  /**
   * Derive the Ed25519PublicKey for this private key.
   *
   * @returns Ed25519PublicKey
   */
  publicKey(): Bls12381PublicKey {
    const bytes = bls.getPublicKey(this.signingKey.toUint8Array());
    return new Bls12381PublicKey(bytes);
  }

  /**
   * Sign the given message with the private key.
   *
   * @param message a message as a string or Uint8Array
   * @returns Signature
   */
  sign(message: HexInput): Bls12381Signature {
    const messageToSign = convertSigningMessage(message);
    const messageBytes = Hex.fromHexInput(messageToSign).toUint8Array();
    const signatureBytes = bls.sign(messageBytes, this.signingKey.toUint8Array());
    return new Bls12381Signature(signatureBytes);
  }

  /**
   * Get the private key in bytes (Uint8Array).
   *
   * @returns Uint8Array representation of the private key
   */
  toUint8Array(): Uint8Array {
    return this.signingKey.toUint8Array();
  }

  /**
   * Get the private key as a hex string with the 0x prefix.
   *
   * @returns string representation of the private key
   */
  toString(): string {
    return this.signingKey.toString();
  }

  // endregion

  // region Serializable

  serialize(serializer: Serializer): void {
    serializer.serializeBytes(this.toUint8Array());
  }

  static deserialize(deserializer: Deserializer): Bls12381PrivateKey {
    const bytes = deserializer.deserializeBytes();
    return new Bls12381PrivateKey(bytes);
  }

  // endregion

  /**
   * @deprecated use `instanceof Ed25519PrivateKey` instead.
   */
  static isPrivateKey(privateKey: PrivateKey): privateKey is Bls12381PrivateKey {
    return privateKey instanceof Bls12381PrivateKey;
  }
}

/**
 * A signature of a message signed using an Ed25519 private key
 */
export class Bls12381Signature extends Signature {
  /**
   * Length of an Ed25519 signature
   */
  static readonly LENGTH = 96;

  /**
   * The signature bytes
   * @private
   */
  private readonly data: Hex;

  // region Constructors

  constructor(hexInput: HexInput) {
    super();
    const data = Hex.fromHexInput(hexInput);
    if (data.toUint8Array().length !== Bls12381Signature.LENGTH) {
      throw new Error(`Signature length should be ${Bls12381Signature.LENGTH}`);
    }
    this.data = data;
  }

  // endregion

  // region Signature

  toUint8Array(): Uint8Array {
    return this.data.toUint8Array();
  }

  // endregion

  // region Serializable

  serialize(serializer: Serializer): void {
    serializer.serializeBytes(this.data.toUint8Array());
  }

  static deserialize(deserializer: Deserializer): Bls12381Signature {
    const bytes = deserializer.deserializeBytes();
    return new Bls12381Signature(bytes);
  }
  // endregion
}
