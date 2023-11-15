import { Interface } from "ethers";

export function generateInterfaceId(infs: Interface[]) {
  let sighashes: string[] = [];

  for (const inf of infs) {
    inf.forEachFunction((fn) => sighashes.push(fn.selector));
  }

  const interfaceId = sighashes
    .map((sighash) => Buffer.from(sighash.substring(2), "hex"))
    .reduce((prev, curr) => {
      for (let i = 0; i < 4; i++) {
        prev[i] = prev[i] ^ curr[i];
      }
      return prev;
    }, Buffer.alloc(4));
  return `0x${interfaceId.toString("hex")}`;
}
