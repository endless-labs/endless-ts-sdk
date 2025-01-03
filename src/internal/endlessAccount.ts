import { EndlessConfig } from "../api/endlessConfig";
import { AccountAddress } from "../core";
import { Account } from "../account";
import {
  EntryFunctionABI,
  InputGenerateTransactionOptions,
  InputViewFunctionData,
  SimpleTransaction,
  TypeTagAddress,
  TypeTagU128,
  TypeTagU64,
  parseTypeTag,
} from "../transactions";
import { AnyNumber, MoveAbility } from "../types";
import { view } from "./view";
import { generateTransaction } from "./transactionSubmission";

const transferEDSAbi: EntryFunctionABI = {
  typeParameters: [],
  parameters: [new TypeTagAddress(), new TypeTagU128()],
};

const transferCoinAbi: EntryFunctionABI = {
  typeParameters: [{ constraints: [MoveAbility.KEY] }],
  parameters: [new TypeTagAddress(), new TypeTagU128(), parseTypeTag("0x1::object::Object")],
};

export async function transferEDS(args: {
  endlessConfig: EndlessConfig;
  sender: Account;
  recipient: AccountAddress;
  amount: AnyNumber;
  options?: InputGenerateTransactionOptions;
}): Promise<SimpleTransaction> {
  const { endlessConfig, sender, recipient, amount, options } = args;
  return generateTransaction({
    endlessConfig,
    sender: sender.accountAddress,
    data: {
      function: "0x1::endless_account::transfer",
      functionArguments: [recipient, amount],
      abi: transferEDSAbi,
    },
    options,
  });
}

export async function transferCoin(args: {
  endlessConfig: EndlessConfig;
  sender: Account;
  fungibleAssetMetadataAddress: AccountAddress;
  recipient: AccountAddress;
  amount: AnyNumber;
  options?: InputGenerateTransactionOptions;
}): Promise<SimpleTransaction> {
  const { endlessConfig, sender, fungibleAssetMetadataAddress, recipient, amount, options } = args;
  return generateTransaction({
    endlessConfig,
    sender: sender.accountAddress,
    data: {
      function: "0x1::endless_account::transfer_coins",
      typeArguments: ["0x1::fungible_asset::Metadata"],
      functionArguments: [recipient, amount, fungibleAssetMetadataAddress],
      abi: transferCoinAbi,
    },
    options,
  });
}

export async function viewCoinBalance(args: {
  endlessConfig: EndlessConfig;
  account: AccountAddress;
  fungibleAssetMetadataAddress: AccountAddress;
}): Promise<bigint> {
  const { endlessConfig, account, fungibleAssetMetadataAddress } = args;
  const payload: InputViewFunctionData = {
    function: `${"0x1"}::primary_fungible_store::balance`,
    // function: `${routerAddress}::primary_fungible_store::balance`,
    functionArguments: [account.toString(), fungibleAssetMetadataAddress.toString()],
    typeArguments: ["0x1::fungible_asset::Metadata"],
  };
  const res = (await view<[string]>({ endlessConfig, payload }))[0];
  return BigInt(res);
}
