// Copyright © Endless
// Copyright © Aptos Foundation
// SPDX-License-Identifier: Apache-2.0

/**
 * Type of API endpoint for request routing
 */
export enum EndlessApiType {
  FULLNODE = "Fullnode",
  INDEXER = "Indexer",
  FAUCET = "Faucet",
  INDEXERV2 = "Indexer2",
  PEPPER = "Pepper",
  PROVER = "Prover",
}

/**
 * The default max gas amount when none is given.
 *
 * This is the maximum number of gas units that will be used by a transaction before being rejected.
 *
 * Note that max gas amount varies based on the transaction.  A larger transaction will go over this
 * default gas amount, and the value will need to be changed for the specific transaction.
 */
export const DEFAULT_MAX_GAS_AMOUNT = 200000;

/**
 * The default transaction expiration seconds from now.
 *
 * This time is how long until the blockchain nodes will reject the transaction.
 *
 * Note that the transaction expiration time varies based on network connection and network load.  It may need to be
 * increased for the transaction to be processed.
 */
export const DEFAULT_TXN_EXP_SEC_FROM_NOW = 20;

/**
 * The default number of seconds to wait for a transaction to be processed.
 *
 * This time is the amount of time that the SDK will wait for a transaction to be processed when waiting for
 * the results of the transaction.  It may take longer based on network connection and network load.
 */
export const DEFAULT_TXN_TIMEOUT_SEC = 20;

/**
 * The default gas currency for the network.
 */
export const ENDLESS_COIN = "0x1::endless_coin::EndlessCoin";
export const ENDLESS_COIN_ID = "ENDLESSsssssssssssssssssssssssssssssssssssss";

export const RAW_TRANSACTION_SALT = "ENDLESS::RawTransaction";
export const RAW_TRANSACTION_WITH_DATA_SALT = "ENDLESS::RawTransactionWithData";

/**
 * The list of supported Processor types for our indexer api.
 *
 * These can be found from the processor_status table in the indexer database.
 * {@link https://cloud.hasura.io/public/graphiql?endpoint=https://api.mainnet.endlesslabs.com/v1/graphql}
 */
export enum ProcessorType {
  ACCOUNT_TRANSACTION_PROCESSOR = "account_transactions_processor",
  DEFAULT = "default_processor",
  EVENTS_PROCESSOR = "events_processor",
  // Fungible asset processor also handles coins
  FUNGIBLE_ASSET_PROCESSOR = "fungible_asset_processor",
  STAKE_PROCESSOR = "stake_processor",
  // Token V2 processor replaces Token processor (not only for digital assets)
  TOKEN_V2_PROCESSOR = "token_v2_processor",
  USER_TRANSACTION_PROCESSOR = "user_transaction_processor",
}
