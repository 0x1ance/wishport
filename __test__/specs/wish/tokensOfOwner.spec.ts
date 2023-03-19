
import Chance from 'chance'
import { contractDeployer } from '../../utils/ContractDeployer';
import { contractReturnHandler } from '../../../ethers-test-helpers'
import { ethers } from 'hardhat';
import { expect } from 'chai';
const chance = new Chance()

describe('UNIT TEST: Wish Contract - tokensOfOwner', () => {
  it(`tokensOfOwner: should return all the owned token of the address
  `, async () => {
    const [owner, account] = await ethers.getSigners()
    const [wish] = await contractDeployer.Wish({ owner })

    const totalTokenNumber = 3
    let tokenIds: number[] = []
    while (tokenIds.length < totalTokenNumber) {
      const newTokenId = chance.integer({ max: 1000, min: 0 })
      if (!tokenIds.includes(newTokenId)) {
        tokenIds.push(newTokenId)
      }
    }
    await wish.connect(owner).mint(account.address, tokenIds[0])
    await wish.connect(owner).mint(account.address, tokenIds[1])
    await wish.connect(owner).mint(account.address, tokenIds[2])

    const res = contractReturnHandler(await wish.connect(owner)['tokensOfOwner(address)'](account.address))

    expect(res.length).to.equal(totalTokenNumber)
    expect(res.includes(tokenIds[0]))
    expect(res.includes(tokenIds[1]))
    expect(res.includes(tokenIds[2]))
  })
  it(`tokensOfOwner: should only return transferable tokens if the request status input is true
  `, async () => {
    const [owner, account] = await ethers.getSigners()
    const [wish] = await contractDeployer.Wish({ owner })

    const totalTokenNumber = 3
    let tokenIds: number[] = []
    while (tokenIds.length < totalTokenNumber) {
      const newTokenId = chance.integer({ max: 1000, min: 0 })
      if (!tokenIds.includes(newTokenId)) {
        tokenIds.push(newTokenId)
      }
    }

    await wish.connect(owner).mint(account.address, tokenIds[0])
    await wish.connect(owner).mint(account.address, tokenIds[1])
    await wish.connect(owner).mint(account.address, tokenIds[2])

    // set two as transferable
    await wish.connect(owner).setTransferable(tokenIds[0], true)
    await wish.connect(owner).setTransferable(tokenIds[2], true)

    const res = contractReturnHandler(await wish.connect(owner)['tokensOfOwner(address,bool)'](account.address, true))

    expect(res.length).to.equal(2)
    expect(res.includes(tokenIds[0]))
    expect(res.includes(tokenIds[2]))
  })
  it(`tokensOfOwner: should only return non transferable tokens if the request status input is false
  `, async () => {
    const [owner, account] = await ethers.getSigners()
    const [wish] = await contractDeployer.Wish({ owner })

    const totalTokenNumber = 3
    let tokenIds: number[] = []
    while (tokenIds.length < totalTokenNumber) {
      const newTokenId = chance.integer({ max: 1000, min: 0 })
      if (!tokenIds.includes(newTokenId)) {
        tokenIds.push(newTokenId)
      }
    }
    await wish.connect(owner).mint(account.address, tokenIds[0])
    await wish.connect(owner).mint(account.address, tokenIds[1])
    await wish.connect(owner).mint(account.address, tokenIds[2])

    // set two as transferable
    await wish.connect(owner).setTransferable(tokenIds[0], true)
    await wish.connect(owner).setTransferable(tokenIds[2], true)

    const res = contractReturnHandler(await wish.connect(owner)['tokensOfOwner(address,bool)'](account.address, false))

    expect(res.length).to.equal(totalTokenNumber - 2)
    expect(res.includes(tokenIds[1]))
  })

})
