import { EndlessConfig } from "../api/endlessConfig";
import { AccountAddressInput } from "../core";
import { EntryFunctionABI, InputGenerateTransactionOptions } from "../transactions/types";
import { AnyNumber, MoveStructId, GetCoinDataResponse } from "../types";
import { ENDLESS_COIN } from "../utils/const";
import { generateTransaction } from "./transactionSubmission";
import { TypeTagAddress, TypeTagU64 } from "../transactions";
import { SimpleTransaction } from "../transactions/instances/simpleTransaction";
import { getEndlessIndexer, postEndlessIndexer } from "../client";

const coinTransferAbi: EntryFunctionABI = {
  typeParameters: [{ constraints: [] }],
  parameters: [new TypeTagAddress(), new TypeTagU64()],
};

export async function transferCoinTransaction(args: {
  endlessConfig: EndlessConfig;
  sender: AccountAddressInput;
  recipient: AccountAddressInput;
  amount: AnyNumber;
  coinType?: MoveStructId;
  options?: InputGenerateTransactionOptions;
}): Promise<SimpleTransaction> {
  const { endlessConfig, sender, recipient, amount, coinType, options } = args;
  const coinStructType = coinType ?? ENDLESS_COIN;
  return generateTransaction({
    endlessConfig,
    sender,
    data: {
      function: "0x1::endless_account::transfer_coins",
      typeArguments: [coinStructType],
      functionArguments: [recipient, amount],
      abi: coinTransferAbi,
    },
    options,
  });
}

export async function getCoinData(
  endlessConfig: EndlessConfig,
  coinAddress: AccountAddressInput,
): Promise<GetCoinDataResponse> {
  const { data } = await getEndlessIndexer<{}, GetCoinDataResponse>({
    endlessConfig,
    originMethod: "getCoinData",
    path: `coins/${coinAddress}`,
  });
  return data;
}

export async function getCoinListDataById(
  endlessConfig: EndlessConfig,
  coinListAddress: AccountAddressInput[],
): Promise<GetCoinDataResponse[]> {
  const { data } = await postEndlessIndexer<{}, GetCoinDataResponse[]>({
    endlessConfig,
    originMethod: "getCoinListDataById",
    path: "coins",
    body: coinListAddress,
  });
  return data;
}
