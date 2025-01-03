import { Deserializer } from "../../bcs/deserializer";
import { Serializer } from "../../bcs/serializer";
import { AuthenticationKey } from "../authenticationKey";
import { AccountPublicKey, PublicKey, VerifySignatureArgs } from "./publicKey";
import { Signature } from "./signature";
import { AnyPublicKey, AnySignature } from "./singleKey";

/**
 * Represents the public key of a multi-auth-key account.
 *
 */
export class MultiAuthKeyPublicKey extends AccountPublicKey {
  /**
   * List of any public keys
   */
  public readonly publicKeys: AnyPublicKey[];

  // region Constructors

  constructor(args: { publicKeys: Array<PublicKey>; }) {
    super();
    const { publicKeys } = args;

    // Make sure that all keys are normalized to the SingleKey authentication scheme
    this.publicKeys = publicKeys.map((publicKey) =>
      publicKey instanceof AnyPublicKey ? publicKey : new AnyPublicKey(publicKey),
    );
  }

  // endregion

  // region AccountPublicKey

  // eslint-disable-next-line class-methods-use-this, @typescript-eslint/no-unused-vars
  verifySignature(args: VerifySignatureArgs): boolean {
    throw new Error("not implemented");
  }

  // eslint-disable-next-line class-methods-use-this
  authKey(): AuthenticationKey {
    throw new Error("not implemented");
  }

  toUint8Array(): Uint8Array {
    return this.bcsToBytes();
  }

  // endregion

  // region Serializable

  serialize(serializer: Serializer): void {
    serializer.serializeVector(this.publicKeys);
  }

  static deserialize(deserializer: Deserializer): MultiAuthKeyPublicKey {
    const keys = deserializer.deserializeVector(AnyPublicKey);

    return new MultiAuthKeyPublicKey({ publicKeys: keys });
  }

  // endregion
}

export class MultiAuthKeySignature extends Signature {
  /**
   * The list of signatures
   */
  public readonly signatures: AnySignature[];

  constructor(args: { signatures: Array<Signature | AnySignature>; }) {
    super();
    const { signatures } = args;

    // Make sure that all signatures are normalized to the SingleKey authentication scheme
    this.signatures = signatures.map((signature) =>
      signature instanceof AnySignature ? signature : new AnySignature(signature),
    );
  }

  // region Signature

  toUint8Array(): Uint8Array {
    return this.bcsToBytes();
  }

  // endregion

  // region Serializable

  serialize(serializer: Serializer): void {
    // Note: we should not need to serialize the vector length, as it can be derived from the bitmap
    serializer.serializeVector(this.signatures);
  }

  static deserialize(deserializer: Deserializer): MultiAuthKeySignature {
    const signatures = deserializer.deserializeVector(AnySignature);
    return new MultiAuthKeySignature({ signatures });
  }

  // endregion
}
