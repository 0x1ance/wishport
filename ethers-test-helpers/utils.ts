import { BigNumber, ethers } from 'ethers'
import { UnitParser } from '../__test__/utils/UnitParser'

export function isBN(object: any) {
    return (
        ethers.BigNumber.isBigNumber(object) || object instanceof ethers.BigNumber
    )
}

export enum ParseNumberTypeEnum {
    DIRECT = 'DIRECT',
    ETHER = 'ETHER',
    BIGNUMBER = 'BIGNUMBER',
}

export type parseNumberOptionType = {
    type?: ParseNumberTypeEnum
    decimals?: number,
    fallbackType?: ParseNumberTypeEnum.BIGNUMBER | ParseNumberTypeEnum.ETHER
}

export function parseNumber(
    num: BigNumber | number,
    opt: parseNumberOptionType = {},
) {
    const { type = ParseNumberTypeEnum.DIRECT, decimals = 18, fallbackType = ParseNumberTypeEnum.ETHER } = opt
    if (isBN(num) || num instanceof BigNumber) {
        try {
            switch (type) {
                case ParseNumberTypeEnum.ETHER:
                    return UnitParser.fromEther(num as BigNumber)
                case ParseNumberTypeEnum.BIGNUMBER:
                    return UnitParser.fromBigNumber(num as BigNumber, decimals ?? 18)
                case ParseNumberTypeEnum.DIRECT:
                default:
                    return (num as ethers.BigNumber).toNumber()
            }
        } catch (err) {
            return fallbackType === ParseNumberTypeEnum.ETHER ? UnitParser.fromEther(num as BigNumber) : UnitParser.fromBigNumber(num as BigNumber, decimals)
        }
    } else {
        return num
    }
}

export const contractReturnHandler = <T>(res: T) => {
    return (Array.isArray(res) ? res.map(el => isBN(el) ? parseNumber(el) : el) : isBN(res) ? parseNumber((res as ethers.BigNumber)) : res) as T extends BigNumber ? number : T extends BigNumber[] ? number[] : T
}
