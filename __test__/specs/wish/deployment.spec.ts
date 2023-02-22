
import { Chance } from 'chance';
import { contractDeployer } from '../../utils/ContractDeployer';
import { expect } from 'chai'
import { IERC165__factory, IERC721Soulbound__factory, IERC721__factory, ISoulbound__factory, IWish__factory } from '../../../types';
import { ethers } from 'hardhat';
import { generateInterfaceID, expectRevert } from '../../../ethers-test-helpers';


const chance = new Chance()

describe.skip('UNIT TEST: Wish Contract - deployment', () => {
  it('deployment: should support the IERC164, ISoulbound, IERC721, IERC721Soulbound & IWish interface', async () => {
    const [wish] = await contractDeployer.Wish()

    const IERC165Interface = IERC165__factory.createInterface()
    const ISoulboundInterface = ISoulbound__factory.createInterface()
    const IERC721Interface = IERC721__factory.createInterface()
    const IERC721SoulboundInterface = IERC721Soulbound__factory.createInterface()
    const IWishInterface = IWish__factory.createInterface()

    const IERC165InterfaceId = generateInterfaceID([
      IERC165Interface,
    ])._hex
    const ISoulboundInterfaceId = generateInterfaceID([
      ISoulboundInterface,
      IERC165Interface
    ])._hex
    const IERC721InterfaceId = generateInterfaceID([
      IERC721Interface,
      IERC165Interface
    ])._hex
    const IERC721SoulboundInterfaceId = generateInterfaceID([
      IERC721SoulboundInterface,
      ISoulboundInterface,
    ])._hex
    const IWishInterfaceId = generateInterfaceID([
      IWishInterface,
      IERC721Interface,
    ])._hex

    expect(await wish.supportsInterface(IERC165InterfaceId)).to.be.true
    expect(await wish.supportsInterface(ISoulboundInterfaceId)).to.be.true
    expect(await wish.supportsInterface(IERC721InterfaceId)).to.be.true
    expect(await wish.supportsInterface(IERC721SoulboundInterfaceId)).to.be.true
    expect(await wish.supportsInterface(IWishInterfaceId)).to.be.true
  })

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
