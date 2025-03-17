import { EndlessConfig } from "../api/endlessConfig";
import { AccountAddress, AccountAddressInput } from "../core";
import { EntryFunctionABI, InputGenerateTransactionOptions } from "../transactions/types";
import { AnyNumber, GetCoinDataResponse } from "../types";
import { generateTransaction } from "./transactionSubmission";
import { parseTypeTag, TypeTagAddress, TypeTagU128 } from "../transactions";
import { SimpleTransaction } from "../transactions/instances/simpleTransaction";
import { getEndlessIndexer, postEndlessIndexer } from "../client";

const transferCoinAbi: EntryFunctionABI = {
  typeParameters: [{ constraints: [] }],
  parameters: [new TypeTagAddress(), new TypeTagU128(), parseTypeTag("0x1::object::Object")],
};

export async function transferCoinTransaction(args: {
  endlessConfig: EndlessConfig;
  sender: AccountAddressInput;
  fungibleAssetMetadataAddress: AccountAddress;
  recipient: AccountAddressInput;
  amount: AnyNumber;
  options?: InputGenerateTransactionOptions;
}): Promise<SimpleTransaction> {
  const { endlessConfig, sender, fungibleAssetMetadataAddress, recipient, amount, options } = args;
  return generateTransaction({
    endlessConfig,
    sender,
    data: {
      function: "0x1::endless_account::transfer_coins",
      typeArguments: ["0x1::fungible_asset::Metadata"],
      functionArguments: [recipient, amount, fungibleAssetMetadataAddress],
      abi: transferCoinAbi,
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
