// Copyright © Endless
// Copyright © Aptos Foundation
// SPDX-License-Identifier: Apache-2.0

export const NetworkToIndexerAPI: Record<string, string> = {
  mainnet: "https://idx.endless.link/api/v1",
  testnet: "https://idx-test.endless.link/api/v1",
  devnet: "https://idx-testnet.endless.link/api/v1",
  local: "http://127.0.0.1:8090/v1/graphql",
};

export const NetworkToIndexerAPIV2: Record<string, string> = {
  mainnet: "https://idx.endless.com/v1/graphql",
  testnet: "https://idx-test.endless.link/api/v1",
  devnet: "https://idx-testnet.endless.link/api/v1",
  local: "http://127.0.0.1:8090/v1/graphql",
};


export const NetworkToNodeAPI: Record<string, string> = {
  mainnet: "https://rpc.endless.link/v1",
  testnet: "https://rpc-test.endless.link/v1",
  devnet: "https://rpc-testnet.endless.link/v1",
  local: "http://127.0.0.1:8080/v1",
};

export const NetworkToFaucetAPI: Record<string, string> = {
  mainnet: "",
  testnet: "",
  devnet: "",
  local: "http://127.0.0.1:8081",
};

export const NetworkToProverAPI: Record<string, string> = {
  mainnet: "https://wallet-zk.endless.link",
  testnet: "https://wallet-zk.endless.link",
  devnet: "https://wallet-zk.endless.link",
  // Use the devnet service for local environment
  local: "http://localhost:3001",
};

export enum Network {
  MAINNET = "mainnet",
  TESTNET = "testnet",
  DEVNET = "devnet",
  LOCAL = "local",
  CUSTOM = "custom",
}

export const NetworkToChainId: Record<string, number> = {
  mainnet: 220,
  testnet: 221,
  local: 223,
  devnet: 11
};

export const NetworkToNetworkName: Record<string, Network> = {
  mainnet: Network.MAINNET,
  testnet: Network.TESTNET,
  devnet: Network.DEVNET,
  local: Network.LOCAL,
  custom: Network.CUSTOM,
};
