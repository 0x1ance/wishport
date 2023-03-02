
import { Chance } from 'chance';
import { contractDeployer } from '../../utils/ContractDeployer';
import { expectEvent, expectFnReturnChange, expectRevert, ZERO_ADDRESS } from '../../../ethers-test-helpers'
import { ethers } from 'hardhat';
import { expect } from 'chai';

describe('UNIT TEST: Wish Contract - _checkTokenTransferEligibility', () => {
  it(`_checkTokenTransferEligibility: should return false if the token is not transferable
`, async () => {
    const [owner, wishport, account, accountB] = await ethers.getSigners()
    const [wish] = await contractDeployer.Wish({ owner, wishportAddress: wishport.address })

    const tokenId = 0
    await wish.connect(wishport).mint(account.address, tokenId)

    expect(await wish.transferable(tokenId)).to.be.false
    await expectRevert(
      wish.connect(account).transferFrom(account.address, accountB.address, tokenId),
      'ERC721Soulbound:Unauthorized'
    )
  })
  it(`_checkTokenTransferEligibility: should return false if the the token is tranferable but from & to are NOT under same soul
`, async () => {
    const [owner, wishport, account, accountB] = await ethers.getSigners()
    const [wish] = await contractDeployer.Wish({ owner, wishportAddress: wishport.address })

    const tokenId = 0
    await wish.connect(wishport).mint(account.address, tokenId)
    await wish.connect(wishport).setTransferable(tokenId, true);

    expect(await wish.transferable(tokenId)).to.be.true
    await expectRevert(
      wish.connect(account).transferFrom(account.address, accountB.address, tokenId),
      'ERC721Soulbound:Unauthorized'
    )
  })
  it(`_checkTokenTransferEligibility: should return true if the the token is tranferable and from & to are under same soul
`, async () => {
    const [owner, wishport, account, accountB] = await ethers.getSigners()
    const [wish, soulhub, soulhubManager] = await contractDeployer.Wish({ owner, wishportAddress: wishport.address })
    const tokenId = 0
    const soul = 1
    await wish.connect(wishport).mint(account.address, tokenId)
    await wish.connect(wishport).setTransferable(tokenId, true);
    await soulhub.connect(owner)['setSoul(address,uint256)'](account.address, soul)
    await soulhub.connect(owner)['setSoul(address,uint256)'](accountB.address, soul)

    expect(await wish.transferable(tokenId)).to.be.true
    expect(await soulhub.sameSoul(account.address, accountB.address)).to.be.true

    await expectFnReturnChange(
      wish.connect(account).transferFrom,
      [account.address, accountB.address, tokenId],
      {
        contract: wish,
        functionSignature: 'balanceOf',
        params: [account.address],
        expectedBefore: 1,
        expectedAfter: 0
      },
    )
  })
  it(`_checkTokenTransferEligibility: should return true if the the token is tranferable and from & to are under same soul
`, async () => {
    const [owner, wishport, account, accountB] = await ethers.getSigners()
    const [wish, soulhub] = await contractDeployer.Wish({ owner, wishportAddress: wishport.address })

    const tokenId = 0
    const soul = 1
    await wish.connect(wishport).mint(account.address, tokenId)
    await wish.connect(wishport).setTransferable(tokenId, true);
    await soulhub.connect(owner)['setSoul(address,uint256)'](account.address, soul)
    await soulhub.connect(owner)['setSoul(address,uint256)'](accountB.address, soul)

    expect(await wish.transferable(tokenId)).to.be.true
    expect(await soulhub.sameSoul(account.address, accountB.address)).to.be.true

    await expectFnReturnChange(
      wish.connect(account).transferFrom,
      [account.address, accountB.address, tokenId],
      {
        contract: wish,
        functionSignature: 'balanceOf',
        params: [accountB.address],
        expectedBefore: 0,
        expectedAfter: 1
      },
    )
  })
})