import { Deserializer, MultiSigTransactionPayload } from "../../dist/common";

function main() {
  let data =
    "0x0000000000000000000000000000000000000000000000000000000000000000010f656e646c6573735f6163636f756e74087472616e73666572000220eb12f74c332ee99bd2c8c93d338e9dc1bc5e2f0b501008a5a9adb9c93a66f8ea0840420f0000000000";
  if (data.startsWith("0x")) {
    data = data.slice(2);
  }
  let d = new Deserializer(hexToBytes(data));

  let payload = MultiSigTransactionPayload.deserialize(d);

  console.log(payload.transaction_payload);
}

main();

function hexToBytes(hex: string): Uint8Array {
  const length = hex.length / 2;
  const bytes = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}
