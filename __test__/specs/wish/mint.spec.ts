
import { Chance } from 'chance';
import { contractDeployer } from '../../utils/ContractDeployer';
import { expectEvent, expectFnReturnChange, expectRevert, ZERO_ADDRESS } from '../../../ethers-test-helpers'
import { ethers } from 'hardhat';
import { expect } from 'chai';

describe.skip('UNIT TEST: Wish Contract - mint', () => {
  it(`mint: should throw error if the contract is paused
`, async () => {
    const [owner, wishport, accountA] = await ethers.getSigners()
    const [wish] = await contractDeployer.Wish({ owner, wishportAddress: wishport.address })


    await wish.connect(owner).pause()

    expect(await wish.paused()).to.be.true
    await expectRevert(
      wish.connect(wishport).mint(accountA.address, 1),
      'Pausable: paused'
    )
  })
  it(`mint: should throw error if the caller is not wishport
`, async () => {
    const [owner, wishport, accountA] = await ethers.getSigners()
    const [wish] = await contractDeployer.Wish({ owner, wishportAddress: wishport.address })


    await expectRevert(
      wish.connect(accountA).mint(accountA.address, 1),
      'Wish:Unauthorized'
    )
  })
  it(`mint: should mint the corresponding tokenId if has not been minted previously
  `, async () => {
    const [owner, wishport, account] = await ethers.getSigners()
    const [wish] = await contractDeployer.Wish({ owner, wishportAddress: wishport.address })

    const tokenId = 0

    await expectFnReturnChange(
      wish.connect(wishport).mint,
      [account.address, tokenId],
      {
        contract: wish,
        functionSignature: 'balanceOf',
        params: [account.address],
        expectedBefore: 0,
        expectedAfter: 1
      },
    )
    expect(await wish.ownerOf(tokenId)).to.equal(account.address)
  })
  it(`mint: should throw error if the tokenId has been already minted`, async () => {
    const [owner, wishport, account] = await ethers.getSigners()
    const [wish] = await contractDeployer.Wish({ owner, wishportAddress: wishport.address })
    const tokenId = 0
    await wish.connect(wishport).mint(account.address, tokenId)
    await expectRevert(
      wish.connect(wishport).mint(account.address, tokenId),
      'ERC721: token already minted'
    )
  })
  it('mint: should emit a Transfer event', async () => {
    const [owner, wishport, account] = await ethers.getSigners()
    const [wish] = await contractDeployer.Wish({ owner, wishportAddress: wishport.address })
    const tokenId = 0
    await expectEvent(
      wish.connect(wishport).mint,
      [account.address, tokenId],
      {
        contract: wish,
        eventSignature: 'Transfer',
        eventArgs: {
          from: ZERO_ADDRESS,
          to: account.address,
          tokenId
        }
      }
    )
  })

})
