

import { ethers } from 'hardhat'

export async function getCurrentBlock() {
  const currentBlockNumber = await ethers.provider.getBlockNumber()
  return ethers.provider.getBlock(currentBlockNumber)
}