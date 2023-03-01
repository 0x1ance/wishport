
import { Chance } from 'chance';
import { contractDeployer } from '../../utils/ContractDeployer';
import { expect } from 'chai'
import { ethers } from 'hardhat';
import { expectRevert } from '../../../ethers-test-helpers';


const chance = new Chance()

describe('UNIT TEST: Wish Contract - deployment', () => {
  it('deployment: should subscribe to the correct initial soulhub contract', async () => {
    const [owner] = await ethers.getSigners()
    const name = chance.word({ length: 10 })
    const [soulhub] = await contractDeployer.Soulhub({ owner, name })
    const [wish] = await contractDeployer.Wish({ owner, soulhub })

    expect(await wish.soulhub()).to.equal(soulhub.address)
  })

  it('deployment: should set name, symbol, uri & wishport metadata', async () => {
    const [owner, wishport] = await ethers.getSigners()
    const name = chance.word({ length: 10 })
    const symbol = chance.word({ length: 5 })
    const [soulhub] = await contractDeployer.Soulhub({ owner, name })
    const [wish] = await contractDeployer.Wish({ owner, soulhub, name, symbol, wishportAddress: wishport.address })

    expect(await wish.name()).to.equal(name)
    expect(await wish.symbol()).to.equal(symbol)
    expect(await wish.wishport()).to.equal(wishport.address)
  })

  it('deployment: should throw error if the input soulhub address does not supports ISoulhub interface', async () => {
    const [owner, falsySoulhub] = await ethers.getSigners()

    await expectRevert(
      // @ts-ignore
      contractDeployer.Wish({ owner, soulhub: falsySoulhub }),
      'Soulbound:InvalidInterface'
    )
  })

})
