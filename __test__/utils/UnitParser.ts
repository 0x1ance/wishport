import { ethers } from "ethers";

const toBigNumber = (num: number, hex: string | number | bigint = 18) =>
  ethers.parseUnits(num.toString(), hex);

const fromBigNumber = (bigNum: bigint, hex: string | number | bigint = 18) =>
  +ethers.formatUnits(bigNum, hex);

const toEther = (num: number) => ethers.parseEther(num.toString());

const fromEther = (ether: bigint) => Number(ethers.formatEther(ether));

export const UnitParser = {
  toBigNumber,
  fromBigNumber,
  toEther,
  fromEther,
};
