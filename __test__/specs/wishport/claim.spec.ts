import { SafeMath } from './../../utils/safeMath';
import { UnitParser } from '../../utils/UnitParser'
import { ethers } from 'hardhat'
import { expectEvent, expectFnReturnChange, expectRevert, ZERO_ADDRESS } from '../../../ethers-test-helpers'
import { contractDeployer } from '../../utils/ContractDeployer'
import { Chance } from 'chance'
import { expect } from 'chai'
import { contractStateGenerator } from '../../utils/ContractStateGenerator'
import { getCurrentBlock } from '../../../hardhat-test-helpers'

const chance = new Chance()

describe('UNIT TEST: Wishport Contract - claim', () => {
  it(`
  should throw error if the contract does not allow claiming
      `, async () => {
    const [owner, account, recepient] = await ethers.getSigners()
    const [wishport] = await contractDeployer.Wishport({
      owner,
    })

    const snapshot_id = await ethers.provider.send('evm_snapshot', [])
    {

      const tokenAddress = ZERO_ADDRESS
      const claimableAmount = UnitParser.fromEther(await wishport.claimable(account.address, tokenAddress))
      const claimAmount = chance.integer({ min: claimableAmount, max: claimableAmount + 100 })

      await wishport.connect(owner).allowClaim(false)

      expect(await wishport._allowClaim()).to.be.false

      await expectRevert(
        wishport
          .connect(account)
          .claim(recepient.address, tokenAddress, UnitParser.toEther(claimAmount)),
        'Wishport:ActionDisabled',
      )
    }

    await ethers.provider.send('evm_revert', [snapshot_id])
  })
  it(`
  if claiming base ether
  should throw error if the input amount exceed the claimable balance
      `, async () => {
    const [owner, account, recepient] = await ethers.getSigners()
    const [wishport] = await contractDeployer.Wishport({
      owner,
    })

    const snapshot_id = await ethers.provider.send('evm_snapshot', [])
    {

      const tokenAddress = ZERO_ADDRESS
      const claimableAmount = UnitParser.fromEther(await wishport.claimable(account.address, tokenAddress))

      const claimAmount = chance.integer({ min: claimableAmount, max: claimableAmount + 100 })

      expect(claimAmount).to.be.greaterThan(claimableAmount)
      await expectRevert(
        wishport
          .connect(account)
          .claim(recepient.address, tokenAddress, UnitParser.toEther(claimAmount)),
        'Wishport:InsufficientBalance',
      )
    }

    await ethers.provider.send('evm_revert', [snapshot_id])
  })

  it(`
  if claiming erc20 token
  should throw error if the input amount exceed the claimable balance
      `, async () => {
    const [owner, account, recepient] = await ethers.getSigners()
    const [wishport] = await contractDeployer.Wishport({
      owner,
    })
    const [erc20] = await contractDeployer.TestERC20({ owner })
    const snapshot_id = await ethers.provider.send('evm_snapshot', [])
    {

      const tokenAddress = ZERO_ADDRESS
      const claimableAmount = UnitParser.fromEther(await wishport.claimable(account.address, tokenAddress))

      const claimAmount = chance.integer({ min: claimableAmount, max: claimableAmount + 100 })

      expect(claimAmount).to.be.greaterThan(claimableAmount)
      await expectRevert(
        wishport
          .connect(account)
          .claim(recepient.address, erc20.address, UnitParser.toEther(claimAmount)),
        'Wishport:InsufficientBalance',
      )
    }

    await ethers.provider.send('evm_revert', [snapshot_id])
  })

  it(`
  if claiming base ether
  should decrement the corresponding claimable amount`, async () => {
    const [owner, account, minter, recepient] = await ethers.getSigners()

    const snapshot_id = await ethers.provider.send('evm_snapshot', [])
    {

      const tokenAddress = ZERO_ADDRESS
      const tokenId = 0
      const assetAmount = chance.integer({ min: 0.02, max: 2000 })
      const sigExpireBlockNum = (await getCurrentBlock()).number + 100

      const [wishport] = await contractStateGenerator.afterWishportComplete({
        tokenId,
        assetAmount,
        nonce: 0,
        sigExpireBlockNum,
        minter,
        owner,
        fulfiller: account
      })

      const claimableAmount = UnitParser.fromEther(await wishport.claimable(account.address, tokenAddress))
      expect(claimableAmount).to.be.greaterThan(0)

      const claimAmount = claimableAmount / 2
      await expectFnReturnChange(
        wishport.connect(account).claim,
        [
          recepient.address, tokenAddress, UnitParser.toEther(claimAmount)
        ],
        {
          contract: wishport,
          functionSignature: 'claimable',
          params: [account.address, tokenAddress],
          expectedBefore: claimableAmount,
          expectedAfter: SafeMath.sub(claimableAmount, claimAmount),
        },
      )
    }

    await ethers.provider.send('evm_revert', [snapshot_id])
  })

  it(`
  if claiming erc20 token
  should decrement the corresponding claimable amount`, async () => {
    const [owner, account, minter, recepient] = await ethers.getSigners()

    const snapshot_id = await ethers.provider.send('evm_snapshot', [])
    {
      const [erc20] = await contractDeployer.TestERC20({ owner })
      const decimals = await erc20.decimals()

      const tokenAddress = erc20.address
      const tokenId = 0
      const assetAmount = chance.integer({ min: 0.02, max: 2000 })
      const sigExpireBlockNum = (await getCurrentBlock()).number + 100

      // mint king token for caller
      await erc20
        .connect(minter)
        .mint(
          minter.address,
          UnitParser.toBigNumber(assetAmount, decimals),
        )


      const [wishport] = await contractStateGenerator.afterWishportComplete({
        tokenId,
        assetToken: erc20,
        assetAmount,
        nonce: 0,
        sigExpireBlockNum,
        minter,
        owner,
        fulfiller: account
      })

      const claimableAmount = UnitParser.fromEther(await wishport.claimable(account.address, tokenAddress))
      expect(claimableAmount).to.be.greaterThan(0)

      const claimAmount = claimableAmount / 2
      await expectFnReturnChange(
        wishport.connect(account).claim,
        [
          recepient.address, tokenAddress, UnitParser.toEther(claimAmount)
        ],
        {
          contract: wishport,
          functionSignature: 'claimable',
          params: [account.address, tokenAddress],
          expectedBefore: claimableAmount,
          expectedAfter: SafeMath.sub(claimableAmount, claimAmount),
        },
      )
    }

    await ethers.provider.send('evm_revert', [snapshot_id])
  })


  it(`
  if claiming base ether
  should increment the recepient ether balance corresponding to the claimable amount`, async () => {
    const [owner, account, minter, recepient] = await ethers.getSigners()

    const snapshot_id = await ethers.provider.send('evm_snapshot', [])
    {

      const tokenAddress = ZERO_ADDRESS
      const tokenId = 0
      const assetAmount = chance.integer({ min: 0.02, max: 2000 })
      const sigExpireBlockNum = (await getCurrentBlock()).number + 10

      const [wishport] = await contractStateGenerator.afterWishportComplete({
        tokenId,
        assetAmount,
        nonce: 0,
        sigExpireBlockNum,
        minter,
        owner,
        fulfiller: account
      })

      const claimableAmount = UnitParser.fromEther(await wishport.claimable(account.address, tokenAddress))
      expect(claimableAmount).to.be.greaterThan(0)

      const claimAmount = claimableAmount / 2

      const before = UnitParser.fromEther(await recepient.getBalance())
      await
        wishport.connect(account).claim(
          recepient.address, tokenAddress, UnitParser.toEther(claimAmount)
        )

      const after = UnitParser.fromEther(await recepient.getBalance())

      expect(after).to.be.greaterThan(before)
      expect(SafeMath.sub(after, before)).to.be.equal(claimAmount)
    }

    await ethers.provider.send('evm_revert', [snapshot_id])
  })

  it(`
  if claiming erc20 token
  should decrement the corresponding claimable amount`, async () => {
    const [owner, account, minter, recepient] = await ethers.getSigners()

    const snapshot_id = await ethers.provider.send('evm_snapshot', [])
    {
      const [erc20] = await contractDeployer.TestERC20({ owner })
      const decimals = await erc20.decimals()

      const tokenAddress = erc20.address
      const tokenId = 0
      const assetAmount = chance.integer({ min: 0.02, max: 2000 })
      const sigExpireBlockNum = (await getCurrentBlock()).number + 100

      // mint king token for caller
      await erc20
        .connect(minter)
        .mint(
          minter.address,
          UnitParser.toBigNumber(assetAmount, decimals),
        )


      const [wishport] = await contractStateGenerator.afterWishportComplete({
        tokenId,
        assetToken: erc20,
        assetAmount,
        nonce: 0,
        sigExpireBlockNum,
        minter,
        owner,
        fulfiller: account
      })

      const claimableAmount = UnitParser.fromEther(await wishport.claimable(account.address, tokenAddress))
      expect(claimableAmount).to.be.greaterThan(0)

      const claimAmount = claimableAmount / 2
      await expectFnReturnChange(
        wishport.connect(account).claim,
        [
          recepient.address, tokenAddress, UnitParser.toEther(claimAmount)
        ],
        {
          contract: wishport,
          functionSignature: 'claimable',
          params: [account.address, tokenAddress],
          expectedBefore: claimableAmount,
          expectedAfter: SafeMath.sub(claimableAmount, claimAmount),
        },
      )
    }

    await ethers.provider.send('evm_revert', [snapshot_id])
  })

  it(`
  if claiming erc20 token
  should increment the recepient balance corresponding to the claimable amount`, async () => {
    const [owner, account, minter, recepient] = await ethers.getSigners()

    const snapshot_id = await ethers.provider.send('evm_snapshot', [])
    {
      const [erc20] = await contractDeployer.TestERC20({ owner })
      const decimals = await erc20.decimals()

      const tokenAddress = erc20.address
      const tokenId = 0
      const assetAmount = chance.integer({ min: 0.02, max: 2000 })
      const sigExpireBlockNum = (await getCurrentBlock()).number + 100

      // mint king token for caller
      await erc20
        .connect(minter)
        .mint(
          minter.address,
          UnitParser.toBigNumber(assetAmount, decimals),
        )


      const [wishport] = await contractStateGenerator.afterWishportComplete({
        tokenId,
        assetToken: erc20,
        assetAmount,
        nonce: 0,
        sigExpireBlockNum,
        minter,
        owner,
        fulfiller: account
      })

      const claimableAmount = UnitParser.fromEther(await wishport.claimable(account.address, tokenAddress))
      expect(claimableAmount).to.be.greaterThan(0)

      const claimAmount = claimableAmount / 2
      const expectedBefore = UnitParser.fromEther(await erc20.balanceOf(recepient.address))
      await expectFnReturnChange(
        wishport.connect(account).claim,
        [
          recepient.address, tokenAddress, UnitParser.toEther(claimAmount)
        ],
        {
          contract: erc20,
          functionSignature: 'balanceOf',
          params: [recepient.address],
          expectedBefore,
          expectedAfter: SafeMath.add(expectedBefore, claimAmount),
        },
      )
    }

    await ethers.provider.send('evm_revert', [snapshot_id])
  })



  it(`
  should emit the Claim event`, async () => {
    const [owner, account, minter, recepient] = await ethers.getSigners()

    const snapshot_id = await ethers.provider.send('evm_snapshot', [])
    {
      const [erc20] = await contractDeployer.TestERC20({ owner })
      const decimals = await erc20.decimals()

      const tokenAddress = erc20.address
      const tokenId = 0
      const assetAmount = chance.integer({ min: 0.02, max: 2000 })
      const sigExpireBlockNum = (await getCurrentBlock()).number + 100

      // mint king token for caller
      await erc20
        .connect(minter)
        .mint(
          minter.address,
          UnitParser.toBigNumber(assetAmount, decimals),
        )


      const [wishport] = await contractStateGenerator.afterWishportComplete({
        tokenId,
        assetToken: erc20,
        assetAmount,
        nonce: 0,
        sigExpireBlockNum,
        minter,
        owner,
        fulfiller: account
      })

      const claimableAmount = UnitParser.fromEther(await wishport.claimable(account.address, tokenAddress))
      expect(claimableAmount).to.be.greaterThan(0)

      const claimAmount = claimableAmount / 2
      await expectEvent(
        wishport.connect(account).claim,
        [
          recepient.address, tokenAddress, UnitParser.toEther(claimAmount)
        ],
        {
          contract: wishport,
          eventSignature: 'Claim',
          eventArgs: {
            recipient: recepient.address,
            token: tokenAddress,
            amount: UnitParser.toBigNumber(claimAmount, decimals),
          },
        },
      )
    }

    await ethers.provider.send('evm_revert', [snapshot_id])
  })

})
