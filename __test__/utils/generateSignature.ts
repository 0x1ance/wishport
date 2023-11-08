import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers } from "hardhat";

type GenerateSignatureProps = {
  signer: HardhatEthersSigner;
  types: string[];
  values: any[];
};

export async function generateSignature({
  signer,
  types,
  values,
}: GenerateSignatureProps) {
  const msgHash = ethers.solidityPackedKeccak256(types, values);
  return signer.signMessage(ethers.toBeArray(msgHash));
}
