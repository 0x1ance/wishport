import { ZERO_ADDRESS } from "../../../ethers-test-helpers/consts";
import { Chance } from "chance";
import { contractDeployer } from "../../utils/ContractDeployer";
import { expect } from "chai";
import { ethers } from "hardhat";
import {
  expectEvent,
  expectFnReturnChange,
  expectRevert,
  parseNumber,
  ParseNumberTypeEnum,
} from "../../../ethers-test-helpers";
import {
  generateSignature,
  getCurrentBlock,
} from "../../../hardhat-test-helpers";
import { UnitParser } from "../../utils/UnitParser";
import { contractStateGenerator } from "../../utils/ContractStateGenerator";
import { SafeMath } from "../../utils/safeMath";

const chance = new Chance();

describe("UNIT TEST: Wishport Contract - burn", () => {
  it(`should throw error when the input nonce has already been consumed`, async () => {
    const [owner, account] = await ethers.getSigners();

    const snapshot_id = await ethers.provider.send("evm_snapshot", []);
    {
      const currentBlock = await getCurrentBlock();

      const tokenId = 0;
      const assetAmount = chance.integer({ min: 0.02, max: 2000 });
      const nonce = 0;
      const sigExpireBlockNum = currentBlock.number + 10;

      const [wishport] = await contractStateGenerator.afterWishportMint({
        tokenId,
        assetAmount,
        nonce,
        sigExpireBlockNum,
        minter: account,
        owner,
      });

      const signature = await generateSignature({
        signer: owner,
        types: [
          "string",
          "uint256",
          "address",
          "address",
          "uint256",
          "uint256",
          "uint256",
        ],
        values: [
          "burn(uint256,uint256,bytes,uint256)",
          (await owner.provider?.getNetwork())?.chainId,
          wishport.address,
          account.address,
          tokenId,
          nonce,
          sigExpireBlockNum,
        ],
      });

      await expectRevert(
        wishport
          .connect(account)
          .burn(tokenId, nonce, signature, sigExpireBlockNum),
        "Wishport:InvalidNonce"
      );
    }

    await ethers.provider.send("evm_revert", [snapshot_id]);
  });
  it(`should update the user nonce comsumption status
      `, async () => {
    const [owner, account] = await ethers.getSigners();

    const snapshot_id = await ethers.provider.send("evm_snapshot", []);
    {
      const currentBlock = await getCurrentBlock();

      const tokenId = 0;
      let nonce = 0;
      const assetAmount = chance.integer({ min: 0.02, max: 2000 });
      const sigExpireBlockNum = currentBlock.number + 10;

      const [wishport] = await contractStateGenerator.afterWishportMint({
        tokenId,
        assetAmount,
        nonce: nonce++,
        sigExpireBlockNum,
        minter: account,
        owner,
      });

      const signature = await generateSignature({
        signer: owner,
        types: [
          "string",
          "uint256",
          "address",
          "address",
          "uint256",
          "uint256",
          "uint256",
        ],
        values: [
          "burn(uint256,uint256,bytes,uint256)",
          (await owner.provider?.getNetwork())?.chainId,
          wishport.address,
          account.address,
          tokenId,
          nonce,
          sigExpireBlockNum,
        ],
      });

      await expectFnReturnChange(
        wishport.connect(account).burn,
        [tokenId, nonce, signature, sigExpireBlockNum],
        {
          contract: wishport,
          functionSignature: "nonce",
          params: [account.address, nonce],
          expectedBefore: false,
          expectedAfter: true,
        }
      );
    }
    await ethers.provider.send("evm_revert", [snapshot_id]);
  });
  it(`should throw error if the message hash signer is not the authedSigner`, async () => {
    const [owner, account, authedSigner, unauthedSigner] =
      await ethers.getSigners();

    const snapshot_id = await ethers.provider.send("evm_snapshot", []);
    {
      const currentBlock = await getCurrentBlock();

      const tokenId = 0;
      let nonce = 0;
      const assetAmount = chance.integer({ min: 0.02, max: 2000 });
      const sigExpireBlockNum = currentBlock.number + 10;

      const [wishport] = await contractStateGenerator.afterWishportMint({
        tokenId,
        assetAmount,
        nonce: nonce++,
        sigExpireBlockNum,
        minter: account,
        authedSigner: authedSigner.address,
        owner,
      });

      const signature = await generateSignature({
        signer: unauthedSigner,
        types: [
          "string",
          "uint256",
          "address",
          "address",
          "uint256",
          "uint256",
          "uint256",
        ],
        values: [
          "burn(uint256,uint256,bytes,uint256)",
          (await owner.provider?.getNetwork())?.chainId,
          wishport.address,
          account.address,
          tokenId,
          nonce,
          sigExpireBlockNum,
        ],
      });

      await expectRevert(
        wishport
          .connect(account)
          .burn(tokenId, nonce, signature, sigExpireBlockNum),
        "Wishport:InvalidSigner"
      );
    }

    await ethers.provider.send("evm_revert", [snapshot_id]);
  });
  it(`should allow the burning if the signer is owner but not the authedSigner`, async () => {
    const [owner, account, authedSigner] = await ethers.getSigners();

    const snapshot_id = await ethers.provider.send("evm_snapshot", []);
    {
      const currentBlock = await getCurrentBlock();

      const tokenId = 0;
      let nonce = 0;
      const assetAmount = chance.integer({ min: 0.02, max: 2000 });
      const sigExpireBlockNum = currentBlock.number + 10;

      const [wishport] = await contractStateGenerator.afterWishportMint({
        tokenId,
        assetAmount,
        nonce: nonce++,
        sigExpireBlockNum,
        minter: account,
        owner,
        authedSigner: authedSigner.address,
      });

      const signature = await generateSignature({
        signer: owner,
        types: [
          "string",
          "uint256",
          "address",
          "address",
          "uint256",
          "uint256",
          "uint256",
        ],
        values: [
          "burn(uint256,uint256,bytes,uint256)",
          (await owner.provider?.getNetwork())?.chainId,
          wishport.address,
          account.address,
          tokenId,
          nonce,
          sigExpireBlockNum,
        ],
      });

      await expectEvent(
        wishport.connect(account).burn,
        [tokenId, nonce, signature, sigExpireBlockNum],
        {
          contract: wishport,
          eventSignature: "Burn(uint256)",
          eventArgs: {
            tokenId,
          },
        }
      );
    }

    await ethers.provider.send("evm_revert", [snapshot_id]);
  });

  it(`should throw error if the message hash signature has already been expired`, async () => {
    const [owner, account] = await ethers.getSigners();

    const snapshot_id = await ethers.provider.send("evm_snapshot", []);
    {
      const tokenId = 0;
      let nonce = 0;
      const assetAmount = chance.integer({ min: 0.02, max: 2000 });

      const [wishport] = await contractStateGenerator.afterWishportMint({
        tokenId,
        assetAmount,
        nonce: nonce++,
        sigExpireBlockNum: (await getCurrentBlock()).number + 10,
        minter: account,
        owner,
      });

      const sigExpireBlockNum = (await getCurrentBlock()).number + 1;
      const signature = await generateSignature({
        signer: owner,
        types: [
          "string",
          "uint256",
          "address",
          "address",
          "uint256",
          "uint256",
          "uint256",
        ],
        values: [
          "burn(uint256,uint256,bytes,uint256)",
          (await owner.provider?.getNetwork())?.chainId,
          wishport.address,
          account.address,
          tokenId,
          nonce,
          sigExpireBlockNum,
        ],
      });
      await ethers.provider.send("evm_mine", []);
      await ethers.provider.send("evm_mine", []);

      expect((await getCurrentBlock()).number).to.be.greaterThan(
        sigExpireBlockNum
      );
      await expectRevert(
        wishport
          .connect(account)
          .burn(tokenId, nonce, signature, sigExpireBlockNum),
        "Wishport:SignatureExpired"
      );
    }

    await ethers.provider.send("evm_revert", [snapshot_id]);
  });

  it(`should throw error if the token as not been minted`, async () => {
    const [owner, account] = await ethers.getSigners();
    const [wishport, _wish] = await contractDeployer.Wishport({ owner });

    const snapshot_id = await ethers.provider.send("evm_snapshot", []);
    {
      const currentBlock = await getCurrentBlock();

      const tokenId = 0;
      let nonce = 0;
      const sigExpireBlockNum = currentBlock.number + 10;

      const signature = await generateSignature({
        signer: owner,
        types: [
          "string",
          "uint256",
          "address",
          "address",
          "uint256",
          "uint256",
          "uint256",
        ],
        values: [
          "burn(uint256,uint256,bytes,uint256)",
          (await owner.provider?.getNetwork())?.chainId,
          wishport.address,
          account.address,
          tokenId,
          nonce,
          sigExpireBlockNum,
        ],
      });

      await expectRevert(
        wishport
          .connect(account)
          .burn(tokenId, nonce, signature, sigExpireBlockNum),
        "Wishport:InvalidToken"
      );
    }

    await ethers.provider.send("evm_revert", [snapshot_id]);
  });

  it(`should throw error if the token has been completed
  `, async () => {
    const [owner, account, fulfiller] = await ethers.getSigners();

    const snapshot_id = await ethers.provider.send("evm_snapshot", []);
    {
      const tokenId = 0;
      let nonce = 0;
      const assetAmount = chance.integer({ min: 0.02, max: 2000 });

      const [wishport, wish] = await contractStateGenerator.afterWishportMint({
        tokenId,
        assetAmount,
        nonce: nonce++,
        sigExpireBlockNum: (await getCurrentBlock()).number + 10,
        minter: account,
        owner,
      });

      // calling complete first
      const completeSig = await generateSignature({
        signer: owner,
        types: [
          "string",
          "uint256",
          "address",
          "address",
          "uint256",
          "address",
          "uint256",
          "uint256",
        ],
        values: [
          "complete(uint256,address,uint256,bytes,uint256)",
          (await owner.provider?.getNetwork())?.chainId,
          wishport.address,
          account.address,
          tokenId,
          fulfiller.address,
          nonce,
          (await getCurrentBlock()).number + 10,
        ],
      });
      await wishport
        .connect(account)
        .complete(
          tokenId,
          fulfiller.address,
          nonce++,
          completeSig,
          (await getCurrentBlock()).number + 10
        );

      expect(await wish.completed(tokenId)).to.be.true;

      const sigExpireBlockNum = (await getCurrentBlock()).number + 10;

      const signature = await generateSignature({
        signer: owner,
        types: [
          "string",
          "uint256",
          "address",
          "address",
          "uint256",
          "uint256",
          "uint256",
        ],
        values: [
          "burn(uint256,uint256,bytes,uint256)",
          (await owner.provider?.getNetwork())?.chainId,
          wishport.address,
          account.address,
          tokenId,
          nonce,
          sigExpireBlockNum,
        ],
      });

      await expectRevert(
        wishport
          .connect(account)
          .burn(tokenId, nonce, signature, sigExpireBlockNum),
        "Wishport:Unauthorized"
      );
    }
    await ethers.provider.send("evm_revert", [snapshot_id]);
  });

  it(`
    If the token has been minted in ether
    should increment the corresponding clamable ether balance of the token owner
    even if the burner is not token owner
  `, async () => {
    const [owner, account, burner] = await ethers.getSigners();

    const snapshot_id = await ethers.provider.send("evm_snapshot", []);
    {
      const currentBlock = await getCurrentBlock();

      const tokenId = 0;
      let nonce = 0;
      const assetAmount = chance.integer({ min: 0.02, max: 2000 });
      const sigExpireBlockNum = currentBlock.number + 10;

      const [wishport] = await contractStateGenerator.afterWishportMint({
        tokenId,
        assetAmount,
        nonce: nonce++,
        sigExpireBlockNum,
        minter: account,
        owner,
      });

      const signature = await generateSignature({
        signer: owner,
        types: [
          "string",
          "uint256",
          "address",
          "address",
          "uint256",
          "uint256",
          "uint256",
        ],
        values: [
          "burn(uint256,uint256,bytes,uint256)",
          (await owner.provider?.getNetwork())?.chainId,
          wishport.address,
          burner.address,
          tokenId,
          nonce,
          sigExpireBlockNum,
        ],
      });

      const before = UnitParser.fromEther(
        await wishport.claimable(account.address, ZERO_ADDRESS)
      );
      await wishport
        .connect(burner)
        .burn(tokenId, nonce, signature, sigExpireBlockNum);
      const after = UnitParser.fromEther(
        await wishport.claimable(account.address, ZERO_ADDRESS)
      );

      expect(burner.address).not.to.equal(account.address);
      expect(after).to.be.greaterThan(before);
      expect(SafeMath.sub(after, before)).to.equal(assetAmount);
    }

    await ethers.provider.send("evm_revert", [snapshot_id]);
  });

  it(`
    If the token has been minted in ERC20
    should increment the corresponding clamable ERC20 balance of the token owner
    even if the burner is not token owner
  `, async () => {
    const [owner, account, burner] = await ethers.getSigners();
    const [assetToken] = await contractDeployer.TestERC20({ owner });
    const snapshot_id = await ethers.provider.send("evm_snapshot", []);
    {
      const currentBlock = await getCurrentBlock();

      const tokenId = 0;
      let nonce = 0;
      const assetAmount = chance.integer({ min: 0.02, max: 2000 });
      const sigExpireBlockNum = currentBlock.number + 10;

      const [wishport] = await contractStateGenerator.afterWishportMint({
        tokenId,
        assetAmount,
        nonce: nonce++,
        sigExpireBlockNum,
        minter: account,
        owner,
        assetToken,
      });

      const signature = await generateSignature({
        signer: owner,
        types: [
          "string",
          "uint256",
          "address",
          "address",
          "uint256",
          "uint256",
          "uint256",
        ],
        values: [
          "burn(uint256,uint256,bytes,uint256)",
          (await owner.provider?.getNetwork())?.chainId,
          wishport.address,
          burner.address,
          tokenId,
          nonce,
          sigExpireBlockNum,
        ],
      });

      const decimals = await assetToken.decimals();

      const before = UnitParser.fromBigNumber(
        await wishport.claimable(account.address, assetToken.address),
        decimals
      );

      await wishport
        .connect(burner)
        .burn(tokenId, nonce, signature, sigExpireBlockNum);

      const after = UnitParser.fromBigNumber(
        await wishport.claimable(account.address, assetToken.address),
        decimals
      );

      expect(burner.address).not.to.equal(account.address);
      expect(after).to.be.greaterThan(before);
      expect(SafeMath.sub(after, before)).to.equal(assetAmount);
    }

    await ethers.provider.send("evm_revert", [snapshot_id]);
  });

  it(`
    If the token has been minted in ether
    should reset the reward info amount to zero
  `, async () => {
    const [owner, account] = await ethers.getSigners();

    const snapshot_id = await ethers.provider.send("evm_snapshot", []);
    {
      const currentBlock = await getCurrentBlock();

      const tokenId = 0;
      let nonce = 0;
      const assetAmount = chance.integer({ min: 0.02, max: 2000 });
      const sigExpireBlockNum = currentBlock.number + 10;

      const [wishport] = await contractStateGenerator.afterWishportMint({
        tokenId,
        assetAmount,
        nonce: nonce++,
        sigExpireBlockNum,
        minter: account,
        owner,
      });

      const signature = await generateSignature({
        signer: owner,
        types: [
          "string",
          "uint256",
          "address",
          "address",
          "uint256",
          "uint256",
          "uint256",
        ],
        values: [
          "burn(uint256,uint256,bytes,uint256)",
          (await owner.provider?.getNetwork())?.chainId,
          wishport.address,
          account.address,
          tokenId,
          nonce,
          sigExpireBlockNum,
        ],
      });

      const before = await wishport.wishRewardInfo(tokenId);
      await wishport
        .connect(account)
        .burn(tokenId, nonce, signature, sigExpireBlockNum);
      const after = await wishport.wishRewardInfo(tokenId);

      expect(after.token).to.equal(before.token);
      expect(after.token).to.equal(ZERO_ADDRESS);
      expect(UnitParser.fromEther(after.amount)).not.to.equal(
        UnitParser.fromEther(before.amount)
      );
      expect(UnitParser.fromEther(after.amount)).to.equal(0);
    }

    await ethers.provider.send("evm_revert", [snapshot_id]);
  });

  it(`
    If the token has been minted in ERC20
    should reset the token address and reward amount in corr. token reward info
  `, async () => {
    const [owner, account, burner] = await ethers.getSigners();
    const [assetToken] = await contractDeployer.TestERC20({ owner });
    const snapshot_id = await ethers.provider.send("evm_snapshot", []);
    {
      const currentBlock = await getCurrentBlock();

      const tokenId = 0;
      let nonce = 0;
      const assetAmount = chance.integer({ min: 0.02, max: 2000 });
      const sigExpireBlockNum = currentBlock.number + 10;

      const [wishport] = await contractStateGenerator.afterWishportMint({
        tokenId,
        assetAmount,
        nonce: nonce++,
        sigExpireBlockNum,
        minter: account,
        owner,
        assetToken,
      });

      const signature = await generateSignature({
        signer: owner,
        types: [
          "string",
          "uint256",
          "address",
          "address",
          "uint256",
          "uint256",
          "uint256",
        ],
        values: [
          "burn(uint256,uint256,bytes,uint256)",
          (await owner.provider?.getNetwork())?.chainId,
          wishport.address,
          burner.address,
          tokenId,
          nonce,
          sigExpireBlockNum,
        ],
      });

      const decimals = await assetToken.decimals();

      const before = await wishport.wishRewardInfo(tokenId);
      await wishport
        .connect(burner)
        .burn(tokenId, nonce, signature, sigExpireBlockNum);

      const after = await wishport.wishRewardInfo(tokenId);

      expect(after.token).not.to.equal(before.token);
      expect(after.token).to.equal(ZERO_ADDRESS);
      expect(UnitParser.fromBigNumber(after.amount, decimals)).not.to.equal(
        UnitParser.fromBigNumber(before.amount, decimals)
      );
      expect(UnitParser.fromBigNumber(after.amount, decimals)).to.equal(0);
    }

    await ethers.provider.send("evm_revert", [snapshot_id]);
  });

  it(`
    should burn the token
  `, async () => {
    const [owner, account, burner] = await ethers.getSigners();
    const [assetToken] = await contractDeployer.TestERC20({ owner });

    const snapshot_id = await ethers.provider.send("evm_snapshot", []);
    {
      const currentBlock = await getCurrentBlock();

      const tokenId = 0;
      let nonce = 0;
      const assetAmount = chance.integer({ min: 0.02, max: 2000 });
      const sigExpireBlockNum = currentBlock.number + 10;

      const [wishport, wish] = await contractStateGenerator.afterWishportMint({
        tokenId,
        assetAmount,
        nonce: nonce++,
        sigExpireBlockNum,
        minter: account,
        owner,
        assetToken,
      });

      const signature = await generateSignature({
        signer: owner,
        types: [
          "string",
          "uint256",
          "address",
          "address",
          "uint256",
          "uint256",
          "uint256",
        ],
        values: [
          "burn(uint256,uint256,bytes,uint256)",
          (await owner.provider?.getNetwork())?.chainId,
          wishport.address,
          burner.address,
          tokenId,
          nonce,
          sigExpireBlockNum,
        ],
      });

      const before = await wish.pureOwnerOf(tokenId);

      await wishport
        .connect(burner)
        .burn(tokenId, nonce, signature, sigExpireBlockNum);

      const after = await wish.pureOwnerOf(tokenId);
      expect(before).to.equal(account.address);
      expect(after).to.equal(ZERO_ADDRESS);
    }

    await ethers.provider.send("evm_revert", [snapshot_id]);
  });

  it(`should emit a Burn event with correct params `, async () => {
    const [owner, account] = await ethers.getSigners();

    const snapshot_id = await ethers.provider.send("evm_snapshot", []);
    {
      const currentBlock = await getCurrentBlock();

      const tokenId = 0;
      let nonce = 0;
      const assetAmount = chance.integer({ min: 0.02, max: 2000 });
      const sigExpireBlockNum = currentBlock.number + 10;

      const [wishport] = await contractStateGenerator.afterWishportMint({
        tokenId,
        assetAmount,
        nonce: nonce++,
        sigExpireBlockNum,
        minter: account,
        owner,
      });

      const signature = await generateSignature({
        signer: owner,
        types: [
          "string",
          "uint256",
          "address",
          "address",
          "uint256",
          "uint256",
          "uint256",
        ],
        values: [
          "burn(uint256,uint256,bytes,uint256)",
          (await owner.provider?.getNetwork())?.chainId,
          wishport.address,
          account.address,
          tokenId,
          nonce,
          sigExpireBlockNum,
        ],
      });

      await expectEvent(
        wishport.connect(account).burn,
        [tokenId, nonce, signature, sigExpireBlockNum],
        {
          contract: wishport,
          eventSignature: "Burn",
          eventArgs: {
            tokenId,
          },
        }
      );
    }

    await ethers.provider.send("evm_revert", [snapshot_id]);
  });
});
