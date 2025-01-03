import bs58 from "bs58";
import {
  Account,
  AccountAddress,
  Endless,
  EndlessConfig,
  InputViewFunctionData,
  MoveString,
  MultiSig,
  Network,
  SimpleTransaction,
  TransactionPayloadMultiSig,
  U64,
  UserTransactionResponse,
  WriteSetChangeWriteResource,
  generateRawTransaction,
  generateTransactionPayload,
} from "../../dist/common";

const config = new EndlessConfig({
  network: Network.TESTNET,
  // fullnode: "https://rpc-testnet.endless.link/v1",
  // fullnode: "http://127.0.0.1:8080/v1",
});

const endless = new Endless(config);

// Generate 3 accounts that will be the owners of the multisig account.
const owner1 = Account.generate();
const owner2 = Account.generate();
const owner3 = Account.generate();
const owner4 = Account.generate();

// Global var to hold the created multi sig account address
let multisigAddress: string;

// Generate an account that will recieve coin from a transfer transaction
const recipient = Account.generate();

// Global var to hold the generated coin transfer transaction payload
let transactionPayload: TransactionPayloadMultiSig;
let createCollectionPayload: TransactionPayloadMultiSig;
let setCollectionDescriptionPayload: TransactionPayloadMultiSig;
let collectionAddress: string;

const fundOwnerAccounts = async () => {
  await endless.fundAccount({ signer: owner1 });
  await endless.fundAccount({ signer: owner2 });
  await endless.fundAccount({ signer: owner3 });
  await endless.fundAccount({ signer: owner4 });

  console.log(`owner1 balance: ${await endless.viewEDSBalance(owner1.accountAddress)}`);
  console.log(`owner2 balance: ${await endless.viewEDSBalance(owner2.accountAddress)}`);
  console.log(`owner3 balance: ${await endless.viewEDSBalance(owner3.accountAddress)}`);
  console.log(`owner4 balance: ${await endless.viewEDSBalance(owner4.accountAddress)}`);
};

const settingUpMultiSigAccount = async () => {
  // Step 1: Setup a 2-of-3 multisig account
  // ===========================================================================================
  // Get the next multisig account address. This will be the same as the account address of the multisig account we'll
  // be creating.
  const payload: InputViewFunctionData = {
    function: "0x1::multisig_account::get_next_multisig_account_address",
    functionArguments: [owner1.accountAddress.toString()],
  };
  [multisigAddress] = await endless.view<[string]>({ payload });
  // Create the multisig account with 3 owners and a signature threshold of 2.
  const createMultisig = await endless.transaction.build.simple({
    sender: owner1.accountAddress,
    data: {
      function: "0x1::multisig_account::create_with_owners",
      functionArguments: [
        [owner2.accountAddress, owner3.accountAddress],
        2,
        ["Example"],
        [new MoveString("SDK").bcsToBytes()],
      ],
    },
  });
  const owner1Authenticator = endless.transaction.sign({ signer: owner1, transaction: createMultisig });
  const res = await endless.transaction.submit.simple({
    senderAuthenticator: owner1Authenticator,
    transaction: createMultisig,
  });
  await endless.waitForTransaction({ transactionHash: res.hash });

  console.log("create_with_owners:", scan(res.hash));
  console.log("Multisig Account Address:", multisigAddress);
};


const createMultiSigTransferTransaction = async () => {
  console.log("Creating a multisig transaction to transfer coins...");

  transactionPayload = await generateTransactionPayload({
    multisigAddress,
    function: "0x1::endless_account::transfer",
    functionArguments: [recipient.accountAddress, 1_000_000],
    endlessConfig: config,
  });

  // Build create_transaction transaction
  const createMultisigTx = await endless.transaction.build.simple({
    sender: owner2.accountAddress,
    data: {
      function: "0x1::multisig_account::create_transaction",
      functionArguments: [multisigAddress, transactionPayload.multiSig.transaction_payload.bcsToBytes()],
    },
  });

  // Owner 2 signs the transaction
  const createMultisigTxAuthenticator = endless.transaction.sign({ signer: owner2, transaction: createMultisigTx });

  // Submit the transaction to chain
  const createMultisigTxResponse = await endless.transaction.submit.simple({
    senderAuthenticator: createMultisigTxAuthenticator,
    transaction: createMultisigTx,
  });
  await endless.waitForTransaction({ transactionHash: createMultisigTxResponse.hash });

  console.log("create_transaction:", scan(createMultisigTxResponse.hash));
};

