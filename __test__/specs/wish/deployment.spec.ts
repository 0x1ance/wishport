
import { Chance } from 'chance';
import { contractDeployer } from '../../utils/ContractDeployer';
import { expect } from 'chai'
import { ethers } from 'hardhat';
import { expectRevert, ZERO_ADDRESS } from '../../../ethers-test-helpers';


const chance = new Chance()

describe('UNIT TEST: Wish Contract - deployment', () => {
  it('deployment: should subscribe to the correct initial soulhub contract', async () => {
    const [owner] = await ethers.getSigners()
    const name = chance.word({ length: 10 })
    const [soulhub] = await contractDeployer.Soulhub({ owner, name })
    const [wish] = await contractDeployer.Wish({ owner, soulhub })

    expect(await wish.soulhub()).to.equal(soulhub.address)
  })

  it('deployment: should set name, symbol, uri, contractURI & manager metadata', async () => {
    const [owner, manager] = await ethers.getSigners()
    const name = chance.word({ length: 10 })
    const symbol = chance.word({ length: 5 })
    const uri = chance.domain({ length: 8 })
    const contractURI = chance.domain({ length: 8 })
    const [soulhub] = await contractDeployer.Soulhub({ owner, name })
    const [wish] = await contractDeployer.Wish({ owner, soulhub, name, symbol, manager: manager.address, uri, contractURI })

    expect(await wish.name()).to.equal(name)
    expect(await wish.symbol()).to.equal(symbol)
    expect(await wish.manager()).to.equal(manager.address)
    expect(await wish.contractURI()).to.equal(contractURI)
  })

  it('deployment: should throw error if the input soulhub address does not supports ISoulhub interface', async () => {
    const [owner, falsySoulhub] = await ethers.getSigners()

    await expectRevert(
      // @ts-ignore
      contractDeployer.Wish({ owner, soulhub: falsySoulhub }),
      'Soulbound:InvalidInterface'
    )
  })

  it('deployment: should throw error if the input manager address is zero address', async () => {
    const [owner] = await ethers.getSigners()

    await expectRevert(
      contractDeployer.Wish({ owner, manager: ZERO_ADDRESS }),
      'Wish:InvalidAddress'
    )
  })

})
