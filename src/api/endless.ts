// Copyright © Endless
// Copyright © Aptos Foundation
// SPDX-License-Identifier: Apache-2.0

import { Account } from "./account";
import { EndlessConfig } from "./endlessConfig";
import { Coin } from "./coin";
import { DigitalAsset } from "./digitalAsset";
import { Event } from "./event";
import { FungibleAsset } from "./fungibleAsset";
import { General } from "./general";
import { ANS } from "./ans";
import { Staking } from "./staking";
import { Transaction } from "./transaction";
import { Table } from "./table";
import { EndlessAccount } from "./endlessAccount";

/**
 * This class is the main entry point into Endless's
 * APIs and separates functionality into different namespaces.
 *
 * To use the SDK, create a new Endless instance to get access
 * to all the sdk functionality.
 *
 * @example
 *
 * const endless = new Endless();
 */
export class Endless {
  readonly config: EndlessConfig;

  readonly account: Account;

  readonly ans: ANS;

  readonly coin: Coin;

  readonly digitalAsset: DigitalAsset;

  readonly endlessAccount: EndlessAccount;

  readonly event: Event;

  readonly fungibleAsset: FungibleAsset;

  readonly general: General;

  readonly staking: Staking;

  readonly transaction: Transaction;

  readonly table: Table;

  constructor(settings?: EndlessConfig) {
    this.config = new EndlessConfig(settings);
    this.account = new Account(this.config);
    this.ans = new ANS(this.config);
    this.coin = new Coin(this.config);
    this.digitalAsset = new DigitalAsset(this.config);
    this.endlessAccount = new EndlessAccount(this.config);
    this.event = new Event(this.config);
    this.fungibleAsset = new FungibleAsset(this.config);
    this.general = new General(this.config);
    this.staking = new Staking(this.config);
    this.transaction = new Transaction(this.config);
    this.table = new Table(this.config);
  }
}

// extends Endless interface so all the methods and properties
// from the other classes will be recognized by typescript.
export interface Endless
  extends Account,
  ANS,
  Coin,
  DigitalAsset,
  EndlessAccount,
  Event,
  FungibleAsset,
  General,
  Staking,
  Table,
  Omit<Transaction, "build" | "simulate" | "submit" | "batch"> { }

/**
In TypeScript, we can’t inherit or extend from more than one class,
Mixins helps us to get around that by creating a partial classes
that we can combine to form a single class that contains all the methods and properties from the partial classes.
{@link https://www.typescriptlang.org/docs/handbook/mixins.html#alternative-pattern}

Here, we combine any subclass and the Endless class.
*/
function applyMixin(targetClass: any, baseClass: any, baseClassProp: string) {
  // Mixin instance methods
  Object.getOwnPropertyNames(baseClass.prototype).forEach((propertyName) => {
    const propertyDescriptor = Object.getOwnPropertyDescriptor(baseClass.prototype, propertyName);
    if (!propertyDescriptor) return;
    // eslint-disable-next-line func-names
    propertyDescriptor.value = function (...args: any) {
      return (this as any)[baseClassProp][propertyName](...args);
    };
    Object.defineProperty(targetClass.prototype, propertyName, propertyDescriptor);
  });
}

applyMixin(Endless, Account, "account");
applyMixin(Endless, ANS, "ans");
applyMixin(Endless, Coin, "coin");
applyMixin(Endless, DigitalAsset, "digitalAsset");
applyMixin(Endless, EndlessAccount, "endlessAccount");
applyMixin(Endless, Event, "event");
applyMixin(Endless, FungibleAsset, "fungibleAsset");
applyMixin(Endless, General, "general");
applyMixin(Endless, Staking, "staking");
applyMixin(Endless, Transaction, "transaction");
applyMixin(Endless, Table, "table");