const createTransactionOfCreateCollectionPayload = async () => {
  createCollectionPayload = await generateTransactionPayload({
    multisigAddress,
    function: "0x4::nft::create_collection",
    functionArguments: [
      "description",
      100,
      "name",
      "uri",
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      false,
      false,
      0,
      1,
    ],
    endlessConfig: config,
  });

  // Build create_transaction transaction
  const createMultisigTx = await endless.transaction.build.simple({
    sender: owner2.accountAddress,
    data: {
      function: "0x1::multisig_account::create_transaction",
      functionArguments: [multisigAddress, createCollectionPayload.multiSig.transaction_payload.bcsToBytes()],
    },
  });

  // Owner 2 signs the transaction
  const createMultisigTxAuthenticator = endless.transaction.sign({ signer: owner2, transaction: createMultisigTx });

  // Submit the transaction to chain
  const createMultisigTxResponse = await endless.transaction.submit.simple({
    senderAuthenticator: createMultisigTxAuthenticator,
    transaction: createMultisigTx,
  });
  await endless.waitForTransaction({ transactionHash: createMultisigTxResponse.hash });

  console.log("create_transaction:", scan(createMultisigTxResponse.hash));
};

const executeMultiSigOfCreateCollection = async () => {
  const rawTransaction = await generateRawTransaction({
    endlessConfig: config,
    sender: owner2.accountAddress,
    payload: createCollectionPayload,
  });

  const transaction = new SimpleTransaction(rawTransaction);

  const owner2Authenticator = endless.transaction.sign({ signer: owner2, transaction });
  const transactionReponse = await endless.transaction.submit.simple({
    senderAuthenticator: owner2Authenticator,
    transaction,
  });
  const response = (await endless.waitForTransaction({
    transactionHash: transactionReponse.hash,
  })) as UserTransactionResponse;
  collectionAddress = (response.changes[6] as WriteSetChangeWriteResource).address;

  console.log("executeMultiSigTransaction:", scan(transactionReponse.hash));
};

const createTransactionOfSetCollectionDescription = async () => {
  setCollectionDescriptionPayload = await generateTransactionPayload({
    multisigAddress,
    function: "0x4::nft::set_collection_description",
    functionArguments: [collectionAddress, "new description"],
    typeArguments: ["0x4::nft::Collection"],
    endlessConfig: config,
  });

  // Build create_transaction transaction
  const createMultisigTx = await endless.transaction.build.simple({
    sender: owner2.accountAddress,
    data: {
      function: "0x1::multisig_account::create_transaction",
      functionArguments: [multisigAddress, setCollectionDescriptionPayload.multiSig.transaction_payload.bcsToBytes()],
    },
  });

  // Owner 2 signs the transaction
  const createMultisigTxAuthenticator = endless.transaction.sign({ signer: owner2, transaction: createMultisigTx });

  // Submit the transaction to chain
  const createMultisigTxResponse = await endless.transaction.submit.simple({
    senderAuthenticator: createMultisigTxAuthenticator,
    transaction: createMultisigTx,
  });
  await endless.waitForTransaction({ transactionHash: createMultisigTxResponse.hash });

  console.log("create_transaction:", scan(createMultisigTxResponse.hash));
};

const executeMultiSigOfSetCollectionDescription = async () => {
  const rawTransaction = await generateRawTransaction({
    endlessConfig: config,
    sender: owner2.accountAddress,
    payload: setCollectionDescriptionPayload,
  });

  const transaction = new SimpleTransaction(rawTransaction);

  const owner2Authenticator = endless.transaction.sign({ signer: owner2, transaction });
  const transactionReponse = await endless.transaction.submit.simple({
    senderAuthenticator: owner2Authenticator,
    transaction,
  });
  await endless.waitForTransaction({ transactionHash: transactionReponse.hash });

  console.log("executeMultiSigTransaction:", scan(transactionReponse.hash));
};

