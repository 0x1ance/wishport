import { contractDeployer } from '../../utils/ContractDeployer';
import {  expectFnReturnChange } from '../../../ethers-test-helpers'
import { ethers } from 'hardhat';
import { expect } from 'chai';

describe('UNIT TEST: Wish Contract - _beforeTokenTransfer', () => {
  it(`_beforeTokenTransfer: should decrement prev owner balanceOfTransferable
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
        functionSignature: 'balanceOfTransferable',
        params: [account.address],
        expectedBefore: 1,
        expectedAfter: 0
      },
    )
  })
  it(`_beforeTokenTransfer: should increment new owner balanceOfTransferable
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
        functionSignature: 'balanceOfTransferable',
        params: [accountB.address],
        expectedBefore: 0,
        expectedAfter: 1
      },
    )
  })
})
