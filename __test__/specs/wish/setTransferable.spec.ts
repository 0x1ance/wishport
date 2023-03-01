
import { Chance } from 'chance';
import { contractDeployer } from '../../utils/ContractDeployer';
import { expectEvent, expectFnReturnChange, expectRevert, ZERO_ADDRESS } from '../../../ethers-test-helpers'
import { ethers } from 'hardhat';
import { expect } from 'chai';

describe('UNIT TEST: Wish Contract - setTransferable', () => {
  it(`setTransferable: should throw error if the contract is paused
`, async () => {
    const [owner, wishport, _account] = await ethers.getSigners()
    const [wish] = await contractDeployer.Wish({ owner, wishportAddress: wishport.address })

    const tokenId = 0

    await wish.connect(owner).pause()

    expect(await wish.paused()).to.be.true
    await expectRevert(
      wish.connect(wishport).setTransferable(tokenId, true),
      'Pausable: paused'
    )
  })
  it(`setTransferable: should throw error if the caller is not wishport
`, async () => {
    const [owner, wishport, account] = await ethers.getSigners()
    const [wish] = await contractDeployer.Wish({ owner, wishportAddress: wishport.address })

    const tokenId = 0
    await expectRevert(
      wish.connect(account).setTransferable(tokenId, true),
      'Wish:Unauthorized'
    )
  })
  it(`setTransferable: should throw error if the tokenId has not been minted
  `, async () => {
    const [owner, wishport, _account] = await ethers.getSigners()
    const [wish] = await contractDeployer.Wish({ owner, wishportAddress: wishport.address })

    const tokenId = 0

    await expectRevert(
      wish.connect(wishport).setTransferable(tokenId, true),
      'ERC721: invalid token ID'
    )
  })
  it(`setTransferable: should throw error if the current transferable status && the input status param both equals to false
  `, async () => {
    const [owner, wishport, accountA] = await ethers.getSigners()
    const [wish] = await contractDeployer.Wish({ owner, wishportAddress: wishport.address })

    const tokenId = 0
    await wish.connect(wishport).mint(accountA.address, tokenId)

    await expectRevert(
      wish.connect(wishport).setTransferable(tokenId, false),
      'Wish:SetTransferableError'
    )
  })
  it(`setTransferable: should throw error if the current transferable status && the input status param both equals to false
  `, async () => {
    const [owner, wishport, account] = await ethers.getSigners()
    const [wish] = await contractDeployer.Wish({ owner, wishportAddress: wishport.address })

    const tokenId = 0
    await wish.connect(wishport).mint(account.address, tokenId)

    await expectRevert(
      wish.connect(wishport).setTransferable(tokenId, false),
      'Wish:SetTransferableError'
    )
  })
  it(`setTransferable: should throw error if the current transferable status && the input status param both equals to true
  `, async () => {
    const [owner, wishport, account] = await ethers.getSigners()
    const [wish] = await contractDeployer.Wish({ owner, wishportAddress: wishport.address })

    const tokenId = 0
    await wish.connect(wishport).mint(account.address, tokenId)

    await wish.connect(wishport).setTransferable(tokenId, true)
    await expectRevert(
      wish.connect(wishport).setTransferable(tokenId, true),
      'Wish:SetTransferableError'
    )
  })
  it(`setTransferable: should increment the balanceOfTransferable of owner if transferable status is set to true
  `, async () => {
    const [owner, wishport, account] = await ethers.getSigners()
    const [wish] = await contractDeployer.Wish({ owner, wishportAddress: wishport.address })

    const tokenId = 0
    await wish.connect(wishport).mint(account.address, tokenId)

    await expectFnReturnChange(
      wish.connect(wishport).setTransferable,
      [tokenId, true],
      {
        contract: wish,
        functionSignature: 'balanceOfTransferable',
        params: [account.address],
        expectedBefore: 0,
        expectedAfter: 1
      },
    )
  })
  it(`setTransferable: should update token transferable status to false when the input status param is false
  `, async () => {
    const [owner, wishport, account] = await ethers.getSigners()
    const [wish] = await contractDeployer.Wish({ owner, wishportAddress: wishport.address })

    const tokenId = 0
    await wish.connect(wishport).mint(account.address, tokenId)

    await wish.connect(wishport).setTransferable(tokenId, true)
    await expectFnReturnChange(
      wish.connect(wishport).setTransferable,
      [tokenId, false],
      {
        contract: wish,
        functionSignature: 'transferable',
        params: [tokenId],
        expectedBefore: true,
        expectedAfter: false
      },
    )
  })
  it(`setTransferable: should update token transferable status to true when the input status param is true
  `, async () => {
    const [owner, wishport, account] = await ethers.getSigners()
    const [wish] = await contractDeployer.Wish({ owner, wishportAddress: wishport.address })

    const tokenId = 0
    await wish.connect(wishport).mint(account.address, tokenId)

    await expectFnReturnChange(
      wish.connect(wishport).setTransferable,
      [tokenId, true],
      {
        contract: wish,
        functionSignature: 'transferable',
        params: [tokenId],
        expectedBefore: false,
        expectedAfter: true
      },
    )
  })
  it('setTransferable: should emit a SetTransferable event', async () => {
    const [owner, wishport, account] = await ethers.getSigners()
    const [wish] = await contractDeployer.Wish({ owner, wishportAddress: wishport.address })

    const tokenId = 0
    const newStatus = true
    await wish.connect(wishport).mint(account.address, tokenId)

    await expectEvent(
      wish.connect(wishport).setTransferable,
      [tokenId, newStatus],
      {
        contract: wish,
        eventSignature: 'SetTransferable',
        eventArgs: {
          tokenId_: tokenId,
          status: newStatus
        }
      }
    )
  })

})