const rejectAndApprove = async (aprroveOwner: Account, rejectOwner: Account, transactionId: number): Promise<void> => {
  const rejectTx = await endless.transaction.build.simple({
    sender: aprroveOwner.accountAddress,
    data: {
      function: "0x1::multisig_account::reject_transaction",
      functionArguments: [multisigAddress, transactionId],
    },
  });

  const rejectSenderAuthenticator = endless.transaction.sign({ signer: aprroveOwner, transaction: rejectTx });
  const rejectTxResponse = await endless.transaction.submit.simple({
    senderAuthenticator: rejectSenderAuthenticator,
    transaction: rejectTx,
  });
  await endless.waitForTransaction({ transactionHash: rejectTxResponse.hash });

  console.log("reject_transaction:", scan(rejectTxResponse.hash));

  const approveTx = await endless.transaction.build.simple({
    sender: rejectOwner.accountAddress,
    data: {
      function: "0x1::multisig_account::approve_transaction",
      functionArguments: [multisigAddress, transactionId],
    },
  });

  const approveSenderAuthenticator = endless.transaction.sign({ signer: rejectOwner, transaction: approveTx });
  const approveTxResponse = await endless.transaction.submit.simple({
    senderAuthenticator: approveSenderAuthenticator,
    transaction: approveTx,
  });
  await endless.waitForTransaction({ transactionHash: approveTxResponse.hash });

  console.log("approve_transaction:", scan(approveTxResponse.hash));
};

const rejectAndReject = async (rejectOwner: Account, rejectOwner2: Account, transactionId: number): Promise<void> => {
  const rejectTx = await endless.transaction.build.simple({
    sender: rejectOwner.accountAddress,
    data: {
      function: "0x1::multisig_account::reject_transaction",
      functionArguments: [multisigAddress, transactionId],
    },
  });

  const rejectSenderAuthenticator = endless.transaction.sign({ signer: rejectOwner, transaction: rejectTx });
  const rejectTxResponse = await endless.transaction.submit.simple({
    senderAuthenticator: rejectSenderAuthenticator,
    transaction: rejectTx,
  });
  await endless.waitForTransaction({ transactionHash: rejectTxResponse.hash });

  console.log("reject_transaction:", scan(rejectTxResponse.hash));

  const rejectTx2 = await endless.transaction.build.simple({
    sender: rejectOwner2.accountAddress,
    data: {
      function: "0x1::multisig_account::reject_transaction",
      functionArguments: [multisigAddress, transactionId],
    },
  });

  const rejectSenderAuthenticator2 = endless.transaction.sign({ signer: rejectOwner2, transaction: rejectTx2 });
  const rejectTxResponse2 = await endless.transaction.submit.simple({
    senderAuthenticator: rejectSenderAuthenticator2,
    transaction: rejectTx2,
  });
  await endless.waitForTransaction({ transactionHash: rejectTxResponse2.hash });

  console.log("reject_transaction:", scan(rejectTxResponse2.hash));
};

const executeMultiSigTransferTransaction = async () => {
  const rawTransaction = await generateRawTransaction({
    endlessConfig: config,
    sender: owner2.accountAddress,
    payload: transactionPayload,
  });

  const transaction = new SimpleTransaction(rawTransaction);

  const owner2Authenticator = endless.transaction.sign({ signer: owner2, transaction });
  const transferTransactionReponse = await endless.transaction.submit.simple({
    senderAuthenticator: owner2Authenticator,
    transaction,
  });
  await endless.waitForTransaction({ transactionHash: transferTransactionReponse.hash });

  console.log("executeMultiSigTransferTransaction:", scan(transferTransactionReponse.hash));
};

const checkBalance = async (accountAddr?: string) => {
  const recipientAddr = accountAddr ? AccountAddress.fromBs58String(accountAddr) : recipient.accountAddress;
  console.log(`recipient balance: ${await endless.viewEDSBalance(recipientAddr)}`);
};

