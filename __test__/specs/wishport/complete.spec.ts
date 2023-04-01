import { MAX_UINT256, ZERO_ADDRESS } from '../../../ethers-test-helpers/consts';
import { Chance } from 'chance';
import { contractDeployer } from '../../utils/ContractDeployer';
import { expect } from 'chai'
import { ethers } from 'hardhat';
import { expectEvent, expectFnReturnChange, expectRevert, parseNumber, ParseNumberTypeEnum } from '../../../ethers-test-helpers';
import { generateSignature, getCurrentBlock } from '../../../hardhat-test-helpers';
import { UnitParser } from '../../utils/UnitParser';
import { contractStateGenerator } from '../../utils/ContractStateGenerator';
import { SafeMath } from '../../utils/safeMath';

const chance = new Chance()

describe('UNIT TEST: Wishport Contract - complete', () => {
  it(`should throw error when the input nonce has already been consumed`, async () => {
    const [owner, account, fulfiller] = await ethers.getSigners()

    const snapshot_id = await ethers.provider.send('evm_snapshot', [])
    {
      const currentBlock = await getCurrentBlock()

      const tokenId = 0
      const assetAmount = chance.integer({ min: 0.02, max: 2000 })
      const nonce = 0
      const sigExpireBlockNum = currentBlock.number + 10

      const [wishport] = await contractStateGenerator.afterWishportMint({
        tokenId,
        assetAmount,
        nonce,
        sigExpireBlockNum, minter: account,
        owner
      })

      const signature = await generateSignature({
        signer: owner,
        types: [
          'string',
          'address',
          'address',
          'uint256',
          'address',
          'uint256',
          'uint256',
        ],
        values: [
          "complete(uint256,address,uint256,bytes,uint256)",
          wishport.address,
          account.address,
          tokenId,
          fulfiller.address,
          nonce,
          sigExpireBlockNum,
        ],
      })

      await expectRevert(
        wishport
          .connect(account)
          .complete(tokenId,
            fulfiller.address,
            nonce,
            signature,
            sigExpireBlockNum
          ),
        'Wishport:InvalidNonce',
      )
    }

    await ethers.provider.send('evm_revert', [snapshot_id])
  })
  it(`should update the user nonce comsumption status
      `, async () => {
    const [owner, account, fulfiller] = await ethers.getSigners()

    const snapshot_id = await ethers.provider.send('evm_snapshot', [])
    {
      const currentBlock = await getCurrentBlock()

      const tokenId = 0
      let nonce = 0
      const assetAmount = chance.integer({ min: 0.02, max: 2000 })
      const sigExpireBlockNum = currentBlock.number + 10

      const [wishport] = await contractStateGenerator.afterWishportMint({
        tokenId,
        assetAmount,
        nonce: nonce++,
        sigExpireBlockNum, minter: account,
        owner,
      })
      const signature = await generateSignature({
        signer: owner,
        types: [
          'string',
          'address',
          'address',
          'uint256',
          'address',
          'uint256',
          'uint256',
        ],
        values: [
          "complete(uint256,address,uint256,bytes,uint256)",
          wishport.address,
          account.address,
          tokenId,
          fulfiller.address,
          nonce,
          sigExpireBlockNum,
        ],
      })

      await expectFnReturnChange(
        wishport.connect(account).complete,
        [
          tokenId,
          fulfiller.address,
          nonce,
          signature,
          sigExpireBlockNum
        ],
        {
          contract: wishport,
          functionSignature: 'nonce',
          params: [account.address, nonce],
          expectedBefore: false,
          expectedAfter: true,
        },
      )
    }
    await ethers.provider.send('evm_revert', [snapshot_id])
  })
  it(`should throw error if the message hash signer is not the authedSigner`, async () => {
    const [owner, account, authedSigner, unauthedSigner, fulfiller] = await ethers.getSigners()

    const snapshot_id = await ethers.provider.send('evm_snapshot', [])
    {
      const currentBlock = await getCurrentBlock()

      const tokenId = 0
      let nonce = 0
      const assetAmount = chance.integer({ min: 0.02, max: 2000 })
      const sigExpireBlockNum = currentBlock.number + 10

      const [wishport] = await contractStateGenerator.afterWishportMint({
        tokenId,
        assetAmount,
        nonce: nonce++,
        sigExpireBlockNum, minter: account,
        authedSigner: authedSigner.address,
        owner
      })
      const signature = await generateSignature({
        signer: unauthedSigner,
        types: [
          'string',
          'address',
          'address',
          'uint256',
          'address',
          'uint256',
          'uint256',
        ],
        values: [
          "complete(uint256,address,uint256,bytes,uint256)",
          wishport.address,
          account.address,
          tokenId,
          fulfiller.address,
          nonce,
          sigExpireBlockNum,
        ],
      })

      await expectRevert(
        wishport
          .connect(account)
          .complete(
            tokenId,
            fulfiller.address,
            nonce,
            signature,
            sigExpireBlockNum
          ),
        'Wishport:InvalidSigner',
      )
    }

    await ethers.provider.send('evm_revert', [snapshot_id])
  })
  it(`should allow calling the complete function even if the signer is owner but not the authedSigner`, async () => {
    const [owner, account, authedSigner, fulfiller] = await ethers.getSigners()

    const snapshot_id = await ethers.provider.send('evm_snapshot', [])
    {
      const currentBlock = await getCurrentBlock()

      const tokenId = 0
      let nonce = 0
      const assetAmount = chance.integer({ min: 0.02, max: 2000 })
      const sigExpireBlockNum = currentBlock.number + 10

      const defaultAssetConfig = {
        activated: true,
        platformFeePortion: chance.integer({ min: 0, max: 100000 }),
        disputeHandlingFeePortion: chance.integer({ min: 0, max: 100000 })
      }

      const [wishport] = await contractStateGenerator.afterWishportMint({
        tokenId,
        assetAmount,
        nonce: nonce++,
        sigExpireBlockNum, minter: account,
        owner, authedSigner: authedSigner.address,
        defaultAssetConfig
      })

      const signature = await generateSignature({
        signer: owner,
        types: [
          'string',
          'address',
          'address',
          'uint256',
          'address',
          'uint256',
          'uint256',
        ],
        values: [
          "complete(uint256,address,uint256,bytes,uint256)",
          wishport.address,
          account.address,
          tokenId,
          fulfiller.address,
          nonce,
          sigExpireBlockNum,
        ],
      })

      const expectedPlatformFee = SafeMath.div(SafeMath.mul(assetAmount, defaultAssetConfig.platformFeePortion), (await wishport.BASE_PORTION()).toNumber())
      await expectEvent(
        wishport.connect(account).complete,
        [
          tokenId,
          fulfiller.address,
          nonce,
          signature,
          sigExpireBlockNum
        ],
        {
          contract: wishport,
          eventSignature: 'Complete(uint256,address,uint256,uint256)',
          eventArgs: {
            tokenId,
            fulfiller: fulfiller.address,
            netReward: SafeMath.sub(assetAmount, expectedPlatformFee),
            platformfee: expectedPlatformFee
          },
        },
      )
    }

    await ethers.provider.send('evm_revert', [snapshot_id])
  })

  it(`should throw error if the message hash signature has already been expired`, async () => {
    const [owner, account, fulfiller] = await ethers.getSigners()

    const snapshot_id = await ethers.provider.send('evm_snapshot', [])
    {

      const tokenId = 0
      let nonce = 0
      const assetAmount = chance.integer({ min: 0.02, max: 2000 })

      const [wishport] = await contractStateGenerator.afterWishportMint({
        tokenId,
        assetAmount,
        nonce: nonce++,
        sigExpireBlockNum: (await getCurrentBlock()).number + 10, minter: account,
        owner,
      })

      const sigExpireBlockNum = (await getCurrentBlock()).number + 1
      const signature = await generateSignature({
        signer: owner,
        types: [
          'string',
          'address',
          'address',
          'uint256',
          'address',
          'uint256',
          'uint256',
        ],
        values: [
          "complete(uint256,address,uint256,bytes,uint256)",
          wishport.address,
          account.address,
          tokenId,
          fulfiller.address,
          nonce,
          sigExpireBlockNum,
        ],
      })
      await ethers.provider.send('evm_mine', [])
      await ethers.provider.send('evm_mine', [])

      expect((await getCurrentBlock()).number).to.be.greaterThan(
        sigExpireBlockNum,
      )
      await expectRevert(
        wishport
          .connect(account)
          .complete(
            tokenId,
            fulfiller.address,
            nonce,
            signature,
            sigExpireBlockNum
          ),
        'Wishport:SignatureExpired',
      )
    }

    await ethers.provider.send('evm_revert', [snapshot_id])
  })

  it(`should throw error if the token as not been minted`, async () => {
    const [owner, account, fulfiller] = await ethers.getSigners()
    const [wishport, _wish] = await contractDeployer.Wishport({ owner })

    const snapshot_id = await ethers.provider.send('evm_snapshot', [])
    {
      const currentBlock = await getCurrentBlock()

      const tokenId = 0
      let nonce = 0
      const sigExpireBlockNum = currentBlock.number + 10

      const signature = await generateSignature({
        signer: owner,
        types: [
          'string',
          'address',
          'address',
          'uint256',
          'address',
          'uint256',
          'uint256',
        ],
        values: [
          "complete(uint256,address,uint256,bytes,uint256)",
          wishport.address,
          account.address,
          tokenId,
          fulfiller.address,
          nonce,
          sigExpireBlockNum,
        ],
      })
      await expectRevert(
        wishport
          .connect(account)
          .complete(
            tokenId,
            fulfiller.address,
            nonce,
            signature,
            sigExpireBlockNum
          ),
        'Wishport:InvalidToken',
      )
    }

    await ethers.provider.send('evm_revert', [snapshot_id])
  })

  // TODO: test scenario: should throw error if the token has been completed

  it(`
    If the token has been minted in ether
    should increment the corresponding clamable ether balance of the fulfiller
    even if the caller is not the fulfiller
  `, async () => {
    const [owner, account, fulfiller, caller] = await ethers.getSigners()

    const snapshot_id = await ethers.provider.send('evm_snapshot', [])
    {
      const currentBlock = await getCurrentBlock()

      const tokenId = 0
      let nonce = 0
      const assetAmount = chance.integer({ min: 0.02, max: 2000 })
      const sigExpireBlockNum = currentBlock.number + 10

      const defaultAssetConfig = {
        activated: true,
        platformFeePortion: chance.integer({ min: 0, max: 100000 }),
        disputeHandlingFeePortion: chance.integer({ min: 0, max: 100000 })
      }

      const [wishport] = await contractStateGenerator.afterWishportMint({
        tokenId,
        assetAmount,
        nonce: nonce++,
        sigExpireBlockNum,
        minter: account,
        owner,
        defaultAssetConfig
      })

      const signature = await generateSignature({
        signer: owner,
        types: [
          'string',
          'address',
          'address',
          'uint256',
          'address',
          'uint256',
          'uint256',
        ],
        values: [
          "complete(uint256,address,uint256,bytes,uint256)",
          wishport.address,
          caller.address,
          tokenId,
          fulfiller.address,
          nonce,
          sigExpireBlockNum,
        ],
      })

      const expectedPlatformFee = SafeMath.div(SafeMath.mul(assetAmount, defaultAssetConfig.platformFeePortion), (await wishport.BASE_PORTION()).toNumber())

      const before = UnitParser.fromEther(await wishport.claimable(fulfiller.address, ZERO_ADDRESS))
      await wishport.connect(caller).complete(tokenId,
        fulfiller.address,
        nonce,
        signature,
        sigExpireBlockNum)
      const after = UnitParser.fromEther(await wishport.claimable(fulfiller.address, ZERO_ADDRESS))

      expect(caller.address).not.to.equal(fulfiller.address)
      expect(after).to.be.greaterThan(before)
      expect(SafeMath.sub(after, before)).to.equal(SafeMath.sub(assetAmount, expectedPlatformFee))
    }

    await ethers.provider.send('evm_revert', [snapshot_id])
  })

  it(`
    If the token has been minted in ERC20
    should increment the corresponding clamable ERC20 balance of the fulfiller
    even if the caller is not the fulfiller
  `, async () => {
    const [owner, account, fulfiller, caller] = await ethers.getSigners()
    const [assetToken] = await contractDeployer.TestERC20({ owner })
    const snapshot_id = await ethers.provider.send('evm_snapshot', [])
    {
      const currentBlock = await getCurrentBlock()

      const tokenId = 0
      let nonce = 0
      const assetAmount = chance.integer({ min: 0.02, max: 2000 })
      const sigExpireBlockNum = currentBlock.number + 10

      const defaultAssetConfig = {
        activated: true,
        platformFeePortion: chance.integer({ min: 0, max: 100000 }),
        disputeHandlingFeePortion: chance.integer({ min: 0, max: 100000 })
      }

      const [wishport] = await contractStateGenerator.afterWishportMint({
        tokenId,
        assetAmount,
        nonce: nonce++,
        sigExpireBlockNum,
        minter: account,
        owner,
        assetToken,
        defaultAssetConfig
      })

      const signature = await generateSignature({
        signer: owner,
        types: [
          'string',
          'address',
          'address',
          'uint256',
          'address',
          'uint256',
          'uint256',
        ],
        values: [
          "complete(uint256,address,uint256,bytes,uint256)",
          wishport.address,
          caller.address,
          tokenId,
          fulfiller.address,
          nonce,
          sigExpireBlockNum,
        ],
      })

      const decimals = await assetToken.decimals()
      const expectedPlatformFee = SafeMath.div(SafeMath.mul(assetAmount, defaultAssetConfig.platformFeePortion), (await wishport.BASE_PORTION()).toNumber())

      const before = UnitParser.fromBigNumber(await wishport.claimable(fulfiller.address, assetToken.address), decimals)

      await wishport.connect(caller).complete(tokenId,
        fulfiller.address,
        nonce,
        signature,
        sigExpireBlockNum)

      const after = UnitParser.fromBigNumber(await wishport.claimable(fulfiller.address, assetToken.address), decimals)

      expect(caller.address).not.to.equal(fulfiller.address)
      expect(after).to.be.greaterThan(before)
      expect(SafeMath.sub(after, before)).to.equal(SafeMath.sub(assetAmount, expectedPlatformFee))
    }

    await ethers.provider.send('evm_revert', [snapshot_id])
  })


  it(`
    If the token has been minted in ether
    should reset the reward info amount to zero
  `, async () => {
    const [owner, account, fulfiller] = await ethers.getSigners()

    const snapshot_id = await ethers.provider.send('evm_snapshot', [])
    {
      const currentBlock = await getCurrentBlock()

      const tokenId = 0
      let nonce = 0
      const assetAmount = chance.integer({ min: 0.02, max: 2000 })
      const sigExpireBlockNum = currentBlock.number + 10

      const [wishport] = await contractStateGenerator.afterWishportMint({
        tokenId,
        assetAmount,
        nonce: nonce++,
        sigExpireBlockNum,
        minter: account,
        owner,
      })

      const signature = await generateSignature({
        signer: owner,
        types: [
          'string',
          'address',
          'address',
          'uint256',
          'address',
          'uint256',
          'uint256',
        ],
        values: [
          "complete(uint256,address,uint256,bytes,uint256)",
          wishport.address,
          account.address,
          tokenId,
          fulfiller.address,
          nonce,
          sigExpireBlockNum,
        ],
      })

      const before = await wishport.wishRewardInfo(tokenId)
      await wishport.connect(account).complete(tokenId,
        fulfiller.address,
        nonce,
        signature,
        sigExpireBlockNum)
      const after = await wishport.wishRewardInfo(tokenId)

      expect(after.token).to.equal(before.token)
      expect(after.token).to.equal(ZERO_ADDRESS)
      expect(UnitParser.fromEther(after.amount)).not.to.equal(UnitParser.fromEther(before.amount))
      expect(UnitParser.fromEther(after.amount)).to.equal(0)
    }

    await ethers.provider.send('evm_revert', [snapshot_id])
  })

  it(`
    If the token has been minted in ERC20
    should reset the token address and reward amount in corr. token reward info
  `, async () => {
    const [owner, account, fulfiller] = await ethers.getSigners()
    const [assetToken] = await contractDeployer.TestERC20({ owner })
    const snapshot_id = await ethers.provider.send('evm_snapshot', [])
    {
      const currentBlock = await getCurrentBlock()

      const tokenId = 0
      let nonce = 0
      const assetAmount = chance.integer({ min: 0.02, max: 2000 })
      const sigExpireBlockNum = currentBlock.number + 10

      const [wishport] = await contractStateGenerator.afterWishportMint({
        tokenId,
        assetAmount,
        nonce: nonce++,
        sigExpireBlockNum,
        minter: account,
        owner,
        assetToken
      })

      const signature = await generateSignature({
        signer: owner,
        types: [
          'string',
          'address',
          'address',
          'uint256',
          'address',
          'uint256',
          'uint256',
        ],
        values: [
          "complete(uint256,address,uint256,bytes,uint256)",
          wishport.address,
          account.address,
          tokenId,
          fulfiller.address,
          nonce,
          sigExpireBlockNum,
        ],
      })

      const decimals = await assetToken.decimals()

      const before = await wishport.wishRewardInfo(tokenId)
      await wishport.connect(account).complete(tokenId,
        fulfiller.address,
        nonce,
        signature,
        sigExpireBlockNum)

      const after = await wishport.wishRewardInfo(tokenId)

      expect(after.token).not.to.equal(before.token)
      expect(after.token).to.equal(ZERO_ADDRESS)
      expect(UnitParser.fromBigNumber(after.amount, decimals)).not.to.equal(UnitParser.fromBigNumber(before.amount, decimals))
      expect(UnitParser.fromBigNumber(after.amount, decimals)).to.equal(0)
    }

    await ethers.provider.send('evm_revert', [snapshot_id])
  })


  it(`
    should set the token status to completed
  `, async () => {
    const [owner, account, fulfiller] = await ethers.getSigners()
    const [assetToken] = await contractDeployer.TestERC20({ owner })

    const snapshot_id = await ethers.provider.send('evm_snapshot', [])
    {
      const currentBlock = await getCurrentBlock()

      const tokenId = 0
      let nonce = 0
      const assetAmount = chance.integer({ min: 0.02, max: 2000 })
      const sigExpireBlockNum = currentBlock.number + 10

      const [wishport, wish] = await contractStateGenerator.afterWishportMint({
        tokenId,
        assetAmount,
        nonce: nonce++,
        sigExpireBlockNum,
        minter: account,
        owner,
        assetToken
      })

      const signature = await generateSignature({
        signer: owner,
        types: [
          'string',
          'address',
          'address',
          'uint256',
          'address',
          'uint256',
          'uint256',
        ],
        values: [
          "complete(uint256,address,uint256,bytes,uint256)",
          wishport.address,
          account.address,
          tokenId,
          fulfiller.address,
          nonce,
          sigExpireBlockNum,
        ],
      })

      const before = await wish.completed(tokenId)

      await wishport.connect(account).complete(tokenId,
        fulfiller.address,
        nonce,
        signature,
        sigExpireBlockNum)

      const after = await wish.completed(tokenId)
      expect(before).to.be.false
      expect(after).to.be.true
    }

    await ethers.provider.send('evm_revert', [snapshot_id])
  })

  // TODO: test scenario: should throw error if setCompleted is not success when calling external erc721 wish token contract

  it(`should emit a Complete event with correct params `, async () => {
    const [owner, account, fulfiller] = await ethers.getSigners()

    const snapshot_id = await ethers.provider.send('evm_snapshot', [])
    {
      const currentBlock = await getCurrentBlock()

      const tokenId = 0
      let nonce = 0
      const assetAmount = chance.integer({ min: 0.02, max: 2000 })
      const sigExpireBlockNum = currentBlock.number + 10

      const defaultAssetConfig = {
        activated: true,
        platformFeePortion: chance.integer({ min: 0, max: 100000 }),
        disputeHandlingFeePortion: chance.integer({ min: 0, max: 100000 })
      }

      const [wishport] = await contractStateGenerator.afterWishportMint({
        tokenId,
        assetAmount,
        nonce: nonce++,
        sigExpireBlockNum,
        minter: account,
        owner,
        defaultAssetConfig
      })

      const signature = await generateSignature({
        signer: owner,
        types: [
          'string',
          'address',
          'address',
          'uint256',
          'address',
          'uint256',
          'uint256',
        ],
        values: [
          "complete(uint256,address,uint256,bytes,uint256)",
          wishport.address,
          account.address,
          tokenId,
          fulfiller.address,
          nonce,
          sigExpireBlockNum,
        ],
      })

      const expectedPlatformFee = SafeMath.div(SafeMath.mul(assetAmount, defaultAssetConfig.platformFeePortion), (await wishport.BASE_PORTION()).toNumber())
      await expectEvent(
        wishport.connect(account).complete,
        [
          tokenId,
          fulfiller.address,
          nonce,
          signature,
          sigExpireBlockNum
        ],
        {
          contract: wishport,
          eventSignature: 'Complete',
          eventArgs: {
            tokenId,
            fulfiller: fulfiller.address,
            netReward: SafeMath.sub(assetAmount, expectedPlatformFee),
            platformfee: expectedPlatformFee
          },
        },
      )
      await ethers.provider.send('evm_mine', [])
    }

    await ethers.provider.send('evm_revert', [snapshot_id])
  })
})
