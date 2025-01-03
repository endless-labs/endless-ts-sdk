// Copyright © Endless
// Copyright © Aptos Foundation
// SPDX-License-Identifier: Apache-2.0

// import { Account, AccountAddress } from "../core";
import { AccountAddress } from "../core";
import { Account } from "../account";
import { transferCoin, transferEDS, viewCoinBalance } from "../internal/endlessAccount";
import { InputGenerateTransactionOptions, SimpleTransaction } from "../transactions";
import { AnyNumber } from "../types";
import { EndlessConfig } from "./endlessConfig";

export class EndlessAccount {
  constructor(readonly config: EndlessConfig) { }

  async transferEDS(args: {
    sender: Account;
    recipient: AccountAddress;
    amount: AnyNumber;
    options?: InputGenerateTransactionOptions;
  }): Promise<SimpleTransaction> {
    return transferEDS({ endlessConfig: this.config, ...args });
  }

  async transferCoin(args: {
    sender: Account;
    fungibleAssetMetadataAddress: AccountAddress;
    recipient: AccountAddress;
    amount: AnyNumber;
    options?: InputGenerateTransactionOptions;
  }): Promise<SimpleTransaction> {
    return transferCoin({ endlessConfig: this.config, ...args });
  }

  async viewCoinBalance(account: AccountAddress, fungibleAssetMetadataAddress: AccountAddress): Promise<bigint> {
    return viewCoinBalance({ endlessConfig: this.config, account, fungibleAssetMetadataAddress });
  }

  async viewEDSBalance(account: AccountAddress): Promise<bigint> {
    const EDSMetadataAddress = "ENDLESSsssssssssssssssssssssssssssssssssssss";

    return viewCoinBalance({
      endlessConfig: this.config,
      account,
      fungibleAssetMetadataAddress: AccountAddress.from(EDSMetadataAddress),
    });
  }
}
