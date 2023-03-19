import { contractDeployer } from '../../utils/ContractDeployer';
import { expectFnReturnChange } from '../../../ethers-test-helpers'
import { ethers } from 'hardhat';
import { expect } from 'chai';

describe('UNIT TEST: Wish Contract - _beforeTokenTransfer', () => {
  it(`_beforeTokenTransfer: should decrement prev owner balanceOfCompleted
`, async () => {
    const [owner, account, accountB] = await ethers.getSigners()
    const [wish, soulhub] = await contractDeployer.Wish({ owner })
    const tokenId = 0
    const soul = 1
    await wish.connect(owner).mint(account.address, tokenId)
    await wish.connect(owner).setCompleted(tokenId, true);
    await soulhub.connect(owner)['setSoul(address,uint256)'](account.address, soul)
    await soulhub.connect(owner)['setSoul(address,uint256)'](accountB.address, soul)

    expect(await wish.completed(tokenId)).to.be.true
    expect(await soulhub.sameSoul(account.address, accountB.address)).to.be.true

    await expectFnReturnChange(
      wish.connect(account).transferFrom,
      [account.address, accountB.address, tokenId],
      {
        contract: wish,
        functionSignature: 'balanceOfCompleted',
        params: [account.address],
        expectedBefore: 1,
        expectedAfter: 0
      },
    )
  })
  it(`_beforeTokenTransfer: should increment new owner balanceOfCompleted
`, async () => {
    const [owner, account, accountB] = await ethers.getSigners()
    const [wish, soulhub] = await contractDeployer.Wish({ owner })

    const tokenId = 0
    const soul = 1
    await wish.connect(owner).mint(account.address, tokenId)
    await wish.connect(owner).setCompleted(tokenId, true);
    await soulhub.connect(owner)['setSoul(address,uint256)'](account.address, soul)
    await soulhub.connect(owner)['setSoul(address,uint256)'](accountB.address, soul)

    expect(await wish.completed(tokenId)).to.be.true
    expect(await soulhub.sameSoul(account.address, accountB.address)).to.be.true

    await expectFnReturnChange(
      wish.connect(account).transferFrom,
      [account.address, accountB.address, tokenId],
      {
        contract: wish,
        functionSignature: 'balanceOfCompleted',
        params: [accountB.address],
        expectedBefore: 0,
        expectedAfter: 1
      },
    )
  })
})
