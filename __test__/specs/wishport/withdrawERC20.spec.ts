import { UnitParser } from '../../utils/UnitParser'
import { ethers } from 'hardhat'
import {
  expectFnReturnChange,
  expectRevert,
} from '../../../ethers-test-helpers'
import { contractDeployer } from '../../utils/ContractDeployer'
import { Chance } from 'chance'

const chance = new Chance()

describe('UNIT TEST: Wishport Contract - withdrawERC20', () => {
  it(`should throw error if the caller is not owner
  `, async () => {
    const [owner, recepient, notOwner] = await ethers.getSigners()
    const [wishport] = await contractDeployer.Wishport({
      owner,
    })
    const [erc20] = await contractDeployer.TestERC20({
      owner,
    })
    const initialBalance = chance.integer({ min: 0.02, max: 2000 })
    const withdrawAmount = initialBalance / 2

    await erc20
      .connect(owner)
      .mint(wishport.address, UnitParser.toEther(initialBalance))

    const snapshot_id = await ethers.provider.send('evm_snapshot', [])
    {
      await expectRevert(
        wishport
          .connect(notOwner)
          .withdrawERC20(
            recepient.address,
            erc20.address,
            UnitParser.toEther(withdrawAmount),
          ),
        'Ownable: caller is not the owner',
      )
    }

    await ethers.provider.send('evm_revert', [snapshot_id])
  })
  it(`should decrement the erc20 balance of the store contract`, async () => {
    const [owner, recepient] = await ethers.getSigners()
    const [wishport] = await contractDeployer.Wishport({
      owner,
    })
    const [erc20] = await contractDeployer.TestERC20({
      owner,
    })

    const initialBalance = chance.integer({ min: 0.02, max: 2000 })
    const withdrawAmount = initialBalance / 2

    await erc20
      .connect(owner)
      .mint(wishport.address, UnitParser.toEther(initialBalance))

    const snapshot_id = await ethers.provider.send('evm_snapshot', [])
    {
      await expectFnReturnChange(
        wishport.connect(owner).withdrawERC20,
        [recepient.address, erc20.address, UnitParser.toEther(withdrawAmount)],
        {
          contract: erc20,
          functionSignature: 'balanceOf',
          params: [wishport.address],
          expectedBefore: initialBalance,
          expectedAfter: initialBalance - withdrawAmount,
        },
      )
    }
    await ethers.provider.send('evm_revert', [snapshot_id])
  })
  it(`should increment the erc20 balance of the recepient`, async () => {
    const [owner, recepient] = await ethers.getSigners()
    const [wishport] = await contractDeployer.Wishport({
      owner,
    })
    const [erc20] = await contractDeployer.TestERC20({
      owner,
    })

    const initialBalance = chance.integer({ min: 0.02, max: 2000 })
    const withdrawAmount = initialBalance / 2

    await erc20
      .connect(owner)
      .mint(wishport.address, UnitParser.toEther(initialBalance))

    const snapshot_id = await ethers.provider.send('evm_snapshot', [])
    {
      await expectFnReturnChange(
        wishport.connect(owner).withdrawERC20,
        [recepient.address, erc20.address, UnitParser.toEther(withdrawAmount)],
        {
          contract: erc20,
          functionSignature: 'balanceOf',
          params: [recepient.address],
          expectedBefore: 0,
          expectedAfter: withdrawAmount,
        },
      )
    }
    await ethers.provider.send('evm_revert', [snapshot_id])
  })
  it(`should throw error if the withdraw amount exceed contract balance`, async () => {
    const [owner, recepient] = await ethers.getSigners()
    const [wishport] = await contractDeployer.Wishport({
      owner,
    })
    const [erc20] = await contractDeployer.TestERC20({
      owner,
    })

    const initialBalance = chance.integer({ min: 0.02, max: 2000 })
    const withdrawAmount = initialBalance * 2

    await erc20
      .connect(owner)
      .mint(wishport.address, UnitParser.toEther(initialBalance))

    const snapshot_id = await ethers.provider.send('evm_snapshot', [])
    {
      await expectRevert(
        wishport
          .connect(owner)
          .withdrawERC20(
            recepient.address,
            erc20.address,
            UnitParser.toEther(withdrawAmount),
          ),
        'ERC20: transfer amount exceeds balance',
      )
    }
    await ethers.provider.send('evm_revert', [snapshot_id])
  })
  it(`should throw error if the input erc20 address is not a contract`, async () => {
    const [owner, recepient, invalidERC20] = await ethers.getSigners()
    const [wishport] = await contractDeployer.Wishport({
      owner,
    })
    const [erc20] = await contractDeployer.TestERC20({
      owner,
    })

    const initialBalance = chance.integer({ min: 0.02, max: 2000 })
    const withdrawAmount = initialBalance * 2

    await erc20
      .connect(owner)
      .mint(wishport.address, UnitParser.toEther(initialBalance))

    const snapshot_id = await ethers.provider.send('evm_snapshot', [])
    {
      await expectRevert(
        wishport
          .connect(owner)
          .withdrawERC20(
            recepient.address,
            invalidERC20.address,
            UnitParser.toEther(withdrawAmount),
          ),
        'Address: call to non-contract',
      )
    }
    await ethers.provider.send('evm_revert', [snapshot_id])
  })
  it(`should throw error if the input erc20 address is not an erc20 contract`, async () => {
    const [owner, recepient, invalidERC20] = await ethers.getSigners()
    const [wishport] = await contractDeployer.Wishport({
      owner,
    })

    const initialBalance = chance.integer({ min: 0.02, max: 2000 })
    const withdrawAmount = initialBalance * 2

    const snapshot_id = await ethers.provider.send('evm_snapshot', [])
    {
      await expectRevert(
        wishport
          .connect(owner)
          .withdrawERC20(
            recepient.address,
            invalidERC20.address,
            UnitParser.toEther(withdrawAmount),
          ),
        'Address: call to non-contract',
      )
    }
    await ethers.provider.send('evm_revert', [snapshot_id])
  })
})
