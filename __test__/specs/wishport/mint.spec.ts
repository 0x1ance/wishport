import { MAX_UINT256, ZERO_ADDRESS } from '../../../ethers-test-helpers/consts';
import { Chance } from 'chance';
import { contractDeployer } from '../../utils/ContractDeployer';
import { expect } from 'chai'
import { ethers } from 'hardhat';
import { expectEvent, expectFnReturnChange, expectRevert, parseNumber, ParseNumberTypeEnum } from '../../../ethers-test-helpers';
import { generateSignature, getCurrentBlock } from '../../../hardhat-test-helpers';
import { UnitParser } from '../../utils/UnitParser';

const chance = new Chance()

describe('UNIT TEST: Wishport Contract - mint', () => {
  it(`should throw error when the input nonce has already been consumed`, async () => {
    const [owner, minter] = await ethers.getSigners()
    const [wishport, _wish] = await contractDeployer.Wishport({ owner })

    const snapshot_id = await ethers.provider.send('evm_snapshot', [])
    {
      const currentBlock = await getCurrentBlock()

      const tokenId = 0
      const assetAddress = ZERO_ADDRESS
      const assetAmount_ = chance.integer({ min: 0.02, max: 2000 })
      const nonce = 0
      const sigExpireBlockNum = currentBlock.number + 1

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
          'uint256',
        ],
        values: [
          "mint(uint256,address,uint256,uint256,uint256,bytes)",
          wishport.address,
          minter.address,
          tokenId,
          assetAddress,
          UnitParser.toEther(assetAmount_),
          nonce,
          sigExpireBlockNum,
        ],
      })

      await wishport.connect(minter).mint(tokenId,
        assetAddress,
        UnitParser.toEther(assetAmount_),
        nonce,
        sigExpireBlockNum,
        signature,
        { value: UnitParser.toEther(assetAmount_) })


      await expectRevert(
        wishport
          .connect(minter)
          .mint(tokenId,
            assetAddress,
            UnitParser.toEther(assetAmount_),
            nonce,
            sigExpireBlockNum,
            signature,
            { value: UnitParser.toEther(assetAmount_) }
          ),
        'Wishport:InvalidNonce',
      )
    }

    await ethers.provider.send('evm_revert', [snapshot_id])
  })
  it(`should update the user nonce comsumption status
      `, async () => {
    const [owner, minter] = await ethers.getSigners()
    const [wishport, _wish] = await contractDeployer.Wishport({ owner })

    const snapshot_id = await ethers.provider.send('evm_snapshot', [])
    {
      const currentBlock = await getCurrentBlock()

      const tokenId = 0
      const assetAddress = ZERO_ADDRESS
      const assetAmount_ = chance.integer({ min: 0.02, max: 2000 })
      const nonce = 0
      const sigExpireBlockNum = currentBlock.number + 1

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
          'uint256',
        ],
        values: [
          "mint(uint256,address,uint256,uint256,uint256,bytes)",
          wishport.address,
          minter.address,
          tokenId,
          assetAddress,
          UnitParser.toEther(assetAmount_),
          nonce,
          sigExpireBlockNum,
        ],
      })

      await expectFnReturnChange(
        wishport.connect(minter).mint,
        [
          tokenId,
          assetAddress,
          UnitParser.toEther(assetAmount_),
          nonce,
          sigExpireBlockNum,
          signature,
          { value: UnitParser.toEther(assetAmount_) },
        ],
        {
          contract: wishport,
          functionSignature: 'nonce',
          params: [minter.address, nonce],
          expectedBefore: false,
          expectedAfter: true,
        },
      )
    }
    await ethers.provider.send('evm_revert', [snapshot_id])
  })
  it(`should throw error if the message hash signer is not the authedSigner`, async () => {
    const [owner, minter, authedSigner, unauthedSigner] = await ethers.getSigners()
    const [wishport, _wish] = await contractDeployer.Wishport({ owner, authedSigner: authedSigner.address })

    const snapshot_id = await ethers.provider.send('evm_snapshot', [])
    {
      const currentBlock = await getCurrentBlock()

      const tokenId = 0
      const assetAddress = ZERO_ADDRESS
      const assetAmount_ = chance.integer({ min: 0.02, max: 2000 })
      const nonce = 0
      const sigExpireBlockNum = currentBlock.number + 1

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
          'uint256',
        ],
        values: [
          "mint(uint256,address,uint256,uint256,uint256,bytes)",
          wishport.address,
          minter.address,
          tokenId,
          assetAddress,
          UnitParser.toEther(assetAmount_),
          nonce,
          sigExpireBlockNum,
        ],
      })
      await expectRevert(
        wishport
          .connect(minter)
          .mint(tokenId,
            assetAddress,
            UnitParser.toEther(assetAmount_),
            nonce,
            sigExpireBlockNum,
            signature,
            { value: UnitParser.toEther(assetAmount_) }
          ),
        'Wishport:InvalidSigner',
      )
    }

    await ethers.provider.send('evm_revert', [snapshot_id])
  })
  it(`should allow the minting if the signer is owner but not the authedSigner`, async () => {
    const [owner, minter, authedSigner, unauthedSigner] = await ethers.getSigners()
    const [wishport, _wish] = await contractDeployer.Wishport({ owner, authedSigner: authedSigner.address })

    const snapshot_id = await ethers.provider.send('evm_snapshot', [])
    {
      const currentBlock = await getCurrentBlock()

      const tokenId = 0
      const assetAddress = ZERO_ADDRESS
      const assetAmount_ = chance.integer({ min: 0.02, max: 2000 })
      const nonce = 0
      const sigExpireBlockNum = currentBlock.number + 1

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
          'uint256',
        ],
        values: [
          "mint(uint256,address,uint256,uint256,uint256,bytes)",
          wishport.address,
          minter.address,
          tokenId,
          assetAddress,
          UnitParser.toEther(assetAmount_),
          nonce,
          sigExpireBlockNum,
        ],
      })
      await expectEvent(
        wishport.connect(minter).mint,
        [
          tokenId,
          assetAddress,
          UnitParser.toEther(assetAmount_),
          nonce,
          sigExpireBlockNum,
          signature,
          { value: UnitParser.toEther(assetAmount_) },
        ],
        {
          contract: wishport,
          eventSignature: 'Mint(uint256,address,uint256)',
          eventArgs: {
            tokenId,
            rewardToken: ZERO_ADDRESS,
            rewardAmount: assetAmount_,
          },
        },
      )
    }

    await ethers.provider.send('evm_revert', [snapshot_id])
  })
  it(`should throw error if the message hash has already been expired`, async () => {
    const [owner, minter] = await ethers.getSigners()
    const [wishport, _wish] = await contractDeployer.Wishport({ owner })

    const snapshot_id = await ethers.provider.send('evm_snapshot', [])
    {
      const currentBlock = await getCurrentBlock()

      const tokenId = 0
      const assetAddress = ZERO_ADDRESS
      const assetAmount_ = chance.integer({ min: 0.02, max: 2000 })
      const nonce = 0
      const sigExpireBlockNum = currentBlock.number + 1

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
          'uint256',
        ],
        values: [
          "mint(uint256,address,uint256,uint256,uint256,bytes)",
          wishport.address,
          minter.address,
          tokenId,
          assetAddress,
          UnitParser.toEther(assetAmount_),
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
          .connect(minter)
          .mint(tokenId,
            assetAddress,
            UnitParser.toEther(assetAmount_),
            nonce,
            sigExpireBlockNum,
            signature,
            { value: UnitParser.toEther(assetAmount_) }
          ),
        'Wishport:SignatureExpired',
      )
    }

    await ethers.provider.send('evm_revert', [snapshot_id])
  })

  it(`
      IF pay with ether
      should throw error if the send ether is not enough
      `, async () => {

    const [owner, minter] = await ethers.getSigners()
    const [wishport, _wish] = await contractDeployer.Wishport({ owner })

    const snapshot_id = await ethers.provider.send('evm_snapshot', [])
    {
      const currentBlock = await getCurrentBlock()

      const tokenId = 0
      const assetAddress = ZERO_ADDRESS
      const assetAmount_ = chance.integer({ min: 0.02, max: 2000 })
      const nonce = 0
      const sigExpireBlockNum = currentBlock.number + 1

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
          'uint256',
        ],
        values: [
          "mint(uint256,address,uint256,uint256,uint256,bytes)",
          wishport.address,
          minter.address,
          tokenId,
          assetAddress,
          UnitParser.toEther(assetAmount_),
          nonce,
          sigExpireBlockNum,
        ],
      })

      await expectRevert(
        wishport.connect(minter).mint(tokenId,
          assetAddress,
          UnitParser.toEther(assetAmount_),
          nonce,
          sigExpireBlockNum,
          signature,
          { value: UnitParser.toEther(assetAmount_ / 2) }),
        'Wishport:InsufficientBalance',
      )
    }

    await ethers.provider.send('evm_revert', [snapshot_id])
  })
  it(`
  IF pay with ether
  should save reward info with token == zero address && amount == assetAmount_
  `, async () => {
    const [owner, minter] = await ethers.getSigners()
    const [wishport, _wish] = await contractDeployer.Wishport({ owner })

    const snapshot_id = await ethers.provider.send('evm_snapshot', [])
    {
      const currentBlock = await getCurrentBlock()

      const tokenId = 0
      const assetAddress = ZERO_ADDRESS
      const assetAmount_ = chance.integer({ min: 0.02, max: 2000 })
      const nonce = 0
      const sigExpireBlockNum = currentBlock.number + 1

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
          'uint256',
        ],
        values: [
          "mint(uint256,address,uint256,uint256,uint256,bytes)",
          wishport.address,
          minter.address,
          tokenId,
          assetAddress,
          UnitParser.toEther(assetAmount_),
          nonce,
          sigExpireBlockNum,
        ],
      })
      const before = await wishport.wishRewardInfo(tokenId)

      await wishport.connect(minter).mint(tokenId,
        assetAddress,
        UnitParser.toEther(assetAmount_),
        nonce,
        sigExpireBlockNum,
        signature,
        { value: UnitParser.toEther(assetAmount_) })


      const after = await wishport.wishRewardInfo(tokenId)

      expect(before.token).to.equal(ZERO_ADDRESS)
      expect(before.amount).to.equal(0)
      expect(after.token).to.equal(ZERO_ADDRESS)
      expect(UnitParser.fromEther(after.amount)).to.equal(assetAmount_)
    }

    await ethers.provider.send('evm_revert', [snapshot_id])
  })
  it(`
      IF pay with ERC20
      should throw error if the erc20 address is not a valid contract address
      `, async () => {
    const [owner, minter, invalidErc20] = await ethers.getSigners()
    const [wishport, _wish] = await contractDeployer.Wishport({ owner })

    const snapshot_id = await ethers.provider.send('evm_snapshot', [])
    {
      const currentBlock = await getCurrentBlock()

      const tokenId = 0
      const assetAddress = invalidErc20.address
      const assetAmount_ = chance.integer({ min: 0.02, max: 2000 })
      const nonce = 0
      const sigExpireBlockNum = currentBlock.number + 1

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
          'uint256',
        ],
        values: [
          "mint(uint256,address,uint256,uint256,uint256,bytes)",
          wishport.address,
          minter.address,
          tokenId,
          assetAddress,
          UnitParser.toEther(assetAmount_),
          nonce,
          sigExpireBlockNum,
        ],
      })

      await expectRevert(
        wishport.connect(minter).mint(tokenId,
          assetAddress,
          UnitParser.toEther(assetAmount_),
          nonce,
          sigExpireBlockNum,
          signature,),
        'Transaction reverted without a reason string',
      )
    }

    await ethers.provider.send('evm_revert', [snapshot_id])
  })
  it(`
    IF pay with ERC20
    should throw error if the wishport has not enough allowance
  `, async () => {
    const [owner, minter] = await ethers.getSigners()
    const [wishport, _wish] = await contractDeployer.Wishport({ owner })
    const [erc20] = await contractDeployer.TestERC20({ owner })
    const decimals = await erc20.decimals()

    const snapshot_id = await ethers.provider.send('evm_snapshot', [])
    {
      const currentBlock = await getCurrentBlock()
      const tokenId = 0
      const assetAddress = erc20.address
      const assetAmount_ = chance.integer({ min: 0.02, max: 2000 })
      const nonce = 0
      const sigExpireBlockNum = currentBlock.number + 100

      // mint king token for caller
      await erc20
        .connect(minter)
        .mint(
          minter.address,
          UnitParser.toBigNumber(assetAmount_, decimals),
        )
      // approve all buyer king to dtkStore
      await erc20.connect(minter).approve(wishport.address, UnitParser.toBigNumber(assetAmount_ / 2, decimals),)

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
          'uint256',
        ],
        values: [
          "mint(uint256,address,uint256,uint256,uint256,bytes)",
          wishport.address,
          minter.address,
          tokenId,
          assetAddress,
          UnitParser.toBigNumber(assetAmount_, decimals),
          nonce,
          sigExpireBlockNum,
        ],
      })

      await expectRevert(
        wishport.connect(minter).mint(tokenId,
          assetAddress,
          UnitParser.toBigNumber(assetAmount_, decimals),
          nonce,
          sigExpireBlockNum,
          signature
        ),
        'ERC20: insufficient allowance',
      )
    }

    await ethers.provider.send('evm_revert', [snapshot_id])
  })
  it(`
    IF pay with ERC20
    should throw error if the wishport has enough allowance but caller has not enough balance
  `, async () => {
    const [owner, minter] = await ethers.getSigners()
    const [wishport, _wish] = await contractDeployer.Wishport({ owner })
    const [erc20] = await contractDeployer.TestERC20({ owner })
    const decimals = await erc20.decimals()

    const snapshot_id = await ethers.provider.send('evm_snapshot', [])
    {
      const currentBlock = await getCurrentBlock()
      const tokenId = 0
      const assetAddress = erc20.address
      const assetAmount_ = chance.integer({ min: 0.02, max: 2000 })
      const nonce = 0
      const sigExpireBlockNum = currentBlock.number + 100

      // mint king token for caller
      await erc20
        .connect(minter)
        .mint(
          minter.address,
          UnitParser.toBigNumber(assetAmount_ / 2, decimals),
        )
      // approve all buyer king to dtkStore
      await erc20.connect(minter).approve(wishport.address, UnitParser.toBigNumber(assetAmount_, decimals))

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
          'uint256',
        ],
        values: [
          "mint(uint256,address,uint256,uint256,uint256,bytes)",
          wishport.address,
          minter.address,
          tokenId,
          assetAddress,
          UnitParser.toBigNumber(assetAmount_, decimals),
          nonce,
          sigExpireBlockNum,
        ],
      })

      await expectRevert(
        wishport.connect(minter).mint(tokenId,
          assetAddress,
          UnitParser.toBigNumber(assetAmount_, decimals),
          nonce,
          sigExpireBlockNum,
          signature
        ),
        'ERC20: transfer amount exceeds balance',
      )
    }

    await ethers.provider.send('evm_revert', [snapshot_id])
  })
  it(`
    IF pay with ERC20
    should save the token info with correct tokenAddress && before|after wishport balance change as amount
  `, async () => {
    const [owner, minter] = await ethers.getSigners()
    const [wishport, _wish] = await contractDeployer.Wishport({ owner })
    const [erc20] = await contractDeployer.TestUSDT({ owner })
    const decimals = await erc20.decimals()

    const snapshot_id = await ethers.provider.send('evm_snapshot', [])
    {
      const currentBlock = await getCurrentBlock()
      const tokenId = 0
      const assetAddress = erc20.address
      const assetAmount_ = chance.integer({ min: 0.02, max: 2000 })
      const nonce = 0
      const sigExpireBlockNum = currentBlock.number + 100

      // mint king token for caller
      await erc20
        .connect(minter)
        .mint(
          minter.address,
          UnitParser.toBigNumber(assetAmount_, decimals),
        )
      // approve all buyer king to dtkStore
      await erc20.connect(minter).approve(wishport.address, UnitParser.toBigNumber(assetAmount_, decimals))

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
          'uint256',
        ],
        values: [
          "mint(uint256,address,uint256,uint256,uint256,bytes)",
          wishport.address,
          minter.address,
          tokenId,
          assetAddress,
          UnitParser.toBigNumber(assetAmount_, decimals),
          nonce,
          sigExpireBlockNum,
        ],
      })

      const before = UnitParser.fromBigNumber(await erc20.balanceOf(wishport.address), decimals)

      await wishport.connect(minter).mint(tokenId,
        assetAddress,
        UnitParser.toEther(assetAmount_),
        nonce,
        sigExpireBlockNum,
        signature
      )
      const after = UnitParser.fromBigNumber(await erc20.balanceOf(wishport.address), decimals)

      const rewardInfo = await wishport.wishRewardInfo(tokenId)
      expect(rewardInfo.token).to.equal(assetAddress)
      expect(UnitParser.fromBigNumber(rewardInfo.amount, decimals)).not.to.equal(assetAmount_)
      expect(UnitParser.fromBigNumber(rewardInfo.amount, decimals)).to.equal(after + before)
    }

    await ethers.provider.send('evm_revert', [snapshot_id])
  })
  it(`
    should throw error if the wish has already been minted
  `, async () => {
    const [owner, minter] = await ethers.getSigners()
    const [wishport, _wish] = await contractDeployer.Wishport({ owner })
    const [erc20] = await contractDeployer.TestUSDT({ owner })
    const decimals = await erc20.decimals()

    const snapshot_id = await ethers.provider.send('evm_snapshot', [])
    {
      const currentBlock = await getCurrentBlock()
      const tokenId = 0
      const assetAddress = erc20.address
      const assetAmount_ = chance.integer({ min: 0.02, max: 2000 })
      const sigExpireBlockNum = currentBlock.number + 100

      // mint king token for caller
      await erc20
        .connect(minter)
        .mint(
          minter.address,
          UnitParser.toBigNumber(assetAmount_ * 10, decimals),
        )
      // approve all buyer king to dtkStore
      await erc20.connect(minter).approve(wishport.address, UnitParser.toBigNumber(assetAmount_ * 2, decimals),)

      const firstSig = await generateSignature({
        signer: owner,
        types: [
          'string',
          'address',
          'address',
          'uint256',
          'address',
          'uint256',
          'uint256',
          'uint256',
        ],
        values: [
          "mint(uint256,address,uint256,uint256,uint256,bytes)",
          wishport.address,
          minter.address,
          tokenId,
          assetAddress,
          UnitParser.toBigNumber(assetAmount_, decimals),
          0,
          sigExpireBlockNum,
        ],
      })

      await wishport.connect(minter).mint(tokenId,
        assetAddress,
        UnitParser.toBigNumber(assetAmount_, decimals),
        0,
        sigExpireBlockNum,
        firstSig
      )

      const secondSig = await generateSignature({
        signer: owner,
        types: [
          'string',
          'address',
          'address',
          'uint256',
          'address',
          'uint256',
          'uint256',
          'uint256',
        ],
        values: [
          "mint(uint256,address,uint256,uint256,uint256,bytes)",
          wishport.address,
          minter.address,
          tokenId,
          assetAddress,
          UnitParser.toBigNumber(assetAmount_, decimals),
          1,
          sigExpireBlockNum,
        ],
      })
      await expectRevert(
        wishport.connect(minter).mint(tokenId,
          assetAddress,
          UnitParser.toBigNumber(assetAmount_, decimals),
          1,
          sigExpireBlockNum,
          secondSig
        ),
        'ERC721: token already minted',
      )
    }

    await ethers.provider.send('evm_revert', [snapshot_id])
  })
  it(`
  IF pay with ether
  should increment the wishport contract balance of base ether
  `, async () => {
    const [owner, minter] = await ethers.getSigners()
    const [wishport, _wish] = await contractDeployer.Wishport({ owner })

    const snapshot_id = await ethers.provider.send('evm_snapshot', [])
    {
      const currentBlock = await getCurrentBlock()

      const tokenId = 0
      const assetAddress = ZERO_ADDRESS
      const assetAmount_ = chance.integer({ min: 0.02, max: 2000 })
      const nonce = 0
      const sigExpireBlockNum = currentBlock.number + 1

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
          'uint256',
        ],
        values: [
          "mint(uint256,address,uint256,uint256,uint256,bytes)",
          wishport.address,
          minter.address,
          tokenId,
          assetAddress,
          UnitParser.toEther(assetAmount_),
          nonce,
          sigExpireBlockNum,
        ],
      })
      const beforeBalance = parseNumber(
        await ethers.provider.getBalance(wishport.address), {
        type: ParseNumberTypeEnum.ETHER
      }
      )

      await wishport.connect(minter).mint(tokenId,
        assetAddress,
        UnitParser.toEther(assetAmount_),
        nonce,
        sigExpireBlockNum,
        signature,
        { value: UnitParser.toEther(assetAmount_) })


      const afterBalance = parseNumber(
        await ethers.provider.getBalance(wishport.address), {
        type: ParseNumberTypeEnum.ETHER
      }
      )
      expect(afterBalance).to.equal(beforeBalance + assetAmount_)
    }

    await ethers.provider.send('evm_revert', [snapshot_id])
  })
  it(`should emit a Mint event with correct params `, async () => {
    const [owner, minter] = await ethers.getSigners()
    const [wishport, _wish] = await contractDeployer.Wishport({ owner })

    const snapshot_id = await ethers.provider.send('evm_snapshot', [])
    {
      const currentBlock = await getCurrentBlock()

      const tokenId = 0
      const assetAddress = ZERO_ADDRESS
      const assetAmount_ = chance.integer({ min: 0.02, max: 2000 })
      const nonce = 0
      const sigExpireBlockNum = currentBlock.number + 1

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
          'uint256',
        ],
        values: [
          "mint(uint256,address,uint256,uint256,uint256,bytes)",
          wishport.address,
          minter.address,
          tokenId,
          assetAddress,
          UnitParser.toEther(assetAmount_),
          nonce,
          sigExpireBlockNum,
        ],
      })

      await expectEvent(
        wishport.connect(minter).mint,
        [
          tokenId,
          assetAddress,
          UnitParser.toEther(assetAmount_),
          nonce,
          sigExpireBlockNum,
          signature,
          { value: UnitParser.toEther(assetAmount_) },
        ],
        {
          contract: wishport,
          eventSignature: 'Mint(uint256,address,uint256)',
          eventArgs: {
            tokenId,
            rewardToken: ZERO_ADDRESS,
            rewardAmount: assetAmount_,
          },
        },
      )
      await ethers.provider.send('evm_mine', [])
    }

    await ethers.provider.send('evm_revert', [snapshot_id])
  })
})