const createRemovingAnOwnerToMultiSigAccount = async () => {
  const removeOwnerPayload = await generateTransactionPayload({
    multisigAddress,
    function: "0x1::multisig_account::remove_owner",
    functionArguments: [owner4.accountAddress],
    endlessConfig: config,
  });

  // Build create_transaction transaction
  const removeOwnerTx = await endless.transaction.build.simple({
    sender: owner2.accountAddress,
    data: {
      function: "0x1::multisig_account::create_transaction",
      functionArguments: [multisigAddress, removeOwnerPayload.multiSig.transaction_payload.bcsToBytes()],
    },
  });

  // Owner 2 signs the transaction
  const createRemoveOwnerTxAuthenticator = endless.transaction.sign({
    signer: owner2,
    transaction: removeOwnerTx,
  });
  // Submit the transaction to chain
  const createRemoveOwnerTxResponse = await endless.transaction.submit.simple({
    senderAuthenticator: createRemoveOwnerTxAuthenticator,
    transaction: removeOwnerTx,
  });
  await endless.waitForTransaction({ transactionHash: createRemoveOwnerTxResponse.hash });

  console.log("remove_owner:", scan(createRemoveOwnerTxResponse.hash));
};

const executeRejectRemovingAnOwnerToMultiSigAccount = async () => {
  const transaction = await endless.transaction.build.simple({
    sender: owner1.accountAddress,
    data: {
      function: "0x1::multisig_account::execute_rejected_transaction",
      functionArguments: [multisigAddress],
    },
  });

  const owner1Authenticator = endless.transaction.sign({ signer: owner1, transaction });
  const res = await endless.transaction.submit.simple({
    senderAuthenticator: owner1Authenticator,
    transaction,
  });

  await endless.waitForTransaction({ transactionHash: res.hash });

  console.log("execute_rejected_transaction:", scan(res.hash));
};

const createChangeSignatureThresholdTransaction = async () => {
  const changeSigThresholdPayload = await generateTransactionPayload({
    multisigAddress,
    function: "0x1::multisig_account::update_signatures_required",
    functionArguments: [3],
    endlessConfig: config,
  });

  // Build create_transaction transaction
  const changeSigThresholdTx = await endless.transaction.build.simple({
    sender: owner2.accountAddress,
    data: {
      function: "0x1::multisig_account::create_transaction",
      functionArguments: [multisigAddress, changeSigThresholdPayload.multiSig.transaction_payload.bcsToBytes()],
    },
  });

  // Owner 2 signs the transaction
  const changeSigThresholdAuthenticator = endless.transaction.sign({
    signer: owner2,
    transaction: changeSigThresholdTx,
  });
  // Submit the transaction to chain
  const changeSigThresholdResponse = await endless.transaction.submit.simple({
    senderAuthenticator: changeSigThresholdAuthenticator,
    transaction: changeSigThresholdTx,
  });
  await endless.waitForTransaction({ transactionHash: changeSigThresholdResponse.hash });

  console.log("changeSigThreshold:", scan(changeSigThresholdResponse.hash));
};

const executeChangeSignatureThresholdTransaction = async () => {
  const multisigTxExecution5 = await generateRawTransaction({
    endlessConfig: config,
    sender: owner2.accountAddress,
    payload: new TransactionPayloadMultiSig(new MultiSig(AccountAddress.fromString(multisigAddress))),
  });

  const transaction = new SimpleTransaction(multisigTxExecution5);

  const owner2Authenticator5 = endless.transaction.sign({
    signer: owner2,
    transaction,
  });
  const multisigTxExecution5Reponse = await endless.transaction.submit.simple({
    senderAuthenticator: owner2Authenticator5,
    transaction,
  });
  await endless.waitForTransaction({ transactionHash: multisigTxExecution5Reponse.hash });

  console.log("changeSigThreshold Execution:", scan(multisigTxExecution5Reponse.hash));
};

const createAddingAnOwnerToMultiSigAccountTransaction = async () => {
  // Generate a transaction payload as it is one of the input arguments create_transaction expects
  const addOwnerTransactionPayload = await generateTransactionPayload({
    multisigAddress,
    function: "0x1::multisig_account::add_owner",
    functionArguments: [owner4.accountAddress],
    endlessConfig: config,
  });

  // Build create_transaction transaction
  const createAddOwnerTransaction = await endless.transaction.build.simple({
    sender: owner2.accountAddress,
    data: {
      function: "0x1::multisig_account::create_transaction",
      functionArguments: [multisigAddress, addOwnerTransactionPayload.multiSig.transaction_payload.bcsToBytes()],
    },
  });
  // Owner 2 signs the transaction
  const createAddOwnerTxAuthenticator = endless.transaction.sign({
    signer: owner2,
    transaction: createAddOwnerTransaction,
  });
  // Submit the transaction to chain
  const createAddOwnerTxResponse = await endless.transaction.submit.simple({
    senderAuthenticator: createAddOwnerTxAuthenticator,
    transaction: createAddOwnerTransaction,
  });
  await endless.waitForTransaction({ transactionHash: createAddOwnerTxResponse.hash });

  console.log("create_transaction:", scan(createAddOwnerTxResponse.hash));
};

