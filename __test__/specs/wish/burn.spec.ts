import { contractDeployer } from '../../utils/ContractDeployer';
import { expectEvent, expectFnReturnChange, expectRevert, ZERO_ADDRESS } from '../../../ethers-test-helpers'
import { ethers } from 'hardhat';

describe('UNIT TEST: Wish Contract - burn', () => {
  it(`burn: should throw error if the caller is not owner
`, async () => {
    const [owner, notOwner] = await ethers.getSigners()
    const [wish] = await contractDeployer.Wish({ owner })


    await expectRevert(
      wish.connect(notOwner).burn(1),
      'Ownable: caller is not the owner'
    )
  })
  it(`burn: should burn the corresponding tokenId if has been minted previously
  `, async () => {
    const [owner, account] = await ethers.getSigners()
    const [wish] = await contractDeployer.Wish({ owner })

    const tokenId = 0
    await wish.connect(owner).mint(account.address, tokenId)
    
    await expectFnReturnChange(
      wish.connect(owner).burn,
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
    const [owner] = await ethers.getSigners()
    const [wish] = await contractDeployer.Wish({ owner })
    const tokenId = 0

    await expectRevert(
      wish.connect(owner).burn(tokenId),
      'ERC721: invalid token ID'
    )
  })
  it('burn: should emit a Transfer event', async () => {
    const [owner, account] = await ethers.getSigners()
    const [wish] = await contractDeployer.Wish({ owner})
    const tokenId = 0
    await wish.connect(owner).mint(account.address, tokenId)
    await expectEvent(
      wish.connect(owner).burn,
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
