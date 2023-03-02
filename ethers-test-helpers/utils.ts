import type { BigNumber } from '@ethersproject/bignumber';
import { ethers } from "ethers";

export function isBN(object: any) {
    return ethers.BigNumber.isBigNumber(object) || object instanceof ethers.BigNumber
}

export const contractReturnHandler = <T>(res: T) => {
    return (Array.isArray(res) ? res.map(el => isBN(el) ? (el as ethers.BigNumber).toNumber() : el) : isBN(res) ? (res as ethers.BigNumber).toNumber() : res) as T extends BigNumber ? number : T extends BigNumber[] ? number[] : T
}