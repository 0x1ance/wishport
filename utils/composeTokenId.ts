import { ethers } from "ethers";

export const composeTokenId = (pseudoOwnerAddress: string, tokenId: number) => {
  if (!ethers.isAddress(pseudoOwnerAddress)) {
    throw new Error("Invalid address");
  }
  const defaultAbiCoder = ethers.AbiCoder.defaultAbiCoder();
  const encodedTokenId = defaultAbiCoder.encode(["uint256"], [tokenId]);

  const encodedWalletAddress = defaultAbiCoder.encode(
    ["address"],
    [pseudoOwnerAddress]
  );
  return "0x" + encodedWalletAddress.slice(26) + encodedTokenId.slice(42);
};
