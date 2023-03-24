import { ZERO_ADDRESS } from './../../../ethers-test-helpers/consts';
import { Chance } from 'chance';
import { contractDeployer } from '../../utils/ContractDeployer';
import { expect } from 'chai'
import { ethers } from 'hardhat';
import { expectRevert } from '../../../ethers-test-helpers';

const chance = new Chance()

describe('UNIT TEST: Wishport Contract - deployment', () => {
  it('deployment: should deploy an wish contract owned by current wishport contract', async () => {
    const [owner] = await ethers.getSigners()
    const name = chance.word({ length: 10 })
    const [wishport, wish] = await contractDeployer.Wishport({ owner, name })

    expect(await wishport.wish()).to.equal(wish.address)
    expect(await wish.owner()).to.equal(wishport.address)
  })

  it('deployment: should set name, symbol, uri, contractURI & manager (as deployer) metadata on the deployed wish contract', async () => {
    const [owner] = await ethers.getSigners()
    const name = chance.word({ length: 10 })
    const symbol = chance.word({ length: 5 })
    const uri = chance.domain({ length: 8 })
    const contractURI = chance.domain({ length: 8 })
    const [soulhub] = await contractDeployer.Soulhub({ owner, name })
    const [_wishport, wish] = await contractDeployer.Wishport({ owner, name, soulhub, symbol, uri, contractURI })


    expect(await wish.name()).to.equal(name)
    expect(await wish.symbol()).to.equal(symbol)
    expect(await wish.manager()).to.equal(owner.address)
    expect(await wish.contractURI()).to.equal(contractURI)
  })

  it('deployment: should set authedSigner & default asset config metadata', async () => {
    const [owner, authedSigner] = await ethers.getSigners()

    const defaultAssetConfig = {
      activated: true,
      PLATFORM_FEE_PORTION: chance.integer({ min: 0, max: 10000 }),
      DISPUTE_HANDLING_FEE_PORTION: chance.integer({ min: 0, max: 10000 })
    }
    const [wishport] = await contractDeployer.Wishport({ owner, authedSigner: authedSigner.address, defaultAssetConfig })

    expect(await wishport.authedSigner()).to.equal(authedSigner.address)
    const onchainDefaultAssetConfig = await wishport['assetConfig()']()
    expect(onchainDefaultAssetConfig.DISPUTE_HANDLING_FEE_PORTION.toNumber()).to.equal(defaultAssetConfig.DISPUTE_HANDLING_FEE_PORTION)
    expect(onchainDefaultAssetConfig.PLATFORM_FEE_PORTION.toNumber()).to.equal(defaultAssetConfig.PLATFORM_FEE_PORTION)
    expect(onchainDefaultAssetConfig.activated).to.equal(defaultAssetConfig.activated)
  })

  it('deployment: should throw error if the input soulhub address does not supports ISoulhub interface', async () => {
    const [owner] = await ethers.getSigners()

    await expectRevert(
      contractDeployer.Wishport({ owner, authedSigner: ZERO_ADDRESS }),
      'Wishport:InvalidSigner'
    )
  })
})