const executeAddingAnOwnerToMultiSigAccountTransaction = async () => {
  const multisigTxExecution3 = await generateRawTransaction({
    endlessConfig: config,
    sender: owner2.accountAddress,
    payload: new TransactionPayloadMultiSig(new MultiSig(AccountAddress.fromString(multisigAddress))),
  });

  const transaction = new SimpleTransaction(multisigTxExecution3);

  const owner2Authenticator3 = endless.transaction.sign({
    signer: owner2,
    transaction,
  });
  const multisigTxExecution3Reponse = await endless.transaction.submit.simple({
    senderAuthenticator: owner2Authenticator3,
    transaction,
  });
  await endless.waitForTransaction({ transactionHash: multisigTxExecution3Reponse.hash });

  console.log("Execution:", scan(multisigTxExecution3Reponse.hash));
};

const getNumberOfOwners = async (): Promise<void> => {
  const multisigAccountResource = await endless.getAccountResource<{ owners: Array<string> }>({
    accountAddress: multisigAddress,
    resourceType: "0x1::multisig_account::MultisigAccount",
  });
  console.log("Number of Owners:", multisigAccountResource.owners.length);
};

const getSignatureThreshold = async (): Promise<void> => {
  const payload: InputViewFunctionData = {
    function: `0x1::multisig_account::num_signatures_required`,
    functionArguments: [multisigAddress],
  };

  const res = (await endless.view<[U64]>({ payload }))[0];
  console.log("Signature Threshold:", res);
};

function scan(hex: string): string {
  if (hex.startsWith("0x")) {
    hex = hex.slice(2);
  }
  const bytes = Buffer.from(hex, "hex");
  const base58 = bs58.encode(bytes);
  return `https://scan.endless.link/txn/${base58}`;
}

async function can_be_executed(nonce: number) {
  const payload: InputViewFunctionData = {
    function: `0x1::multisig_account::can_be_executed`,
    functionArguments: [multisigAddress, nonce],
  };

  const res = (await endless.view<[boolean]>({ payload }))[0];

  console.log("can_be_executed:", res);
}

async function can_be_rejected(nonce: number) {
  const payload: InputViewFunctionData = {
    function: `0x1::multisig_account::can_be_rejected`,
    functionArguments: [multisigAddress, nonce],
  };

  const res = (await endless.view<[boolean]>({ payload }))[0];

  console.log("can_be_rejected:", res);
}

const main = async () => {
  await fundOwnerAccounts();
  await settingUpMultiSigAccount();

  console.log("\nTransfer but fail:");
  await createMultiSigTransferTransaction();
  await rejectAndApprove(owner1, owner3, 1);
  await executeMultiSigTransferTransaction();
  await checkBalance();

  console.log("\nAdding an owner:");
  await createAddingAnOwnerToMultiSigAccountTransaction();
  await rejectAndApprove(owner1, owner3, 2);
  await executeAddingAnOwnerToMultiSigAccountTransaction();
  await getNumberOfOwners();

  console.log("\nRemoving an owner but execute Reject:");
  await createRemovingAnOwnerToMultiSigAccount();
  await rejectAndReject(owner1, owner3, 3);
  await executeRejectRemovingAnOwnerToMultiSigAccount();

  console.log("\nCreate_collection:");
  await createTransactionOfCreateCollectionPayload();
  await rejectAndApprove(owner1, owner3, 4);
  await executeMultiSigOfCreateCollection();

  console.log("\nSetCollectionDescription:");
  await createTransactionOfSetCollectionDescription();
  await rejectAndApprove(owner1, owner3, 5);
  await executeMultiSigOfSetCollectionDescription();

  console.log("\nThreshold:");
  await createChangeSignatureThresholdTransaction();
  await rejectAndApprove(owner1, owner3, 6);
  await executeChangeSignatureThresholdTransaction();
  await getSignatureThreshold();

  console.log("\n Multisig setup and transactions complete.");
};

// Start the example
main();
