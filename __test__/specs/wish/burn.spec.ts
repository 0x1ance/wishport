
import { Chance } from 'chance';
import { contractDeployer } from '../../utils/ContractDeployer';
import { expectEvent, expectFnReturnChange, expectRevert, ZERO_ADDRESS } from '../../../ethers-test-helpers'
import { ethers } from 'hardhat';
import { expect } from 'chai';

describe('UNIT TEST: Wish Contract - burn', () => {
  it(`burn: should throw error if the contract is paused
`, async () => {
    const [owner, wishport, _account] = await ethers.getSigners()
    const [wish] = await contractDeployer.Wish({ owner, wishportAddress: wishport.address })

    await wish.connect(owner).pause()

    expect(await wish.paused()).to.be.true
    await expectRevert(
      wish.connect(wishport).burn(0),
      'Pausable: paused'
    )
  })
  it(`burn: should throw error if the caller is not wishport
`, async () => {
    const [owner, wishport, accountA] = await ethers.getSigners()
    const [wish] = await contractDeployer.Wish({ owner, wishportAddress: wishport.address })


    await expectRevert(
      wish.connect(accountA).burn(1),
      'Wish:Unauthorized'
    )
  })
  it(`burn: should burn the corresponding tokenId if has been minted previously
  `, async () => {
    const [owner, wishport, account] = await ethers.getSigners()
    const [wish] = await contractDeployer.Wish({ owner, wishportAddress: wishport.address })

    const tokenId = 0
    await wish.connect(wishport).mint(account.address, tokenId)
    
    await expectFnReturnChange(
      wish.connect(wishport).burn,
      [tokenId],
      {
        contract: wish,
        functionSignature: 'balanceOf',
        params: [account.address],
        expectedBefore: 1,
        expectedAfter: 0
      },
    )
  })
  it(`burn: should throw error if the tokenId has not been minted`, async () => {
    const [owner, wishport] = await ethers.getSigners()
    const [wish] = await contractDeployer.Wish({ owner, wishportAddress: wishport.address })
    const tokenId = 0

    await expectRevert(
      wish.connect(wishport).burn(tokenId),
      'ERC721: invalid token ID'
    )
  })
  it('burn: should emit a Transfer event', async () => {
    const [owner, wishport, account] = await ethers.getSigners()
    const [wish] = await contractDeployer.Wish({ owner, wishportAddress: wishport.address })
    const tokenId = 0
    await wish.connect(wishport).mint(account.address, tokenId)
    await expectEvent(
      wish.connect(wishport).burn,
      [tokenId],
      {
        contract: wish,
        eventSignature: 'Transfer',
        eventArgs: {
          from: account.address,
          to: ZERO_ADDRESS,
          tokenId
        }
      }
    )
  })

})
