// Copyright © Endless
// Copyright © Aptos Foundation
// SPDX-License-Identifier: Apache-2.0

/**
 * This file contains the underlying implementations for exposed API surface in
 * the {@link api/keyless}. By moving the methods out into a separate file,
 * other namespaces and processes can access these methods without depending on the entire
 * keyless namespace and without having a dependency cycle error.
 */
import { EndlessConfig } from "../api/endlessConfig";
import { postEndlessPepperService, postEndlessProvingService } from "../client";
import {
  EphemeralSignature,
  Groth16Zkp,
  Hex,
  KeylessPublicKey,
  ZeroKnowledgeSig,
  getKeylessConfig,
} from "../core";
import { HexInput } from "../types";
import { EphemeralKeyPair, KeylessAccount, ProofFetchCallback } from "../account";
import { PepperFetchRequest, PepperFetchResponse, ProverRequest, ProverResponse } from "../types/keyless";
import { nowInSeconds } from "../utils/helpers";

export async function getPepper(args: {
  endlessConfig: EndlessConfig;
  jwt: string;
  ephemeralKeyPair: EphemeralKeyPair;
  uidKey?: string;
  derivationPath?: string;
}): Promise<Uint8Array> {
  const { endlessConfig, jwt, ephemeralKeyPair, uidKey = "sub", derivationPath } = args;

  const body = {
    jwt_b64: jwt,
    epk: ephemeralKeyPair.getPublicKey().bcsToHex().toStringWithoutPrefix(),
    exp_date_secs: ephemeralKeyPair.expiryDateSecs,
    epk_blinder: Hex.fromHexInput(ephemeralKeyPair.blinder).toStringWithoutPrefix(),
    uid_key: uidKey,
    derivation_path: derivationPath,
  };
  const { data } = await postEndlessPepperService<PepperFetchRequest, PepperFetchResponse>({
    endlessConfig,
    path: "fetch",
    body,
    originMethod: "getPepper",
    overrides: { WITH_CREDENTIALS: false },
  });
  return Hex.fromHexInput(data.pepper).toUint8Array();
}

export async function getProof(args: {
  endlessConfig: EndlessConfig;
  jwt: string;
  ephemeralKeyPair: EphemeralKeyPair;
  pepper: HexInput;
  uidKey?: string;
}): Promise<ZeroKnowledgeSig> {
  const { endlessConfig, jwt, ephemeralKeyPair, pepper, uidKey = "sub" } = args;
  if (Hex.fromHexInput(pepper).toUint8Array().length !== KeylessAccount.PEPPER_LENGTH) {
    throw new Error(`Pepper needs to be ${KeylessAccount.PEPPER_LENGTH} bytes`);
  }
  const maxExpHorizonSecs = endlessConfig.maxExpHorizonSecs ?? (await getKeylessConfig({ endlessConfig })).maxExpHorizonSecs;
  if (maxExpHorizonSecs < ephemeralKeyPair.expiryDateSecs - nowInSeconds()) {
    throw Error(`The EphemeralKeyPair is too long lived.  It's lifespan must be less than ${maxExpHorizonSecs}`);
  }
  const json = {
    jwt_b64: jwt,
    epk: ephemeralKeyPair.getPublicKey().bcsToHex().toStringWithoutPrefix(),
    epk_blinder: Hex.fromHexInput(ephemeralKeyPair.blinder).toStringWithoutPrefix(),
    exp_date_secs: ephemeralKeyPair.expiryDateSecs,
    exp_horizon_secs: maxExpHorizonSecs,
    pepper: Hex.fromHexInput(pepper).toStringWithoutPrefix(),
    uid_key: uidKey,
  };

  const { data } = await postEndlessProvingService<ProverRequest, ProverResponse>({
    endlessConfig,
    path: "prove",
    body: json,
    originMethod: "getProof",
    overrides: { WITH_CREDENTIALS: false },
  });

  const proofPoints = data.proof;
  const groth16Zkp = new Groth16Zkp({
    a: proofPoints.a,
    b: proofPoints.b,
    c: proofPoints.c,
  });
  const nonMalleabilitySignature = ephemeralKeyPair.sign(groth16Zkp.hash());
  const signedProof = new ZeroKnowledgeSig({
    proof: groth16Zkp,
    nonMalleabilitySignature,
    trainingWheelsSignature: data.training_wheels_signature ? EphemeralSignature.fromHex(data.training_wheels_signature) : undefined,
    expHorizonSecs: maxExpHorizonSecs,
  });
  return signedProof;
}

export async function deriveKeylessAccount(args: {
  endlessConfig: EndlessConfig;
  jwt: string;
  ephemeralKeyPair: EphemeralKeyPair;
  pepper: HexInput;
  uidKey?: string;
  proofFetchCallback?: ProofFetchCallback;
}): Promise<KeylessAccount> {
  const { jwt, uidKey, proofFetchCallback, pepper } = args;
  const proofPromise = getProof({ ...args });
  // If a callback is provided, pass in the proof as a promise to KeylessAccount.create.  This will make the proof be fetched in the
  // background and the callback will handle the outcome of the fetch.  This allows the developer to not have to block on the proof fetch
  // allowing for faster rendering of UX.
  //
  // If no callback is provided, the just await the proof fetch and continue syncronously.
  const proof = proofFetchCallback ? proofPromise : await proofPromise;

  // Look up the original address to handle key rotations
  const publicKey = KeylessPublicKey.fromJwtAndPepper({ jwt, pepper, uidKey });
  // const address = await lookupOriginalAccountAddress({
  //   endlessConfig,
  //   authenticationKey: publicKey.authKey().derivedAddress(),
  // });
  const address = publicKey.authKey().derivedAddress();

  const keylessAccount = KeylessAccount.create({ ...args, address, proof, pepper, proofFetchCallback });

  return keylessAccount;
}
