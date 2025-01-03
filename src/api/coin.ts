// Copyright © Endless
// Copyright © Aptos Foundation
// SPDX-License-Identifier: Apache-2.0

import { AccountAddressInput } from "../core";
import { transferCoinTransaction, getCoinData, getCoinListDataById } from "../internal/coin";
import { SimpleTransaction } from "../transactions/instances/simpleTransaction";
import { InputGenerateTransactionOptions } from "../transactions/types";
import { AnyNumber, MoveStructId, GetCoinDataResponse } from "../types";
import { EndlessConfig } from "./endlessConfig";

/**
 * A class to handle all `Coin` operations
 */
export class Coin {
  constructor(readonly config: EndlessConfig) { }

  /**
   * Generate a transfer coin transaction that can be simulated and/or signed and submitted
   *
   * @example
   * const transferCoinTransaction = await endless.transferCoinTransaction({
   * sender: "0x123",
   * recipient:"0x456",
   * amount: 10,
   * })
   *
   * @param args.sender The sender account
   * @param args.recipient The recipient address
   * @param args.amount The amount to transfer
   * @param args.coinType optional. The coin struct type to transfer. Defaults to 0x1::endless_coin::EndlessCoin
   *
   * @returns SimpleTransaction
   */
  async transferCoinTransaction(args: {
    sender: AccountAddressInput;
    recipient: AccountAddressInput;
    amount: AnyNumber;
    coinType?: MoveStructId;
    options?: InputGenerateTransactionOptions;
  }): Promise<SimpleTransaction> {
    return transferCoinTransaction({ endlessConfig: this.config, ...args });
  }

  /**
   * @param args.coinAddress The coin address
   *
   * @returns GetCoinDataResponse
   */
  async getCoinData(coinAddress: AccountAddressInput): Promise<GetCoinDataResponse> {
    return getCoinData(this.config, coinAddress);
  }

  /**
   * @param args.coinListAddress The coin list address
   *
   * @returns GetCoinDataResponse[]
   */
  async getCoinListDataById(coinListAddress: AccountAddressInput[]): Promise<GetCoinDataResponse[]> {
    return getCoinListDataById(this.config, coinListAddress);
  }
}
