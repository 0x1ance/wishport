import { ethers } from "hardhat";
import { expect } from "chai";
import { ContractDeployer } from "@test/utils/contract-deployer";
import { faker } from "@faker-js/faker";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { UnitParser } from "@test/utils/UnitParser";
import { generateSignature } from "@test/utils/generateSignature";
import {
  ERC20__factory,
  IWishport__factory,
  TestERC20,
  Wishport,
} from "@/types";
import { composeTokenId } from "@/utils/composeTokenId";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { shouldBehaveLikeTokenRecovery } from "../patterns/utils/TokenRecovery/shouldBehaveLikeTokenRecovery";
import { shouldBehaveLikeOwnable } from "../patterns/utils/TokenRecovery/shouldBehaveLikeOwnable";

describe.only("Wishport", () => {
  async function fixture() {
    const [deployer, admin, authedSigner, relayer, user, user2, user3, user4] =
      await ethers.getSigners();

    const [wish] = await ContractDeployer.Wish({
      deployer,
      admins: [],
      contractURI_: faker.internet.url(),
      uri_: faker.internet.url(),
    });

    const [mockForwarder] = await ContractDeployer.Mock.MockForwarder();

    const [wishport] = await ContractDeployer.Wishport({
      deployer,
      wish_: await wish.getAddress(),
      authedSigner_: authedSigner.address,
      trustedForwarder_: await mockForwarder.getAddress(),
    });

    // grant the initial admin role to the wishport
    await wish
      .connect(deployer)
      .grantRole(await wish.ADMIN_ROLE(), await wishport.getAddress());

    // mint a test erc20
    const [erc20] = await ContractDeployer.Token.ERC20();

    return {
      wish,
      wishport,
      deployer,
      authedSigner,
      forwarder: mockForwarder,
      admin,
      user,
      user2,
      user3,
      user4,
      erc20,
      relayer,
    };
  }

  async function quickList({
    wishport,
    tokenId,
    erc20,
    rewardAmount,
    user,
    authedSigner,
  }: {
    wishport: Wishport;
    tokenId: number;
    erc20?: TestERC20;
    rewardAmount: number;
    user: HardhatEthersSigner;
    authedSigner: HardhatEthersSigner;
  }) {
    const IWishportInterface = IWishport__factory.createInterface();

    const reward = erc20 ? await erc20.getAddress() : ethers.ZeroAddress;
    const rewardAmountBN = erc20
      ? UnitParser.toBigNumber(rewardAmount, await erc20.decimals())
      : UnitParser.toEther(rewardAmount);

    // mint reward to user
    if (erc20) {
      await erc20.mint(user.address, rewardAmountBN);
      await erc20
        .connect(user)
        .approve(await wishport.getAddress(), rewardAmountBN);
    }

    const deadline = Math.floor(faker.date.future().getTime() / 1000);
    const signature = await generateSignature({
      signer: authedSigner,
      types: [
        "uint256",
        "address",
        "bytes4",
        "address",
        "uint256",
        "uint256",
        "address",
        "uint256",
        "uint256",
      ],
      values: [
        (await ethers.provider.getNetwork()).chainId,
        await wishport.getAddress(),
        IWishportInterface.getFunction("list").selector,
        user.address,
        deadline,
        tokenId,
        reward,
        rewardAmountBN,
        await wishport.nonces(user.address),
      ],
    });

    // Act
    const tx = await wishport
      .connect(user)
      .list(tokenId, reward, rewardAmountBN, deadline, signature, {
        value: erc20 ? 0 : rewardAmountBN,
      });
    await tx.wait();
  }

  function computePortion({
    percentile,
    base = 100n,
    target = 1n,
  }: {
    percentile: bigint;
    base?: bigint;
    target?: bigint;
  }) {
    if (percentile < 0n || percentile > base) {
      throw new Error("Invalid percentile");
    }
    return (target * percentile) / base;
  }

  describe("Deployment", () => {
    it("should revert if the wish address is the zero address", async () => {
      const { deployer, authedSigner, forwarder } = await loadFixture(fixture);
      // Arrange
      const Wishport = await ethers.getContractFactory("Wishport");
      const invalidAddress = ethers.ZeroAddress;
      // Act

      // Assert
      await expect(
        Wishport.deploy(
          invalidAddress,
          authedSigner.address,
          await forwarder.getAddress(),
          {
            from: deployer.address,
          }
        )
      )
        .to.be.revertedWithCustomError(Wishport, "InvalidAddress")
        .withArgs(ethers.ZeroAddress);
    });
    it("should revert if the authedSigner address is the zero address", async () => {
      const { deployer, wish, forwarder } = await loadFixture(fixture);
      // Arrange
      const Wishport = await ethers.getContractFactory("Wishport");
      const invalidAddress = ethers.ZeroAddress;
      // Act

      // Assert
      await expect(
        Wishport.deploy(
          await wish.getAddress(),
          invalidAddress,
          await forwarder.getAddress(),
          {
            from: deployer.address,
          }
        )
      )
        .to.be.revertedWithCustomError(Wishport, "InvalidAddress")
        .withArgs(ethers.ZeroAddress);
    });
    it("should revert if the trustedForwarder address is the zero address", async () => {
      const { deployer, wish, authedSigner } = await loadFixture(fixture);
      // Arrange
      const Wishport = await ethers.getContractFactory("Wishport");
      const invalidAddress = ethers.ZeroAddress;
      // Act

      // Assert
      await expect(
        Wishport.deploy(
          await wish.getAddress(),
          authedSigner.address,
          invalidAddress,
          {
            from: deployer.address,
          }
        )
      )
        .to.be.revertedWithCustomError(Wishport, "InvalidAddress")
        .withArgs(ethers.ZeroAddress);
    });
    it("should set the wish inventory", async () => {
      const { wishport, wish } = await loadFixture(fixture);
      // Arrange

      // Act

      // Assert
      expect(await wishport.WISH()).to.equal(await wish.getAddress());
    });
    it("should set the authedSigner", async () => {
      const { wishport, authedSigner } = await loadFixture(fixture);
      // Arrange

      // Act

      // Assert
      expect(await wishport.authedSigner()).to.equal(authedSigner.address);
    });
    it("should set the trustedForwarder", async () => {
      const { wishport, forwarder } = await loadFixture(fixture);
      // Arrange

      // Act

      // Assert
      expect(await wishport.trustedForwarder()).to.equal(
        await forwarder.getAddress()
      );
    });
  });

  describe("WISH", () => {
    it("should return the wish address", async () => {
      const { wishport, wish } = await loadFixture(fixture);
      // Arrange

      // Act

      // Assert
      expect(await wishport.WISH()).to.equal(await wish.getAddress());
    });
  });

  describe("BASE_PORTION", () => {
    it("should return 1000000", async () => {
      const { wishport } = await loadFixture(fixture);
      // Arrange

      // Act

      // Assert
      expect(await wishport.BASE_PORTION()).to.equal(1000000);
    });
  });
  describe("trustForwarder", () => {
    it("should return the trustedForwarder", async () => {
      const { wishport, forwarder } = await loadFixture(fixture);
      // Arrange

      // Act

      // Assert
      expect(await wishport.trustedForwarder()).to.equal(
        await forwarder.getAddress()
      );
    });
  });

  describe("authedSigner", () => {
    it("should return the authedSigner", async () => {
      const { wishport, authedSigner } = await loadFixture(fixture);
      // Arrange

      // Act

      // Assert
      expect(await wishport.authedSigner()).to.equal(authedSigner.address);
    });
  });
  describe("setAuthedSigner", () => {
    it("should revert if the sender is not an the owner", async () => {
      const { wishport, user } = await loadFixture(fixture);
      // Arrange

      // Act

      // Assert
      await expect(wishport.connect(user).setAuthedSigner(user.address))
        .to.be.revertedWithCustomError(wishport, "OwnableUnauthorizedAccount")
        .withArgs(user.address);
    });
    it("should revert if the new authedSigner is the zero address", async () => {
      const { wishport, deployer } = await loadFixture(fixture);
      // Arrange

      // Act

      // Assert
      await expect(
        wishport.connect(deployer).setAuthedSigner(ethers.ZeroAddress)
      )
        .to.be.revertedWithCustomError(wishport, "InvalidAddress")
        .withArgs(ethers.ZeroAddress);
    });
    it("should set the authedSigner", async () => {
      const { wishport, deployer, user } = await loadFixture(fixture);
      // Arrange
      const newAuthedSigner = user.address;
      // Act
      const before = await wishport.authedSigner();
      await wishport.connect(deployer).setAuthedSigner(newAuthedSigner);
      const after = await wishport.authedSigner();

      // Assert
      expect(after).to.equal(newAuthedSigner);
      expect(after).to.not.equal(before);
    });
  });
  describe("setTrustedForwarder", () => {
    it("should revert if the sender is not an the owner", async () => {
      const { wishport, user } = await loadFixture(fixture);
      // Arrange

      // Act

      // Assert
      await expect(wishport.connect(user).setTrustedForwarder(user.address))
        .to.be.revertedWithCustomError(wishport, "OwnableUnauthorizedAccount")
        .withArgs(user.address);
    });
    it("should revert if the new trustedForwarder is the zero address", async () => {
      const { wishport, deployer } = await loadFixture(fixture);
      // Arrange

      // Act

      // Assert
      await expect(
        wishport.connect(deployer).setTrustedForwarder(ethers.ZeroAddress)
      )
        .to.be.revertedWithCustomError(wishport, "InvalidAddress")
        .withArgs(ethers.ZeroAddress);
    });
    it("should set the trustedForwarder", async () => {
      const { wishport, deployer, user } = await loadFixture(fixture);
      // Arrange
      const newForwarder = user.address;
      // Act
      const before = await wishport.trustedForwarder();
      await wishport.connect(deployer).setTrustedForwarder(newForwarder);
      const after = await wishport.trustedForwarder();

      // Assert
      expect(after).to.equal(newForwarder);
      expect(after).to.not.equal(before);
    });
  });
  describe("list", () => {
    it("should revert if the signature is not signed by the authedSigner", async () => {
      const { wishport, user, erc20 } = await loadFixture(fixture);
      // Arrange
      const invalidSigner = user;
      const IWishportInterface = IWishport__factory.createInterface();
      const tokenId = faker.number.int({ min: 1, max: 1000000 });
      const reward = await erc20.getAddress();
      const rewardAmount = faker.number.int({ min: 1, max: 1000000 });
      const rewardAmountBN = UnitParser.toBigNumber(rewardAmount, 18);
      // mint reward to user
      await erc20.mint(user.address, rewardAmountBN);
      await erc20
        .connect(user)
        .approve(await wishport.getAddress(), rewardAmountBN);
      const deadline = Math.floor(faker.date.future().getTime() / 1000);
      const signature = await generateSignature({
        signer: invalidSigner,
        types: [
          "uint256",
          "address",
          "bytes4",
          "address",
          "uint256",
          "uint256",
          "address",
          "uint256",
          "uint256",
        ],
        values: [
          (await ethers.provider.getNetwork()).chainId,
          await wishport.getAddress(),
          IWishportInterface.getFunction("list").selector,
          user.address,
          deadline,
          tokenId,
          reward,
          rewardAmountBN,
          await wishport.nonces(user.address),
        ],
      });

      // Act
      const tx = wishport
        .connect(user)
        .list(tokenId, reward, rewardAmountBN, deadline, signature);

      // Assert
      expect(invalidSigner.address).not.to.equal(await wishport.authedSigner());
      await expect(tx).to.be.revertedWithCustomError(wishport, "InvalidSigner");
    });
    it("should revert if the signature info does not match with the input", async () => {
      const { wishport, wish, user, authedSigner, erc20 } = await loadFixture(
        fixture
      );
      // Arrange
      const IWishportInterface = IWishport__factory.createInterface();
      const tokenId = faker.number.int({ min: 1, max: 1000000 });
      const reward = await erc20.getAddress();
      const rewardAmount = faker.number.int({ min: 1, max: 1000000 });
      const rewardAmountBN = UnitParser.toBigNumber(rewardAmount, 18);
      // mint reward to user
      await erc20.mint(user.address, rewardAmountBN);
      await erc20
        .connect(user)
        .approve(await wishport.getAddress(), rewardAmountBN);
      const deadline = Math.floor(faker.date.future().getTime() / 1000);
      const signature = await generateSignature({
        signer: authedSigner,
        types: [
          "uint256",
          "address",
          "bytes4",
          "address",
          "uint256",
          "uint256",
          "address",
          "uint256",
          "uint256",
        ],
        values: [
          (await ethers.provider.getNetwork()).chainId,
          await wishport.getAddress(),
          IWishportInterface.getFunction("list").selector,
          user.address,
          deadline,
          tokenId,
          reward,
          rewardAmountBN,
          await wishport.nonces(user.address),
        ],
      });

      // Act
      const tx = wishport
        .connect(user)
        .list(tokenId, reward, rewardAmountBN + 1n, deadline, signature);

      // Assert
      await expect(tx).to.be.revertedWithCustomError(wishport, "InvalidSigner");
    });
    it("should revert if the deadline is less than the current block timestamp", async () => {
      const { wishport, wish, user, authedSigner, erc20 } = await loadFixture(
        fixture
      );
      // Arrange
      const IWishportInterface = IWishport__factory.createInterface();
      const tokenId = faker.number.int({ min: 1, max: 1000000 });
      const reward = await erc20.getAddress();
      const rewardAmount = faker.number.int({ min: 1, max: 1000000 });
      const rewardAmountBN = UnitParser.toBigNumber(rewardAmount, 18);
      // mint reward to user
      await erc20.mint(user.address, rewardAmountBN);
      await erc20
        .connect(user)
        .approve(await wishport.getAddress(), rewardAmountBN);
      const deadline = Math.floor(faker.date.past().getTime() / 1000);
      const signature = await generateSignature({
        signer: authedSigner,
        types: [
          "uint256",
          "address",
          "bytes4",
          "address",
          "uint256",
          "uint256",
          "address",
          "uint256",
          "uint256",
        ],
        values: [
          (await ethers.provider.getNetwork()).chainId,
          await wishport.getAddress(),
          IWishportInterface.getFunction("list").selector,
          user.address,
          deadline,
          tokenId,
          reward,
          rewardAmountBN,
          await wishport.nonces(user.address),
        ],
      });
      // Act

      // Assert
      await expect(
        wishport
          .connect(user)
          .list(tokenId, reward, rewardAmountBN, deadline, signature)
      )
        .to.be.revertedWithCustomError(wishport, "ExpiredSignature")
        .withArgs(deadline);
    });
    it('should consume the user "nonce"', async () => {
      const { wishport, wish, user, authedSigner, erc20 } = await loadFixture(
        fixture
      );
      // Arrange
      const IWishportInterface = IWishport__factory.createInterface();
      const tokenId = faker.number.int({ min: 1, max: 1000000 });
      const reward = await erc20.getAddress();
      const rewardAmount = faker.number.int({ min: 1, max: 1000000 });
      const rewardAmountBN = UnitParser.toBigNumber(rewardAmount, 18);
      // mint reward to user
      await erc20.mint(user.address, rewardAmountBN);
      await erc20
        .connect(user)
        .approve(await wishport.getAddress(), rewardAmountBN);
      const deadline = Math.floor(faker.date.future().getTime() / 1000);
      const signature = await generateSignature({
        signer: authedSigner,
        types: [
          "uint256",
          "address",
          "bytes4",
          "address",
          "uint256",
          "uint256",
          "address",
          "uint256",
          "uint256",
        ],
        values: [
          (await ethers.provider.getNetwork()).chainId,
          await wishport.getAddress(),
          IWishportInterface.getFunction("list").selector,
          user.address,
          deadline,
          tokenId,
          reward,
          rewardAmountBN,
          await wishport.nonces(user.address),
        ],
      });

      // Act
      const before = await wishport.nonces(user.address);
      await wishport
        .connect(user)
        .list(tokenId, reward, rewardAmountBN, deadline, signature);
      const after = await wishport.nonces(user.address);

      // Assert
      expect(after).to.equal(before + 1n);
    });

    it("should revert if the asset is ether and the msg.value is less than the rewardAmount", async () => {
      const { wishport, wish, user, authedSigner, erc20 } = await loadFixture(
        fixture
      );
      // Arrange
      const IWishportInterface = IWishport__factory.createInterface();
      const tokenId = faker.number.int({ min: 1, max: 1000000 });
      const reward = ethers.ZeroAddress;
      const rewardAmount = faker.number.int({ min: 1, max: 10 });
      const rewardAmountBN = UnitParser.toBigNumber(rewardAmount, 18);
      // mint reward to user
      await erc20.mint(user.address, rewardAmountBN);
      await erc20
        .connect(user)
        .approve(await wishport.getAddress(), rewardAmountBN);
      const deadline = Math.floor(faker.date.future().getTime() / 1000);
      const signature = await generateSignature({
        signer: authedSigner,
        types: [
          "uint256",
          "address",
          "bytes4",
          "address",
          "uint256",
          "uint256",
          "address",
          "uint256",
          "uint256",
        ],
        values: [
          (await ethers.provider.getNetwork()).chainId,
          await wishport.getAddress(),
          IWishportInterface.getFunction("list").selector,
          user.address,
          deadline,
          tokenId,
          reward,
          rewardAmountBN,
          await wishport.nonces(user.address),
        ],
      });

      // Act

      // Assert
      await expect(
        wishport
          .connect(user)
          .list(tokenId, reward, rewardAmountBN, deadline, signature, {
            value: rewardAmountBN - 1n,
          })
      )
        .to.be.revertedWithCustomError(wishport, "InsufficientEther")
        .withArgs(rewardAmountBN - 1n);
    });

    it("should set the wish amount as the input amount if the reward is ether", async () => {
      const { wishport, wish, user, authedSigner, erc20 } = await loadFixture(
        fixture
      );
      // Arrange
      const IWishportInterface = IWishport__factory.createInterface();
      const tokenId = faker.number.int({ min: 1, max: 1000000 });
      const reward = ethers.ZeroAddress;
      const rewardAmount = faker.number.int({ min: 1, max: 10 });
      const rewardAmountBN = UnitParser.toBigNumber(rewardAmount, 18);
      // mint reward to user
      await erc20.mint(user.address, rewardAmountBN);
      await erc20
        .connect(user)
        .approve(await wishport.getAddress(), rewardAmountBN);
      const deadline = Math.floor(faker.date.future().getTime() / 1000);
      const signature = await generateSignature({
        signer: authedSigner,
        types: [
          "uint256",
          "address",
          "bytes4",
          "address",
          "uint256",
          "uint256",
          "address",
          "uint256",
          "uint256",
        ],
        values: [
          (await ethers.provider.getNetwork()).chainId,
          await wishport.getAddress(),
          IWishportInterface.getFunction("list").selector,
          user.address,
          deadline,
          tokenId,
          reward,
          rewardAmountBN,
          await wishport.nonces(user.address),
        ],
      });

      // Act
      const before = await wishport.wishes(tokenId);
      await wishport
        .connect(user)
        .list(tokenId, reward, rewardAmountBN, deadline, signature, {
          value: rewardAmountBN,
        });
      const after = await wishport.wishes(tokenId);

      // Assert
      expect(after).to.not.equal(before);
      expect(after.amount).to.equal(rewardAmountBN);
    });
    it("should revert if the reward is not ether and the balance after calling safeTransferFrom is less than the balance before", async () => {
      const { wishport, user, authedSigner } = await loadFixture(fixture);
      // Arrange
      const [reverseTransferERC20] =
        await ContractDeployer.Token.ReverseTransferERC20();
      const IWishportInterface = IWishport__factory.createInterface();
      const tokenId = faker.number.int({ min: 1, max: 1000000 });
      const reward = await reverseTransferERC20.getAddress();
      const rewardAmount = faker.number.int({ min: 1, max: 1000000 });
      const rewardAmountBN = UnitParser.toBigNumber(rewardAmount, 18);
      // mint reward to user
      await reverseTransferERC20.mint(user.address, rewardAmountBN);
      await reverseTransferERC20.mint(
        await wishport.getAddress(),
        rewardAmountBN
      );
      await reverseTransferERC20
        .connect(user)
        .approve(await wishport.getAddress(), rewardAmountBN);
      const deadline = Math.floor(faker.date.future().getTime() / 1000);
      const signature = await generateSignature({
        signer: authedSigner,
        types: [
          "uint256",
          "address",
          "bytes4",
          "address",
          "uint256",
          "uint256",
          "address",
          "uint256",
          "uint256",
        ],
        values: [
          (await ethers.provider.getNetwork()).chainId,
          await wishport.getAddress(),
          IWishportInterface.getFunction("list").selector,
          user.address,
          deadline,
          tokenId,
          reward,
          rewardAmountBN,
          await wishport.nonces(user.address),
        ],
      });

      // Act

      // Assert
      await expect(
        wishport
          .connect(user)
          .list(tokenId, reward, rewardAmountBN, deadline, signature)
      )
        .to.be.revertedWithCustomError(wishport, "SafeERC20FailedOperation")
        .withArgs(reward);
    });
    it("should save the wish amount smaller than the input amount if the reward is not ether and the erc20 is charging fee during transfer operation", async () => {
      const { wishport, user, authedSigner } = await loadFixture(fixture);
      // Arrange
      const [usdt] = await ContractDeployer.Token.USDT();
      const IWishportInterface = IWishport__factory.createInterface();
      const tokenId = faker.number.int({ min: 1, max: 1000000 });
      const reward = await usdt.getAddress();
      const rewardAmount = faker.number.int({ min: 1, max: 1000000 });
      const rewardAmountBN = UnitParser.toBigNumber(rewardAmount, 18);
      // mint reward to user
      await usdt.mint(user.address, rewardAmountBN);

      await usdt
        .connect(user)
        .approve(await wishport.getAddress(), rewardAmountBN);
      const deadline = Math.floor(faker.date.future().getTime() / 1000);
      const signature = await generateSignature({
        signer: authedSigner,
        types: [
          "uint256",
          "address",
          "bytes4",
          "address",
          "uint256",
          "uint256",
          "address",
          "uint256",
          "uint256",
        ],
        values: [
          (await ethers.provider.getNetwork()).chainId,
          await wishport.getAddress(),
          IWishportInterface.getFunction("list").selector,
          user.address,
          deadline,
          tokenId,
          reward,
          rewardAmountBN,
          await wishport.nonces(user.address),
        ],
      });

      // Act
      const before = await wishport.wishes(tokenId);
      await wishport
        .connect(user)
        .list(tokenId, reward, rewardAmountBN, deadline, signature);
      const after = await wishport.wishes(tokenId);

      // Assert
      expect(after).to.not.equal(before);
      expect(after.reward).to.equal(reward);
      expect(after.amount).to.lt(rewardAmountBN);
    });
    it("should save the wish information", async () => {
      const { wishport, user, authedSigner, erc20 } = await loadFixture(
        fixture
      );
      // Arrange
      const IWishportInterface = IWishport__factory.createInterface();
      const tokenId = faker.number.int({ min: 1, max: 1000000 });
      const reward = await erc20.getAddress();
      const rewardAmount = faker.number.int({ min: 1, max: 1000000 });
      const rewardAmountBN = UnitParser.toBigNumber(rewardAmount, 18);
      // mint reward to user
      await erc20.mint(user.address, rewardAmountBN);
      await erc20
        .connect(user)
        .approve(await wishport.getAddress(), rewardAmountBN);
      const deadline = Math.floor(faker.date.future().getTime() / 1000);
      const signature = await generateSignature({
        signer: authedSigner,
        types: [
          "uint256",
          "address",
          "bytes4",
          "address",
          "uint256",
          "uint256",
          "address",
          "uint256",
          "uint256",
        ],
        values: [
          (await ethers.provider.getNetwork()).chainId,
          await wishport.getAddress(),
          IWishportInterface.getFunction("list").selector,
          user.address,
          deadline,
          tokenId,
          reward,
          rewardAmountBN,
          await wishport.nonces(user.address),
        ],
      });

      // Act
      const before = await wishport.wishes(tokenId);
      await wishport
        .connect(user)
        .list(tokenId, reward, rewardAmountBN, deadline, signature);
      const after = await wishport.wishes(tokenId);

      // Assert
      expect(after).to.not.equal(before);
      expect(after.reward).to.equal(reward);
      expect(after.amount).to.equal(rewardAmountBN);
    });
    it('should emit a "Listed" event', async () => {
      const { wishport, user, authedSigner, erc20 } = await loadFixture(
        fixture
      );
      // Arrange
      const IWishportInterface = IWishport__factory.createInterface();
      const tokenId = faker.number.int({ min: 1, max: 1000000 });
      const reward = await erc20.getAddress();
      const rewardAmount = faker.number.int({ min: 1, max: 1000000 });
      const rewardAmountBN = UnitParser.toBigNumber(rewardAmount, 18);
      // mint reward to user
      await erc20.mint(user.address, rewardAmountBN);
      await erc20
        .connect(user)
        .approve(await wishport.getAddress(), rewardAmountBN);
      const deadline = Math.floor(faker.date.future().getTime() / 1000);
      const signature = await generateSignature({
        signer: authedSigner,
        types: [
          "uint256",
          "address",
          "bytes4",
          "address",
          "uint256",
          "uint256",
          "address",
          "uint256",
          "uint256",
        ],
        values: [
          (await ethers.provider.getNetwork()).chainId,
          await wishport.getAddress(),
          IWishportInterface.getFunction("list").selector,
          user.address,
          deadline,
          tokenId,
          reward,
          rewardAmountBN,
          await wishport.nonces(user.address),
        ],
      });

      // Act
      const tx = wishport
        .connect(user)
        .list(tokenId, reward, rewardAmountBN, deadline, signature);

      // Assert
      await expect(tx)
        .to.emit(wishport, "Listed")
        .withArgs(tokenId, user.address, reward, rewardAmountBN);
    });
    it("should revert if the mint function does not return the correct selector", async () => {
      const { user, deployer, authedSigner, erc20 } = await loadFixture(
        fixture
      );

      const [wish] = await ContractDeployer.Mock.MockIncorrectWish({
        deployer,
      });

      const [mockForwarder] = await ContractDeployer.Mock.MockForwarder();

      const [wishport] = await ContractDeployer.Wishport({
        deployer,
        wish_: await wish.getAddress(),
        authedSigner_: authedSigner.address,
        trustedForwarder_: await mockForwarder.getAddress(),
      });

      // grant the initial admin role to the wishport
      await wish
        .connect(deployer)
        .grantRole(await wish.ADMIN_ROLE(), await wishport.getAddress());

      // Arrange
      const IWishportInterface = IWishport__factory.createInterface();
      const tokenId = faker.number.int({ min: 1, max: 1000000 });
      const reward = await erc20.getAddress();
      const rewardAmount = faker.number.int({ min: 1, max: 1000000 });
      const rewardAmountBN = UnitParser.toBigNumber(rewardAmount, 18);
      // mint reward to user
      await erc20.mint(user.address, rewardAmountBN);
      await erc20
        .connect(user)
        .approve(await wishport.getAddress(), rewardAmountBN);
      const deadline = Math.floor(faker.date.future().getTime() / 1000);
      const signature = await generateSignature({
        signer: authedSigner,
        types: [
          "uint256",
          "address",
          "bytes4",
          "address",
          "uint256",
          "uint256",
          "address",
          "uint256",
          "uint256",
        ],
        values: [
          (await ethers.provider.getNetwork()).chainId,
          await wishport.getAddress(),
          IWishportInterface.getFunction("list").selector,
          user.address,
          deadline,
          tokenId,
          reward,
          rewardAmountBN,
          await wishport.nonces(user.address),
        ],
      });

      // Act
      const tx = wishport
        .connect(user)
        .list(tokenId, reward, rewardAmountBN, deadline, signature);

      // Assert
      await expect(tx)
        .to.be.revertedWithCustomError(wishport, "FailedWishOperation")
        .withArgs(tokenId);
    });
    it("should mint the wish token to the user", async () => {
      const { wishport, user, authedSigner, erc20, wish } = await loadFixture(
        fixture
      );
      // Arrange
      const IWishportInterface = IWishport__factory.createInterface();
      const tokenId = faker.number.int({ min: 1, max: 1000000 });
      const reward = await erc20.getAddress();
      const rewardAmount = faker.number.int({ min: 1, max: 1000000 });
      const rewardAmountBN = UnitParser.toBigNumber(rewardAmount, 18);
      // mint reward to user
      await erc20.mint(user.address, rewardAmountBN);
      await erc20
        .connect(user)
        .approve(await wishport.getAddress(), rewardAmountBN);
      const deadline = Math.floor(faker.date.future().getTime() / 1000);
      const signature = await generateSignature({
        signer: authedSigner,
        types: [
          "uint256",
          "address",
          "bytes4",
          "address",
          "uint256",
          "uint256",
          "address",
          "uint256",
          "uint256",
        ],
        values: [
          (await ethers.provider.getNetwork()).chainId,
          await wishport.getAddress(),
          IWishportInterface.getFunction("list").selector,
          user.address,
          deadline,
          tokenId,
          reward,
          rewardAmountBN,
          await wishport.nonces(user.address),
        ],
      });

      // Act
      const tx = wishport
        .connect(user)
        .list(tokenId, reward, rewardAmountBN, deadline, signature);

      // Assert
      await expect(tx)
        .to.emit(wish, "Transfer")
        .withArgs(ethers.ZeroAddress, user.address, tokenId);
    });
    it("should mint the original tokenId if the tokenId is a composed one and the pseudo-owner is not the caller", async () => {
      const { wishport, user, authedSigner, erc20, wish, user2 } =
        await loadFixture(fixture);
      // Arrange
      const IWishportInterface = IWishport__factory.createInterface();
      const tokenId = faker.number.int({ min: 1, max: 1000000 });
      const pseudoOwnerAddress = user2.address;
      const composedTokenId = composeTokenId(pseudoOwnerAddress, tokenId);

      const reward = await erc20.getAddress();
      const rewardAmount = faker.number.int({ min: 1, max: 1000000 });
      const rewardAmountBN = UnitParser.toBigNumber(rewardAmount, 18);
      // mint reward to user
      await erc20.mint(user.address, rewardAmountBN);
      await erc20
        .connect(user)
        .approve(await wishport.getAddress(), rewardAmountBN);
      const deadline = Math.floor(faker.date.future().getTime() / 1000);
      const signature = await generateSignature({
        signer: authedSigner,
        types: [
          "uint256",
          "address",
          "bytes4",
          "address",
          "uint256",
          "uint256",
          "address",
          "uint256",
          "uint256",
        ],
        values: [
          (await ethers.provider.getNetwork()).chainId,
          await wishport.getAddress(),
          IWishportInterface.getFunction("list").selector,
          user.address,
          deadline,
          composedTokenId,
          reward,
          rewardAmountBN,
          await wishport.nonces(user.address),
        ],
      });

      // Act
      const tx = wishport
        .connect(user)
        .list(composedTokenId, reward, rewardAmountBN, deadline, signature);

      // Assert

      await expect(tx)
        .to.emit(wish, "Transfer")
        .withArgs(ethers.ZeroAddress, user.address, tokenId);
      expect(pseudoOwnerAddress).to.not.equal(user.address);
      expect(await wish.ownerOf(tokenId)).to.equal(user.address);
    });
  });
  describe("unlist", () => {
    it("should revert if the signature is not signed by the authedSigner", async () => {
      const { wishport, user, erc20, authedSigner } = await loadFixture(
        fixture
      );
      // Arrange
      const invalidSigner = user;
      const IWishportInterface = IWishport__factory.createInterface();
      const tokenId = faker.number.int({ min: 1, max: 1000000 });
      const rewardAmount = faker.number.float({
        min: 0,
        max: 1000,
        precision: 0.01,
      });
      await quickList({
        wishport,
        user,
        erc20,
        tokenId,
        authedSigner,
        rewardAmount,
      });

      const feePortion = await computePortion({
        target: await wishport.BASE_PORTION(),
        percentile: faker.number.bigInt({ min: 0n, max: 100n }),
      });
      const deadline = Math.floor(faker.date.future().getTime() / 1000);
      const signature = await generateSignature({
        signer: invalidSigner,
        types: [
          "uint256",
          "address",
          "bytes4",
          "address",
          "uint256",
          "uint256",
          "uint256",
          "uint256",
        ],
        values: [
          (await ethers.provider.getNetwork()).chainId,
          await wishport.getAddress(),
          IWishportInterface.getFunction("unlist").selector,
          user.address,
          deadline,
          tokenId,
          feePortion,
          await wishport.nonces(user.address),
        ],
      });

      // Act
      const tx = wishport
        .connect(user)
        .unlist(tokenId, feePortion, deadline, signature);

      // Assert
      expect(invalidSigner.address).not.to.equal(await wishport.authedSigner());
      await expect(tx).to.be.revertedWithCustomError(wishport, "InvalidSigner");
    });
    it("should revert if the deadline is less than the current block timestamp", async () => {
      const { wishport, user, erc20, authedSigner } = await loadFixture(
        fixture
      );
      // Arrange
      const IWishportInterface = IWishport__factory.createInterface();
      const tokenId = faker.number.int({ min: 1, max: 1000000 });

      const rewardAmount = faker.number.float({
        min: 0,
        max: 1000,
        precision: 0.01,
      });
      await quickList({
        wishport,
        user,
        erc20,
        tokenId,
        authedSigner,
        rewardAmount,
      });

      const feePortion = await computePortion({
        target: await wishport.BASE_PORTION(),
        percentile: faker.number.bigInt({ min: 0n, max: 100n }),
      });
      const deadline = Math.floor(faker.date.past().getTime() / 1000);
      const signature = await generateSignature({
        signer: authedSigner,
        types: [
          "uint256",
          "address",
          "bytes4",
          "address",
          "uint256",
          "uint256",
          "uint256",
          "uint256",
        ],
        values: [
          (await ethers.provider.getNetwork()).chainId,
          await wishport.getAddress(),
          IWishportInterface.getFunction("unlist").selector,
          user.address,
          deadline,
          tokenId,
          feePortion,
          await wishport.nonces(user.address),
        ],
      });

      // Act

      // Assert
      await expect(
        wishport.connect(user).unlist(tokenId, feePortion, deadline, signature)
      )
        .to.be.revertedWithCustomError(wishport, "ExpiredSignature")
        .withArgs(deadline);
    });
    it("should revert if the operator is not the creator of the wish or the caller is not the owner of the wish", async () => {
      const { wishport, user, erc20, authedSigner, user2, wish } =
        await loadFixture(fixture);
      // Arrange
      const invalidOperator = user2;
      const IWishportInterface = IWishport__factory.createInterface();
      const tokenId = faker.number.int({ min: 1, max: 1000000 });

      const rewardAmount = faker.number.float({
        min: 0,
        max: 1000,
        precision: 0.01,
      });
      await quickList({
        wishport,
        user,
        erc20,
        tokenId,
        authedSigner,
        rewardAmount,
      });

      const feePortion = await computePortion({
        target: await wishport.BASE_PORTION(),
        percentile: faker.number.bigInt({ min: 0n, max: 100n }),
      });
      const deadline = Math.floor(faker.date.future().getTime() / 1000);
      const signature = await generateSignature({
        signer: authedSigner,
        types: [
          "uint256",
          "address",
          "bytes4",
          "address",
          "uint256",
          "uint256",
          "uint256",
          "uint256",
        ],
        values: [
          (await ethers.provider.getNetwork()).chainId,
          await wishport.getAddress(),
          IWishportInterface.getFunction("unlist").selector,
          invalidOperator.address,
          deadline,
          tokenId,
          feePortion,
          await wishport.nonces(invalidOperator.address),
        ],
      });

      // Act
      const tx = wishport
        .connect(invalidOperator)
        .unlist(tokenId, feePortion, deadline, signature);

      // Assert
      expect(invalidOperator.address).not.to.equal(await wish.ownerOf(tokenId));
      await expect(tx)
        .to.be.revertedWithCustomError(wishport, "ERC721InvalidOwner")
        .withArgs(invalidOperator.address);
    });
    it('should consume the user "nonce"', async () => {
      const { wishport, user, erc20, authedSigner } = await loadFixture(
        fixture
      );
      // Arrange
      const IWishportInterface = IWishport__factory.createInterface();
      const tokenId = faker.number.int({ min: 1, max: 1000000 });
      const reward = await erc20.getAddress();
      const rewardAmount = faker.number.float({
        min: 0,
        max: 1000,
        precision: 0.01,
      });
      const rewardAmountBN = UnitParser.toBigNumber(rewardAmount, 18);
      await quickList({
        wishport,
        user,
        erc20,
        tokenId,
        authedSigner,
        rewardAmount,
      });

      const feePortion = await computePortion({
        target: await wishport.BASE_PORTION(),
        percentile: faker.number.bigInt({ min: 0n, max: 100n }),
      });

      const deadline = Math.floor(faker.date.future().getTime() / 1000);
      const signature = await generateSignature({
        signer: authedSigner,
        types: [
          "uint256",
          "address",
          "bytes4",
          "address",
          "uint256",
          "uint256",
          "uint256",
          "uint256",
        ],
        values: [
          (await ethers.provider.getNetwork()).chainId,
          await wishport.getAddress(),
          IWishportInterface.getFunction("unlist").selector,
          user.address,
          deadline,
          tokenId,
          feePortion,
          await wishport.nonces(user.address),
        ],
      });

      // Act
      const before = await wishport.nonces(user.address);
      await wishport
        .connect(user)
        .unlist(tokenId, feePortion, deadline, signature);
      const after = await wishport.nonces(user.address);

      // Assert
      expect(after).to.equal(before + 1n);
    });
    it("should emit a Unlisted event", async () => {
      const { wishport, user, erc20, authedSigner } = await loadFixture(
        fixture
      );
      // Arrange
      const IWishportInterface = IWishport__factory.createInterface();

      const tokenId = faker.number.int({ min: 1, max: 1000000 });
      const reward = await erc20.getAddress();
      const rewardAmount = faker.number.float({
        min: 0,
        max: 1000,
        precision: 0.01,
      });
      const rewardAmountBN = UnitParser.toBigNumber(rewardAmount, 18);
      await quickList({
        wishport,
        user,
        erc20,
        tokenId,
        authedSigner,
        rewardAmount,
      });

      const feePortion = await computePortion({
        target: await wishport.BASE_PORTION(),
        percentile: faker.number.bigInt({ min: 0n, max: 100n }),
      });

      const deadline = Math.floor(faker.date.future().getTime() / 1000);
      const signature = await generateSignature({
        signer: authedSigner,
        types: [
          "uint256",
          "address",
          "bytes4",
          "address",
          "uint256",
          "uint256",
          "uint256",
          "uint256",
        ],
        values: [
          (await ethers.provider.getNetwork()).chainId,
          await wishport.getAddress(),
          IWishportInterface.getFunction("unlist").selector,
          user.address,
          deadline,
          tokenId,
          feePortion,
          await wishport.nonces(user.address),
        ],
      });

      // Act
      const tx = wishport
        .connect(user)
        .unlist(tokenId, feePortion, deadline, signature);

      // Assert
      const fee = await computePortion({
        base: await wishport.BASE_PORTION(),
        percentile: feePortion,
        target: rewardAmountBN,
      });
      const refund = rewardAmountBN - fee;
      await expect(tx)
        .to.emit(wishport, "Unlisted")
        .withArgs(tokenId, user.address, reward, refund, fee);
    });
    it('should remove the wish record from the "wishes" mapping', async () => {
      const { wishport, user, erc20, authedSigner } = await loadFixture(
        fixture
      );
      // Arrange
      const IWishportInterface = IWishport__factory.createInterface();
      const tokenId = faker.number.int({ min: 1, max: 1000000 });
      const rewardAmount = faker.number.float({
        min: 0,
        max: 1000,
        precision: 0.01,
      });
      await quickList({
        wishport,
        user,
        erc20,
        tokenId,
        authedSigner,
        rewardAmount,
      });

      const feePortion = await computePortion({
        target: await wishport.BASE_PORTION(),
        percentile: faker.number.bigInt({ min: 0n, max: 100n }),
      });

      const deadline = Math.floor(faker.date.future().getTime() / 1000);
      const signature = await generateSignature({
        signer: authedSigner,
        types: [
          "uint256",
          "address",
          "bytes4",
          "address",
          "uint256",
          "uint256",
          "uint256",
          "uint256",
        ],
        values: [
          (await ethers.provider.getNetwork()).chainId,
          await wishport.getAddress(),
          IWishportInterface.getFunction("unlist").selector,
          user.address,
          deadline,
          tokenId,
          feePortion,
          await wishport.nonces(user.address),
        ],
      });

      // Act
      const before = await wishport.wishes(tokenId);
      await wishport
        .connect(user)
        .unlist(tokenId, feePortion, deadline, signature);
      const after = await wishport.wishes(tokenId);

      // Assert
      expect(after).to.not.equal(before);
      expect(after.reward).to.equal(ethers.ZeroAddress);
      expect(after.amount).to.equal(0n);
    });
    it('should burn the wish token from the "user"', async () => {
      const { wishport, user, erc20, authedSigner, wish } = await loadFixture(
        fixture
      );
      // Arrange
      const IWishportInterface = IWishport__factory.createInterface();

      const tokenId = faker.number.int({ min: 1, max: 1000000 });
      const rewardAmount = faker.number.float({
        min: 0,
        max: 1000,
        precision: 0.01,
      });
      await quickList({
        wishport,
        user,
        erc20,
        tokenId,
        authedSigner,
        rewardAmount,
      });

      const feePortion = await computePortion({
        target: await wishport.BASE_PORTION(),
        percentile: faker.number.bigInt({ min: 0n, max: 100n }),
      });

      const deadline = Math.floor(faker.date.future().getTime() / 1000);
      const before = await wish.balanceOf(user.address);
      const signature = await generateSignature({
        signer: authedSigner,
        types: [
          "uint256",
          "address",
          "bytes4",
          "address",
          "uint256",
          "uint256",
          "uint256",
          "uint256",
        ],
        values: [
          (await ethers.provider.getNetwork()).chainId,
          await wishport.getAddress(),
          IWishportInterface.getFunction("unlist").selector,
          user.address,
          deadline,
          tokenId,
          feePortion,
          await wishport.nonces(user.address),
        ],
      });

      // Act
      await wishport
        .connect(user)
        .unlist(tokenId, feePortion, deadline, signature);
      const after = await wish.balanceOf(user.address);

      // Assert
      expect(after).to.equal(before - 1n);
    });
    it("should revert if the burn function does not return the correct selector", async () => {
      const { user, deployer, authedSigner, erc20 } = await loadFixture(
        fixture
      );

      const [wish] = await ContractDeployer.Mock.MockIncorrectWish({
        deployer,
      });

      const [mockForwarder] = await ContractDeployer.Mock.MockForwarder();

      const [wishport] = await ContractDeployer.Wishport({
        deployer,
        wish_: await wish.getAddress(),
        authedSigner_: authedSigner.address,
        trustedForwarder_: await mockForwarder.getAddress(),
      });

      // grant the initial admin role to the wishport
      await wish
        .connect(deployer)
        .grantRole(await wish.ADMIN_ROLE(), await wishport.getAddress());

      // Arrange
      const IWishportInterface = IWishport__factory.createInterface();

      const tokenId = faker.number.int({ min: 1, max: 1000000 });
      const pseudoOwnerAddress = user.address;
      const composedTokenId = composeTokenId(pseudoOwnerAddress, tokenId);

      const rewardAmount = faker.number.float({
        min: 0,
        max: 1000,
        precision: 0.01,
      });

      const feePortion = await computePortion({
        target: await wishport.BASE_PORTION(),
        percentile: faker.number.bigInt({ min: 0n, max: 100n }),
      });

      const deadline = Math.floor(faker.date.future().getTime() / 1000);
      const signature = await generateSignature({
        signer: authedSigner,
        types: [
          "uint256",
          "address",
          "bytes4",
          "address",
          "uint256",
          "uint256",
          "uint256",
          "uint256",
        ],
        values: [
          (await ethers.provider.getNetwork()).chainId,
          await wishport.getAddress(),
          IWishportInterface.getFunction("unlist").selector,
          user.address,
          deadline,
          composedTokenId,
          feePortion,
          await wishport.nonces(user.address),
        ],
      });

      // Act
      const tx = wishport
        .connect(user)
        .unlist(composedTokenId, feePortion, deadline, signature);

      // Assert
      await expect(tx)
        .to.revertedWithCustomError(wishport, "FailedWishOperation")
        .withArgs(composedTokenId);
    });
    it('should emit a "Transfer" event', async () => {
      const { wishport, user, erc20, authedSigner, wish } = await loadFixture(
        fixture
      );
      // Arrange
      const IWishportInterface = IWishport__factory.createInterface();

      const tokenId = faker.number.int({ min: 1, max: 1000000 });
      const rewardAmount = faker.number.float({
        min: 0,
        max: 1000,
        precision: 0.01,
      });
      await quickList({
        wishport,
        user,
        erc20,
        tokenId,
        authedSigner,
        rewardAmount,
      });

      const feePortion = await computePortion({
        target: await wishport.BASE_PORTION(),
        percentile: faker.number.bigInt({ min: 0n, max: 100n }),
      });

      const deadline = Math.floor(faker.date.future().getTime() / 1000);
      const signature = await generateSignature({
        signer: authedSigner,
        types: [
          "uint256",
          "address",
          "bytes4",
          "address",
          "uint256",
          "uint256",
          "uint256",
          "uint256",
        ],
        values: [
          (await ethers.provider.getNetwork()).chainId,
          await wishport.getAddress(),
          IWishportInterface.getFunction("unlist").selector,
          user.address,
          deadline,
          tokenId,
          feePortion,
          await wishport.nonces(user.address),
        ],
      });

      // Act
      const tx = wishport
        .connect(user)
        .unlist(tokenId, feePortion, deadline, signature);

      // Assert
      await expect(tx)
        .to.emit(wish, "Transfer")
        .withArgs(user.address, ethers.ZeroAddress, tokenId);
    });
    it('should transfer the fee to the contract "owner" when the reward is erc20', async () => {
      const { wishport, user, erc20, authedSigner, wish } = await loadFixture(
        fixture
      );
      // Arrange
      const IWishportInterface = IWishport__factory.createInterface();
      const tokenId = faker.number.int({ min: 1, max: 1000000 });
      const rewardAmount = faker.number.float({
        min: 0,
        max: 1000,
        precision: 0.01,
      });
      await quickList({
        wishport,
        user,
        erc20,
        tokenId,
        authedSigner,
        rewardAmount,
      });
      const rewardAmountBN = UnitParser.toBigNumber(rewardAmount, 18);
      const feePortion = await computePortion({
        target: await wishport.BASE_PORTION(),
        percentile: faker.number.bigInt({ min: 0n, max: 100n }),
      });
      const deadline = Math.floor(faker.date.future().getTime() / 1000);
      const signature = await generateSignature({
        signer: authedSigner,
        types: [
          "uint256",
          "address",
          "bytes4",
          "address",
          "uint256",
          "uint256",
          "uint256",
          "uint256",
        ],
        values: [
          (await ethers.provider.getNetwork()).chainId,
          await wishport.getAddress(),
          IWishportInterface.getFunction("unlist").selector,
          user.address,
          deadline,
          tokenId,
          feePortion,
          await wishport.nonces(user.address),
        ],
      });

      // Act
      const before = await erc20.balanceOf(await wishport.owner());
      await wishport
        .connect(user)
        .unlist(tokenId, feePortion, deadline, signature);
      const after = await erc20.balanceOf(await wishport.owner());

      // Assert
      const fee = await computePortion({
        base: await wishport.BASE_PORTION(),
        percentile: feePortion,
        target: rewardAmountBN,
      });
      expect(after).to.equal(before + fee);
    });
    it('should transfer the refund to the "creator" when the reward is erc20', async () => {
      const { wishport, user, erc20, authedSigner } = await loadFixture(
        fixture
      );
      // Arrange
      const IWishportInterface = IWishport__factory.createInterface();
      const tokenId = faker.number.int({ min: 1, max: 1000000 });
      const rewardAmount = faker.number.float({
        min: 0,
        max: 1000,
        precision: 0.01,
      });
      const rewardAmountBN = UnitParser.toBigNumber(rewardAmount, 18);
      await quickList({
        wishport,
        user,
        erc20,
        tokenId,
        authedSigner,
        rewardAmount,
      });
      const feePortion = computePortion({
        target: await wishport.BASE_PORTION(),
        percentile: faker.number.bigInt({ min: 0n, max: 100n }),
      });
      const deadline = Math.floor(faker.date.future().getTime() / 1000);
      const signature = await generateSignature({
        signer: authedSigner,
        types: [
          "uint256",
          "address",
          "bytes4",
          "address",
          "uint256",
          "uint256",
          "uint256",
          "uint256",
        ],
        values: [
          (await ethers.provider.getNetwork()).chainId,
          await wishport.getAddress(),
          IWishportInterface.getFunction("unlist").selector,
          user.address,
          deadline,
          tokenId,
          feePortion,
          await wishport.nonces(user.address),
        ],
      });

      // Act
      const before = await erc20.balanceOf(user.address);
      await wishport
        .connect(user)
        .unlist(tokenId, feePortion, deadline, signature);
      const after = await erc20.balanceOf(user.address);

      // Assert
      const fee = await computePortion({
        base: await wishport.BASE_PORTION(),
        percentile: feePortion,
        target: rewardAmountBN,
      });
      const refund = rewardAmountBN - fee;
      expect(after).to.equal(before + refund);
    });
    it('should transfer the refund to the "creator" when the reward is ether', async () => {
      const { wishport, user, authedSigner } = await loadFixture(fixture);
      // Arrange
      const IWishportInterface = IWishport__factory.createInterface();
      const tokenId = faker.number.int({ min: 1, max: 1000000 });

      const rewardAmount = faker.number.float({
        min: 0,
        max: 10,
        precision: 0.01,
      });
      const rewardAmountBN = UnitParser.toEther(rewardAmount);
      await quickList({
        wishport,
        user,
        tokenId,
        authedSigner,
        rewardAmount,
      });
      const feePortion = await computePortion({
        target: await wishport.BASE_PORTION(),
        percentile: faker.number.bigInt({ min: 0n, max: 100n }),
      });
      const deadline = Math.floor(faker.date.future().getTime() / 1000);
      const signature = await generateSignature({
        signer: authedSigner,
        types: [
          "uint256",
          "address",
          "bytes4",
          "address",
          "uint256",
          "uint256",
          "uint256",
          "uint256",
        ],
        values: [
          (await ethers.provider.getNetwork()).chainId,
          await wishport.getAddress(),
          IWishportInterface.getFunction("unlist").selector,
          user.address,
          deadline,
          tokenId,
          feePortion,
          await wishport.nonces(user.address),
        ],
      });

      // Act
      const before = await ethers.provider.getBalance(user.address);
      await wishport
        .connect(user)
        .unlist(tokenId, feePortion, deadline, signature);
      const after = await ethers.provider.getBalance(user.address);

      // Assert
      const fee = await computePortion({
        base: await wishport.BASE_PORTION(),
        percentile: feePortion,
        target: rewardAmountBN,
      });
      const refund = rewardAmountBN - fee;
      expect(after).to.be.greaterThan(before);
      expect(after).to.be.lessThanOrEqual(before + refund);
    });
    it('should transfer the fee to the contract "owner" when the reward is ether', async () => {
      const { wishport, user, authedSigner } = await loadFixture(fixture);
      // Arrange
      const IWishportInterface = IWishport__factory.createInterface();
      const tokenId = faker.number.int({ min: 1, max: 1000000 });

      const rewardAmount = faker.number.float({
        min: 0,
        max: 10,
        precision: 0.01,
      });
      const rewardAmountBN = UnitParser.toEther(rewardAmount);
      await quickList({
        wishport,
        user,
        tokenId,
        authedSigner,
        rewardAmount,
      });
      const feePortion = await computePortion({
        target: await wishport.BASE_PORTION(),
        percentile: 100n,
      });
      const deadline = Math.floor(faker.date.future().getTime() / 1000);
      const signature = await generateSignature({
        signer: authedSigner,
        types: [
          "uint256",
          "address",
          "bytes4",
          "address",
          "uint256",
          "uint256",
          "uint256",
          "uint256",
        ],
        values: [
          (await ethers.provider.getNetwork()).chainId,
          await wishport.getAddress(),
          IWishportInterface.getFunction("unlist").selector,
          user.address,
          deadline,
          tokenId,
          feePortion,
          await wishport.nonces(user.address),
        ],
      });

      // Act
      const before = await ethers.provider.getBalance(await wishport.owner());
      await wishport
        .connect(user)
        .unlist(tokenId, feePortion, deadline, signature);
      const after = await ethers.provider.getBalance(await wishport.owner());

      // Assert
      const fee = await computePortion({
        base: await wishport.BASE_PORTION(),
        percentile: feePortion,
        target: rewardAmountBN,
      });
      expect(after).to.equal(before + fee);
    });
  });
  describe("fulfill", () => {
    it("should revert if the signature is not signed by the authedSigner", async () => {
      const { wishport, user, authedSigner, erc20, user2 } = await loadFixture(
        fixture
      );
      // Arrange
      const invalidSigner = user;
      const fulfiller = user2;
      const IWishportInterface = IWishport__factory.createInterface();
      const tokenId = faker.number.int({ min: 1, max: 1000000 });

      const reward = await erc20.getAddress();
      const rewardAmount = faker.number.float({
        min: 0,
        max: 1000,
        precision: 0.01,
      });
      const rewardAmountBN = UnitParser.toBigNumber(rewardAmount, 18);

      await quickList({
        wishport,
        user,
        erc20,
        tokenId,
        authedSigner,
        rewardAmount,
      });

      const deadline = Math.floor(faker.date.future().getTime() / 1000);

      const feePercentile = faker.number.bigInt({ min: 0n, max: 20n });
      const feePortion = await computePortion({
        target: await wishport.BASE_PORTION(),
        percentile: feePercentile,
      });
      const refundPercentile = faker.number.bigInt({
        min: 0n,
        max: 100n - feePercentile,
      });
      const refundPortion = await computePortion({
        target: await wishport.BASE_PORTION(),
        percentile: refundPercentile,
      });

      const signature = await generateSignature({
        signer: invalidSigner,
        types: [
          "uint256",
          "address",
          "bytes4",
          "address",
          "uint256",
          "uint256",
          "address",
          "uint256",
          "uint256",
          "uint256",
        ],
        values: [
          (await ethers.provider.getNetwork()).chainId,
          await wishport.getAddress(),
          IWishportInterface.getFunction("fulfill").selector,
          fulfiller.address,
          deadline,
          tokenId,
          fulfiller.address,
          refundPortion,
          feePortion,
          await wishport.nonces(fulfiller.address),
        ],
      });

      // Act
      const tx = wishport
        .connect(fulfiller)
        .fulfill(
          tokenId,
          fulfiller.address,
          refundPortion,
          feePortion,
          deadline,
          signature
        );

      // Assert
      expect(invalidSigner.address).not.to.equal(await wishport.authedSigner());
      await expect(tx).to.be.revertedWithCustomError(wishport, "InvalidSigner");
    });
    it("should revert if the deadline is less than the current block timestamp", async () => {
      const { wishport, user, authedSigner, erc20, user2 } = await loadFixture(
        fixture
      );
      // Arrange
      const fulfiller = user2;
      const IWishportInterface = IWishport__factory.createInterface();
      const tokenId = faker.number.int({ min: 1, max: 1000000 });

      const reward = await erc20.getAddress();
      const rewardAmount = faker.number.float({
        min: 0,
        max: 1000,
        precision: 0.01,
      });
      const rewardAmountBN = UnitParser.toBigNumber(rewardAmount, 18);

      await quickList({
        wishport,
        user,
        erc20,
        tokenId,
        authedSigner,
        rewardAmount,
      });

      const deadline = Math.floor(faker.date.past().getTime() / 1000);

      const feePercentile = faker.number.bigInt({ min: 0n, max: 20n });
      const feePortion = computePortion({
        target: await wishport.BASE_PORTION(),
        percentile: feePercentile,
      });
      const refundPercentile = faker.number.bigInt({
        min: 0n,
        max: 100n - feePercentile,
      });
      const refundPortion = computePortion({
        target: await wishport.BASE_PORTION(),
        percentile: refundPercentile,
      });

      const signature = await generateSignature({
        signer: authedSigner,
        types: [
          "uint256",
          "address",
          "bytes4",
          "address",
          "uint256",
          "uint256",
          "address",
          "uint256",
          "uint256",
          "uint256",
        ],
        values: [
          (await ethers.provider.getNetwork()).chainId,
          await wishport.getAddress(),
          IWishportInterface.getFunction("fulfill").selector,
          fulfiller.address,
          deadline,
          tokenId,
          fulfiller.address,
          refundPortion,
          feePortion,
          await wishport.nonces(fulfiller.address),
        ],
      });

      // Act
      const tx = wishport
        .connect(fulfiller)
        .fulfill(
          tokenId,
          fulfiller.address,
          refundPortion,
          feePortion,
          deadline,
          signature
        );

      // Assert
      await expect(tx)
        .to.be.revertedWithCustomError(wishport, "ExpiredSignature")
        .withArgs(deadline);
    });
    it("should revert if the fulfiller is an empty address", async () => {
      const { wishport, user, authedSigner, erc20, user2 } = await loadFixture(
        fixture
      );
      // Arrange
      const IWishportInterface = IWishport__factory.createInterface();
      const tokenId = faker.number.int({ min: 1, max: 1000000 });

      const fulfillerAddress = ethers.ZeroAddress;
      const reward = await erc20.getAddress();
      const rewardAmount = faker.number.float({
        min: 0,
        max: 1000,
        precision: 0.01,
      });
      const rewardAmountBN = UnitParser.toBigNumber(rewardAmount, 18);

      await quickList({
        wishport,
        user,
        erc20,
        tokenId,
        authedSigner,
        rewardAmount,
      });

      const deadline = Math.floor(faker.date.future().getTime() / 1000);

      const feePercentile = faker.number.bigInt({ min: 0n, max: 20n });
      const feePortion = computePortion({
        target: await wishport.BASE_PORTION(),
        percentile: feePercentile,
      });
      const refundPercentile = faker.number.bigInt({
        min: 0n,
        max: 100n - feePercentile,
      });
      const refundPortion = computePortion({
        target: await wishport.BASE_PORTION(),
        percentile: refundPercentile,
      });

      const signature = await generateSignature({
        signer: authedSigner,
        types: [
          "uint256",
          "address",
          "bytes4",
          "address",
          "uint256",
          "uint256",
          "address",
          "uint256",
          "uint256",
          "uint256",
        ],
        values: [
          (await ethers.provider.getNetwork()).chainId,
          await wishport.getAddress(),
          IWishportInterface.getFunction("fulfill").selector,
          user.address,
          deadline,
          tokenId,
          fulfillerAddress,
          refundPortion,
          feePortion,
          await wishport.nonces(user),
        ],
      });

      // Act
      const tx = wishport
        .connect(user)
        .fulfill(
          tokenId,
          fulfillerAddress,
          refundPortion,
          feePortion,
          deadline,
          signature
        );

      // Assert
      expect(fulfillerAddress).to.equal(ethers.ZeroAddress);
      await expect(tx)
        .to.be.revertedWithCustomError(wishport, "InvalidAddress")
        .withArgs(fulfillerAddress);
    });
    it('should revert if the caller is neither the "creator" nor the "fulfiller"', async () => {
      const { wishport, user, authedSigner, erc20, user2 } = await loadFixture(
        fixture
      );
      // Arrange
      const invalidCaller = user2;
      const IWishportInterface = IWishport__factory.createInterface();
      const fulfiller = user;
      const tokenId = faker.number.int({ min: 1, max: 1000000 });

      const reward = await erc20.getAddress();
      const rewardAmount = faker.number.float({
        min: 0,
        max: 1000,
        precision: 0.01,
      });
      const rewardAmountBN = UnitParser.toBigNumber(rewardAmount, 18);

      await quickList({
        wishport,
        user,
        erc20,
        tokenId,
        authedSigner,
        rewardAmount,
      });

      const deadline = Math.floor(faker.date.future().getTime() / 1000);

      const feePercentile = faker.number.bigInt({ min: 0n, max: 20n });
      const feePortion = computePortion({
        target: await wishport.BASE_PORTION(),
        percentile: feePercentile,
      });
      const refundPercentile = faker.number.bigInt({
        min: 0n,
        max: 100n - feePercentile,
      });
      const refundPortion = computePortion({
        target: await wishport.BASE_PORTION(),
        percentile: refundPercentile,
      });

      const signature = await generateSignature({
        signer: authedSigner,
        types: [
          "uint256", // chainId
          "address", // wishport
          "bytes4", // function selector
          "address", // caller
          "uint256", // deadline
          "uint256", // tokenId
          "address", // fulfiller
          "uint256", // refundPortion
          "uint256", // feePortion
          "uint256", // caller nonce
        ],
        values: [
          (await ethers.provider.getNetwork()).chainId,
          await wishport.getAddress(),
          IWishportInterface.getFunction("fulfill").selector,
          invalidCaller.address,
          deadline,
          tokenId,
          fulfiller.address,
          refundPortion,
          feePortion,
          await wishport.nonces(invalidCaller.address),
        ],
      });

      // Act
      const tx = wishport
        .connect(invalidCaller)
        .fulfill(
          tokenId,
          fulfiller.address,
          refundPortion,
          feePortion,
          deadline,
          signature
        );

      // Assert
      expect(invalidCaller.address).not.to.equal(user.address);
      expect(invalidCaller.address).not.to.equal(fulfiller.address);
      await expect(tx)
        .to.be.revertedWithCustomError(wishport, "UnauthorizedAccess")
        .withArgs(invalidCaller.address);
    });
    it('should consume the "caller" nonce if the caller is the fulfiller', async () => {
      const { wishport, user, authedSigner, erc20, user2 } = await loadFixture(
        fixture
      );
      // Arrange
      const IWishportInterface = IWishport__factory.createInterface();
      const fulfiller = user2;
      const tokenId = faker.number.int({ min: 1, max: 1000000 });

      const reward = await erc20.getAddress();
      const rewardAmount = faker.number.float({
        min: 0,
        max: 1000,
        precision: 0.01,
      });
      const rewardAmountBN = UnitParser.toBigNumber(rewardAmount, 18);

      await quickList({
        wishport,
        user,
        erc20,
        tokenId,
        authedSigner,
        rewardAmount,
      });

      const deadline = Math.floor(faker.date.future().getTime() / 1000);

      const feePercentile = faker.number.bigInt({ min: 0n, max: 20n });
      const feePortion = await computePortion({
        target: await wishport.BASE_PORTION(),
        percentile: feePercentile,
      });
      const refundPercentile = faker.number.bigInt({
        min: 0n,
        max: 100n - feePercentile,
      });
      const refundPortion = await computePortion({
        target: await wishport.BASE_PORTION(),
        percentile: refundPercentile,
      });

      const signature = await generateSignature({
        signer: authedSigner,
        types: [
          "uint256", // chainId
          "address", // wishport
          "bytes4", // function selector
          "address", // caller
          "uint256", // deadline
          "uint256", // tokenId
          "address", // fulfiller
          "uint256", // refundPortion
          "uint256", // feePortion
          "uint256", // caller nonce
        ],
        values: [
          (await ethers.provider.getNetwork()).chainId,
          await wishport.getAddress(),
          IWishportInterface.getFunction("fulfill").selector,
          fulfiller.address,
          deadline,
          tokenId,
          fulfiller.address,
          refundPortion,
          feePortion,
          await wishport.nonces(fulfiller.address),
        ],
      });

      // Act
      const before = await wishport.nonces(fulfiller.address);
      await wishport
        .connect(fulfiller)
        .fulfill(
          tokenId,
          fulfiller.address,
          refundPortion,
          feePortion,
          deadline,
          signature
        );
      const after = await wishport.nonces(fulfiller.address);

      // Assert
      expect(after).to.equal(before + 1n);
    });
    it('should consume the "caller" nonce if the caller is the "creator"', async () => {
      const { wishport, user, authedSigner, erc20, user2 } = await loadFixture(
        fixture
      );
      // Arrange
      const IWishportInterface = IWishport__factory.createInterface();
      const fulfiller = user2;
      const tokenId = faker.number.int({ min: 1, max: 1000000 });

      const reward = await erc20.getAddress();
      const rewardAmount = faker.number.float({
        min: 0,
        max: 1000,
        precision: 0.01,
      });
      const rewardAmountBN = UnitParser.toBigNumber(rewardAmount, 18);

      await quickList({
        wishport,
        user,
        erc20,
        tokenId,
        authedSigner,
        rewardAmount,
      });

      const deadline = Math.floor(faker.date.future().getTime() / 1000);

      const feePercentile = faker.number.bigInt({ min: 0n, max: 20n });
      const feePortion = await computePortion({
        target: await wishport.BASE_PORTION(),
        percentile: feePercentile,
      });
      const refundPercentile = faker.number.bigInt({
        min: 0n,
        max: 100n - feePercentile,
      });
      const refundPortion = await computePortion({
        target: await wishport.BASE_PORTION(),
        percentile: refundPercentile,
      });

      const signature = await generateSignature({
        signer: authedSigner,
        types: [
          "uint256", // chainId
          "address", // wishport
          "bytes4", // function selector
          "address", // caller
          "uint256", // deadline
          "uint256", // tokenId
          "address", // fulfiller
          "uint256", // refund
          "uint256", // fee
          "uint256", // caller nonce
        ],
        values: [
          (await ethers.provider.getNetwork()).chainId,
          await wishport.getAddress(),
          IWishportInterface.getFunction("fulfill").selector,
          user.address,
          deadline,
          tokenId,
          fulfiller.address,
          refundPortion,
          feePortion,
          await wishport.nonces(user.address),
        ],
      });

      // Act
      const before = await wishport.nonces(user.address);
      await wishport
        .connect(user)
        .fulfill(
          tokenId,
          fulfiller.address,
          refundPortion,
          feePortion,
          deadline,
          signature
        );
      const after = await wishport.nonces(user.address);

      // Assert
      expect(after).to.equal(before + 1n);
    });
    it('should emit a "Fulfilled" event', async () => {
      const { wishport, user, authedSigner, erc20, user2 } = await loadFixture(
        fixture
      );
      // Arrange
      const IWishportInterface = IWishport__factory.createInterface();
      const fulfiller = user2;
      const tokenId = faker.number.int({ min: 1, max: 1000000 });
      const reward = await erc20.getAddress();
      const rewardAmount = faker.number.float({
        min: 0,
        max: 1000,
        precision: 0.01,
      });
      const rewardAmountBN = UnitParser.toBigNumber(rewardAmount, 18);

      await quickList({
        wishport,
        user,
        erc20,
        tokenId,
        authedSigner,
        rewardAmount,
      });

      const deadline = Math.floor(faker.date.future().getTime() / 1000);

      const feePercentile = faker.number.bigInt({ min: 0n, max: 20n });
      const feePortion = await computePortion({
        target: await wishport.BASE_PORTION(),
        percentile: feePercentile,
      });
      const refundPercentile = faker.number.bigInt({
        min: 0n,
        max: 100n - feePercentile,
      });
      const refundPortion = await computePortion({
        target: await wishport.BASE_PORTION(),
        percentile: refundPercentile,
      });

      const signature = await generateSignature({
        signer: authedSigner,
        types: [
          "uint256",
          "address",
          "bytes4",
          "address",
          "uint256",
          "uint256",
          "address",
          "uint256",
          "uint256",
          "uint256",
        ],
        values: [
          (await ethers.provider.getNetwork()).chainId,
          await wishport.getAddress(),
          IWishportInterface.getFunction("fulfill").selector,
          fulfiller.address,
          deadline,
          tokenId,
          fulfiller.address,
          refundPortion,
          feePortion,
          await wishport.nonces(fulfiller.address),
        ],
      });

      // Act
      const tx = wishport
        .connect(fulfiller)
        .fulfill(
          tokenId,
          fulfiller.address,
          refundPortion,
          feePortion,
          deadline,
          signature
        );

      // Assert
      const fee = await computePortion({
        base: await wishport.BASE_PORTION(),
        percentile: feePortion,
        target: rewardAmountBN,
      });
      const refund = await computePortion({
        base: await wishport.BASE_PORTION(),
        percentile: refundPortion,
        target: rewardAmountBN - fee,
      });
      const netAmount = rewardAmountBN - fee - refund;
      await expect(tx)
        .to.emit(wishport, "Fulfilled")
        .withArgs(tokenId, fulfiller.address, reward, netAmount, refund, fee);
    });
    it("should revert if the complete function does not return the correct selector", async () => {
      const { deployer, user, authedSigner, erc20, user2 } = await loadFixture(
        fixture
      );

      const [wish] = await ContractDeployer.Mock.MockIncorrectWish({
        deployer,
      });

      const [mockForwarder] = await ContractDeployer.Mock.MockForwarder();

      const [wishport] = await ContractDeployer.Wishport({
        deployer,
        wish_: await wish.getAddress(),
        authedSigner_: authedSigner.address,
        trustedForwarder_: await mockForwarder.getAddress(),
      });

      // grant the initial admin role to the wishport
      await wish
        .connect(deployer)
        .grantRole(await wish.ADMIN_ROLE(), await wishport.getAddress());

      // Arrange
      const IWishportInterface = IWishport__factory.createInterface();
      const fulfiller = user2;
      const tokenId = faker.number.int({ min: 1, max: 1000000 });
      const pseudoOwnerAddress = user.address;
      const composedTokenId = composeTokenId(pseudoOwnerAddress, tokenId);

      const deadline = Math.floor(faker.date.future().getTime() / 1000);
      const feePercentile = faker.number.bigInt({ min: 0n, max: 20n });
      const feePortion = await computePortion({
        target: await wishport.BASE_PORTION(),
        percentile: feePercentile,
      });
      const refundPercentile = faker.number.bigInt({
        min: 0n,
        max: 100n - feePercentile,
      });
      const refundPortion = await computePortion({
        target: await wishport.BASE_PORTION(),
        percentile: refundPercentile,
      });
      const signature = await generateSignature({
        signer: authedSigner,
        types: [
          "uint256", // chainId
          "address", // wishport
          "bytes4", // function selector
          "address", // caller
          "uint256", // deadline
          "uint256", // tokenId
          "address", // fulfiller
          "uint256", // refund
          "uint256", // fee
          "uint256", // caller nonce
        ],
        values: [
          (await ethers.provider.getNetwork()).chainId,
          await wishport.getAddress(),
          IWishportInterface.getFunction("fulfill").selector,
          fulfiller.address,
          deadline,
          composedTokenId,
          fulfiller.address,
          refundPortion,
          feePortion,
          await wishport.nonces(fulfiller.address),
        ],
      });

      // Act

      const tx = wishport
        .connect(fulfiller)
        .fulfill(
          composedTokenId,
          fulfiller.address,
          refundPortion,
          feePortion,
          deadline,
          signature
        );

      // Assert
      await expect(tx)
        .to.revertedWithCustomError(wishport, "FailedWishOperation")
        .withArgs(composedTokenId);
    });
    it("should complete the wish", async () => {
      const { wishport, user, authedSigner, erc20, user2, wish } =
        await loadFixture(fixture);
      // Arrange
      const IWishportInterface = IWishport__factory.createInterface();
      const fulfiller = user2;
      const tokenId = faker.number.int({ min: 1, max: 1000000 });
      const reward = await erc20.getAddress();
      const rewardAmount = faker.number.float({
        min: 0,
        max: 1000,
        precision: 0.01,
      });
      const rewardAmountBN = UnitParser.toBigNumber(rewardAmount, 18);

      await quickList({
        wishport,
        user,
        erc20,
        tokenId,
        authedSigner,
        rewardAmount,
      });
      const deadline = Math.floor(faker.date.future().getTime() / 1000);
      const feePercentile = faker.number.bigInt({ min: 0n, max: 20n });
      const feePortion = await computePortion({
        target: await wishport.BASE_PORTION(),
        percentile: feePercentile,
      });
      const refundPercentile = faker.number.bigInt({
        min: 0n,
        max: 100n - feePercentile,
      });
      const refundPortion = await computePortion({
        target: await wishport.BASE_PORTION(),
        percentile: refundPercentile,
      });
      const signature = await generateSignature({
        signer: authedSigner,
        types: [
          "uint256", // chainId
          "address", // wishport
          "bytes4", // function selector
          "address", // caller
          "uint256", // deadline
          "uint256", // tokenId
          "address", // fulfiller
          "uint256", // refund
          "uint256", // fee
          "uint256", // caller nonce
        ],
        values: [
          (await ethers.provider.getNetwork()).chainId,
          await wishport.getAddress(),
          IWishportInterface.getFunction("fulfill").selector,
          fulfiller.address,
          deadline,
          tokenId,
          fulfiller.address,
          refundPortion,
          feePortion,
          await wishport.nonces(fulfiller.address),
        ],
      });
      // Act
      const before = await wish.completions(tokenId);
      await wishport
        .connect(fulfiller)
        .fulfill(
          tokenId,
          fulfiller.address,
          refundPortion,
          feePortion,
          deadline,
          signature
        );
      const after = await wish.completions(tokenId);

      // Assert
      expect(after).not.to.equal(before);
      expect(after).to.be.true;
    });
    it('should transfer the fee to the contract "owner" when the reward is ether', async () => {
      const { wishport, user, authedSigner, erc20, user2, wish } =
        await loadFixture(fixture);
      // Arrange
      const IWishportInterface = IWishport__factory.createInterface();
      const fulfiller = user2;
      const tokenId = faker.number.int({ min: 1, max: 1000000 });
      const reward = await erc20.getAddress();
      const rewardAmount = faker.number.int({ min: 0, max: 10 });
      const rewardAmountBN = UnitParser.toEther(rewardAmount);

      await quickList({
        wishport,
        user,
        tokenId,
        authedSigner,
        rewardAmount,
      });
      const deadline = Math.floor(faker.date.future().getTime() / 1000);

      const feePortion = computePortion({
        target: await wishport.BASE_PORTION(),
        percentile: 12n,
      });
      const refundPercentile = 15n;
      const refundPortion = await computePortion({
        target: await wishport.BASE_PORTION(),
        percentile: refundPercentile,
      });
      const signature = await generateSignature({
        signer: authedSigner,
        types: [
          "uint256", // chainId
          "address", // wishport
          "bytes4", // function selector
          "address", // caller
          "uint256", // deadline
          "uint256", // tokenId
          "address", // fulfiller
          "uint256", // refund
          "uint256", // fee
          "uint256", // caller nonce
        ],
        values: [
          (await ethers.provider.getNetwork()).chainId,
          await wishport.getAddress(),
          IWishportInterface.getFunction("fulfill").selector,
          fulfiller.address,
          deadline,
          tokenId,
          fulfiller.address,
          refundPortion,
          feePortion,
          await wishport.nonces(fulfiller.address),
        ],
      });

      // Act
      const before = await ethers.provider.getBalance(await wishport.owner());
      await wishport
        .connect(fulfiller)
        .fulfill(
          tokenId,
          fulfiller.address,
          refundPortion,
          feePortion,
          deadline,
          signature
        );
      const after = await ethers.provider.getBalance(await wishport.owner());

      // Assert
      const fee = computePortion({
        base: await wishport.BASE_PORTION(),
        percentile: feePortion,
        target: rewardAmountBN,
      });
      expect(after).to.equal(before + fee);
    });
    it('should transfer the refund to the "creator" when the reward is ether', async () => {
      const { wishport, user, authedSigner, erc20, user2 } = await loadFixture(
        fixture
      );
      // Arrange
      const IWishportInterface = IWishport__factory.createInterface();
      const fulfiller = user2;
      const tokenId = faker.number.int({ min: 1, max: 1000000 });
      const reward = await erc20.getAddress();
      const rewardAmount = faker.number.float({
        min: 0,
        max: 10,
        precision: 0.01,
      });
      const rewardAmountBN = UnitParser.toEther(rewardAmount);

      await quickList({
        wishport,
        user,
        tokenId,
        authedSigner,
        rewardAmount,
      });
      const deadline = Math.floor(faker.date.future().getTime() / 1000);
      const feePercentile = faker.number.bigInt({ min: 0n, max: 20n });
      const feePortion = await computePortion({
        target: await wishport.BASE_PORTION(),
        percentile: feePercentile,
      });
      const refundPercentile = faker.number.bigInt({
        min: 0n,
        max: 100n - feePercentile,
      });
      const refundPortion = await computePortion({
        target: await wishport.BASE_PORTION(),
        percentile: refundPercentile,
      });
      const signature = await generateSignature({
        signer: authedSigner,
        types: [
          "uint256", // chainId
          "address", // wishport
          "bytes4", // function selector
          "address", // caller
          "uint256", // deadline
          "uint256", // tokenId
          "address", // fulfiller
          "uint256", // refund
          "uint256", // fee
          "uint256", // caller nonce
        ],
        values: [
          (await ethers.provider.getNetwork()).chainId,
          await wishport.getAddress(),
          IWishportInterface.getFunction("fulfill").selector,
          fulfiller.address,
          deadline,
          tokenId,
          fulfiller.address,
          refundPortion,
          feePortion,
          await wishport.nonces(fulfiller.address),
        ],
      });

      // Act
      const before = await ethers.provider.getBalance(user.address);
      await wishport
        .connect(fulfiller)
        .fulfill(
          tokenId,
          fulfiller.address,
          refundPortion,
          feePortion,
          deadline,
          signature
        );
      const after = await ethers.provider.getBalance(user.address);

      // Assert
      const fee = computePortion({
        base: await wishport.BASE_PORTION(),
        percentile: feePortion,
        target: rewardAmountBN,
      });
      const refund = computePortion({
        base: await wishport.BASE_PORTION(),
        percentile: refundPortion,
        target: rewardAmountBN - fee,
      });
      expect(after).to.equal(before + refund);
    });
    it('should transfer the reward to the "fulfiller" when the reward is ether', async () => {
      const { wishport, user, authedSigner, erc20, user2 } = await loadFixture(
        fixture
      );
      // Arrange
      const IWishportInterface = IWishport__factory.createInterface();
      const fulfiller = user2;
      const tokenId = faker.number.int({ min: 1, max: 1000000 });
      const reward = await erc20.getAddress();
      const rewardAmount = faker.number.float({
        min: 0,
        max: 10,
        precision: 0.01,
      });
      const rewardAmountBN = UnitParser.toEther(rewardAmount);

      await quickList({
        wishport,
        user,
        tokenId,
        authedSigner,
        rewardAmount,
      });
      const deadline = Math.floor(faker.date.future().getTime() / 1000);
      const feePercentile = faker.number.bigInt({ min: 0n, max: 20n });
      const feePortion = await computePortion({
        target: await wishport.BASE_PORTION(),
        percentile: feePercentile,
      });
      const refundPercentile = faker.number.bigInt({
        min: 0n,
        max: 100n - feePercentile,
      });
      const refundPortion = await computePortion({
        target: await wishport.BASE_PORTION(),
        percentile: refundPercentile,
      });
      const signature = await generateSignature({
        signer: authedSigner,
        types: [
          "uint256", // chainId
          "address", // wishport
          "bytes4", // function selector
          "address", // caller
          "uint256", // deadline
          "uint256", // tokenId
          "address", // fulfiller
          "uint256", // refund
          "uint256", // fee
          "uint256", // caller nonce
        ],
        values: [
          (await ethers.provider.getNetwork()).chainId,
          await wishport.getAddress(),
          IWishportInterface.getFunction("fulfill").selector,
          user.address,
          deadline,
          tokenId,
          fulfiller.address,
          refundPortion,
          feePortion,
          await wishport.nonces(user.address),
        ],
      });

      // Act
      const before = await ethers.provider.getBalance(fulfiller.address);
      await wishport
        .connect(user)
        .fulfill(
          tokenId,
          fulfiller.address,
          refundPortion,
          feePortion,
          deadline,
          signature
        );
      const after = await ethers.provider.getBalance(fulfiller.address);

      // Assert
      const fee = computePortion({
        base: await wishport.BASE_PORTION(),
        percentile: feePortion,
        target: rewardAmountBN,
      });
      const refund = computePortion({
        base: await wishport.BASE_PORTION(),
        percentile: refundPortion,
        target: rewardAmountBN - fee,
      });
      const netAmount = rewardAmountBN - fee - refund;
      expect(after).to.equal(before + netAmount);
    });
    it('should transfer the fee to the contract "owner" when the reward is an ERC20 token', async () => {
      const { wishport, user, authedSigner, erc20, user2, wish } =
        await loadFixture(fixture);
      // Arrange
      const IWishportInterface = IWishport__factory.createInterface();
      const fulfiller = user2;
      const tokenId = faker.number.int({ min: 1, max: 1000000 });
      const rewardAmount = faker.number.float({
        min: 0,
        max: 1000,
        precision: 0.01,
      });
      const rewardAmountBN = UnitParser.toBigNumber(rewardAmount, 18);

      await quickList({
        wishport,
        user,
        erc20,
        tokenId,
        authedSigner,
        rewardAmount,
      });
      const deadline = Math.floor(faker.date.future().getTime() / 1000);
      const feePercentile = faker.number.bigInt({ min: 0n, max: 20n });
      const feePortion = await computePortion({
        target: await wishport.BASE_PORTION(),
        percentile: feePercentile,
      });
      const refundPercentile = faker.number.bigInt({
        min: 0n,
        max: 100n - feePercentile,
      });
      const refundPortion = await computePortion({
        target: await wishport.BASE_PORTION(),
        percentile: refundPercentile,
      });
      const signature = await generateSignature({
        signer: authedSigner,
        types: [
          "uint256", // chainId
          "address", // wishport
          "bytes4", // function selector
          "address", // caller
          "uint256", // deadline
          "uint256", // tokenId
          "address", // fulfiller
          "uint256", // refund
          "uint256", // fee
          "uint256", // caller nonce
        ],
        values: [
          (await ethers.provider.getNetwork()).chainId,
          await wishport.getAddress(),
          IWishportInterface.getFunction("fulfill").selector,
          fulfiller.address,
          deadline,
          tokenId,
          fulfiller.address,
          refundPortion,
          feePortion,
          await wishport.nonces(fulfiller),
        ],
      });

      // Act
      const before = await erc20.balanceOf(await wishport.owner());
      await wishport
        .connect(fulfiller)
        .fulfill(
          tokenId,
          fulfiller.address,
          refundPortion,
          feePortion,
          deadline,
          signature
        );
      const after = await erc20.balanceOf(await wishport.owner());

      // Assert
      const fee = computePortion({
        base: await wishport.BASE_PORTION(),
        percentile: feePortion,
        target: rewardAmountBN,
      });
      expect(after).to.equal(before + fee);
    });
    it('should transfer the refund to the "creator" when the reward is an ERC20 token', async () => {
      const { wishport, user, authedSigner, erc20, user2 } = await loadFixture(
        fixture
      );
      // Arrange
      const IWishportInterface = IWishport__factory.createInterface();
      const fulfiller = user2;
      const tokenId = faker.number.int({ min: 1, max: 1000000 });
      const rewardAmount = faker.number.float({
        min: 0,
        max: 1000,
        precision: 0.01,
      });
      const rewardAmountBN = UnitParser.toBigNumber(rewardAmount, 18);

      await quickList({
        wishport,
        user,
        erc20,
        tokenId,
        authedSigner,
        rewardAmount,
      });
      const deadline = Math.floor(faker.date.future().getTime() / 1000);
      const feePercentile = faker.number.bigInt({ min: 0n, max: 20n });
      const feePortion = await computePortion({
        target: await wishport.BASE_PORTION(),
        percentile: feePercentile,
      });
      const refundPercentile = faker.number.bigInt({
        min: 0n,
        max: 100n - feePercentile,
      });
      const refundPortion = await computePortion({
        target: await wishport.BASE_PORTION(),
        percentile: refundPercentile,
      });
      const signature = await generateSignature({
        signer: authedSigner,
        types: [
          "uint256", // chainId
          "address", // wishport
          "bytes4", // function selector
          "address", // caller
          "uint256", // deadline
          "uint256", // tokenId
          "address", // fulfiller
          "uint256", // refund
          "uint256", // fee
          "uint256", // caller nonce
        ],
        values: [
          (await ethers.provider.getNetwork()).chainId,
          await wishport.getAddress(),
          IWishportInterface.getFunction("fulfill").selector,
          fulfiller.address,
          deadline,
          tokenId,
          fulfiller.address,
          refundPortion,
          feePortion,
          await wishport.nonces(fulfiller),
        ],
      });

      // Act
      const before = await erc20.balanceOf(user.address);
      await wishport
        .connect(fulfiller)
        .fulfill(
          tokenId,
          fulfiller.address,
          refundPortion,
          feePortion,
          deadline,
          signature
        );
      const after = await erc20.balanceOf(user.address);

      // Assert
      const fee = computePortion({
        base: await wishport.BASE_PORTION(),
        percentile: feePortion,
        target: rewardAmountBN,
      });
      const refund = computePortion({
        base: await wishport.BASE_PORTION(),
        percentile: refundPortion,
        target: rewardAmountBN - fee,
      });
      expect(after).to.equal(before + refund);
    });
    it('should transfer the reward to the "fulfiller" when the reward is an ERC20 token', async () => {
      const { wishport, user, authedSigner, erc20, user2 } = await loadFixture(
        fixture
      );
      // Arrange
      const IWishportInterface = IWishport__factory.createInterface();
      const fulfiller = user2;
      const tokenId = faker.number.int({ min: 1, max: 1000000 });
      const rewardAmount = faker.number.float({
        min: 0,
        max: 1000,
        precision: 0.01,
      });
      const rewardAmountBN = UnitParser.toBigNumber(rewardAmount, 18);

      await quickList({
        wishport,
        user,
        erc20,
        tokenId,
        authedSigner,
        rewardAmount,
      });
      const deadline = Math.floor(faker.date.future().getTime() / 1000);
      const feePercentile = faker.number.bigInt({ min: 0n, max: 20n });
      const feePortion = await computePortion({
        target: await wishport.BASE_PORTION(),
        percentile: feePercentile,
      });
      const refundPercentile = faker.number.bigInt({
        min: 0n,
        max: 100n - feePercentile,
      });
      const refundPortion = await computePortion({
        target: await wishport.BASE_PORTION(),
        percentile: refundPercentile,
      });
      const signature = await generateSignature({
        signer: authedSigner,
        types: [
          "uint256", // chainId
          "address", // wishport
          "bytes4", // function selector
          "address", // caller
          "uint256", // deadline
          "uint256", // tokenId
          "address", // fulfiller
          "uint256", // refund
          "uint256", // fee
          "uint256", // caller nonce
        ],
        values: [
          (await ethers.provider.getNetwork()).chainId,
          await wishport.getAddress(),
          IWishportInterface.getFunction("fulfill").selector,
          fulfiller.address,
          deadline,
          tokenId,
          fulfiller.address,
          refundPortion,
          feePortion,
          await wishport.nonces(fulfiller),
        ],
      });

      // Act
      const before = await erc20.balanceOf(fulfiller.address);
      await wishport
        .connect(fulfiller)
        .fulfill(
          tokenId,
          fulfiller.address,
          refundPortion,
          feePortion,
          deadline,
          signature
        );
      const after = await erc20.balanceOf(fulfiller.address);

      // Assert
      const fee = computePortion({
        base: await wishport.BASE_PORTION(),
        percentile: feePortion,
        target: rewardAmountBN,
      });
      const refund = computePortion({
        base: await wishport.BASE_PORTION(),
        percentile: refundPortion,
        target: rewardAmountBN - fee,
      });
      const netAmount = rewardAmountBN - fee - refund;
      expect(after).to.equal(before + netAmount);
    });
  });
  describe("receive", () => {
    it("should be able to receive ether", async () => {
      const { wishport, user } = await loadFixture(fixture);
      // Arrange
      const amount = faker.number.float({ min: 0.1, max: 1 });
      const value = ethers.parseEther(amount.toString());

      // Act
      const before = await ethers.provider.getBalance(
        await wishport.getAddress()
      );
      const tx = await user.sendTransaction({
        to: await wishport.getAddress(),
        value,
      });
      await tx.wait();
      const after = await ethers.provider.getBalance(
        await wishport.getAddress()
      );

      // Assert
      expect(before).to.be.lt(after);
      expect(after).to.be.eq(before + value);
    });
  });
  describe("fallback", () => {
    it("should be able to receive ether", async () => {
      const { wishport, user } = await loadFixture(fixture);
      // Arrange
      const amount = faker.number.float({ min: 0.1, max: 1 });
      const value = ethers.parseEther(amount.toString());
      const ERC20Interface = ERC20__factory.createInterface();
      const createFakeTxData = ERC20Interface.encodeFunctionData(
        "transferFrom",
        [user.address, user.address, 0]
      );

      // Act
      const before = await ethers.provider.getBalance(
        await wishport.getAddress()
      );
      const tx = await user.sendTransaction({
        to: await wishport.getAddress(),
        value,
        data: createFakeTxData,
      });
      await tx.wait();
      const after = await ethers.provider.getBalance(
        await wishport.getAddress()
      );

      // Assert
      expect(before).to.be.lt(after);
      expect(after).to.be.eq(before + value);
    });
  });
  describe("ERC2771Context", () => {
    it("should support meta-transaction", async () => {
      const { wishport, authedSigner, forwarder, deployer, relayer, user2 } =
        await loadFixture(fixture);
      // Arrange
      const caller = deployer;
      const from = await caller.getAddress();
      const to = await wishport.getAddress();
      const value = 0;
      const deadline = Math.floor(faker.date.future().getTime() / 1000);
      const forwarderNonce = await forwarder.nonces(from);
      const data = wishport.interface.encodeFunctionData("setAuthedSigner", [
        user2.address,
      ]);
      const gas = 1000000;

      const EIP712Domain = [
        { name: "name", type: "string" },
        { name: "version", type: "string" },
        { name: "chainId", type: "uint256" },
        { name: "verifyingContract", type: "address" },
      ];

      const ForwardRequest = [
        { name: "from", type: "address" },
        { name: "to", type: "address" },
        { name: "value", type: "uint256" },
        { name: "gas", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint48" },
        { name: "data", type: "bytes" },
      ];

      const ForwardRequestData = {
        from,
        to,
        value,
        gas,
        nonce: forwarderNonce,
        deadline,
        data,
      };
      const domain = await forwarder.eip712Domain();
      const metatx = {
        primaryType: "ForwardRequest",
        types: {
          EIP712Domain,
          ForwardRequest,
        },
        domain: {
          name: domain.name,
          version: domain.version,
          chainId: domain.chainId,
          verifyingContract: domain.verifyingContract,
        },
        message: ForwardRequestData,
      };
      await forwarder.eip712Domain();

      // sign metatransaction data
      const metatxSignature = await caller.signTypedData(
        metatx.domain,
        {
          ForwardRequest: metatx.types.ForwardRequest,
        },
        metatx.message
      );

      // Act
      const verification = await forwarder.verify({
        ...ForwardRequestData,
        signature: metatxSignature,
      });
      const before = await wishport.authedSigner();
      const tx = await forwarder.connect(relayer).execute({
        ...ForwardRequestData,
        signature: metatxSignature,
      });
      await tx.wait();
      const after = await wishport.authedSigner();

      // Assert
      expect(verification).to.be.true;
      expect(before).to.be.not.eq(after);
      expect(after).to.be.eq(user2.address);
      expect(before).to.be.eq(authedSigner.address);
    });
    describe("trustedForwarder", async () => {
      const { wishport, authedSigner, forwarder, deployer, relayer } =
        await loadFixture(fixture);
      // Arrange

      // Act

      // Assert
      expect(await wishport.trustedForwarder()).to.be.equal(
        await forwarder.getAddress()
      );
    });
    describe("isTrustedForwarder", () => {
      it("should return true if the target is the trusted forwarder", async () => {
        const { wishport, authedSigner, forwarder, deployer, relayer } =
          await loadFixture(fixture);
        // Arrange

        // Act
        const res = await wishport.isTrustedForwarder(
          await forwarder.getAddress()
        );

        // Assert
        expect(res).to.be.true;
      });
      it("should return false if the target is not the trusted forwarder", async () => {
        const { wishport, authedSigner, forwarder, deployer, relayer } =
          await loadFixture(fixture);
        // Arrange

        // Act
        const res = await wishport.isTrustedForwarder(
          await relayer.getAddress()
        );

        // Assert
        expect(res).to.be.false;
      });
    });
  });

  describe("Behaviours", () => {
    const tokenRecoveryBehaviourFixture = async () => {
      const [deployer, authedSigner] = await ethers.getSigners();

      const [wish] = await ContractDeployer.Wish({
        deployer,
        admins: [],
        contractURI_: faker.internet.url(),
        uri_: faker.internet.url(),
      });

      const [mockForwarder] = await ContractDeployer.Mock.MockForwarder();

      const [wishport] = await ContractDeployer.Wishport({
        deployer,
        wish_: await wish.getAddress(),
        authedSigner_: authedSigner.address,
        trustedForwarder_: await mockForwarder.getAddress(),
      });
      return wishport;
    };

    shouldBehaveLikeTokenRecovery(tokenRecoveryBehaviourFixture);

    const ownableBehaviourFixture = async () => {
      const [deployer, authedSigner, newOwner] = await ethers.getSigners();

      const [wish] = await ContractDeployer.Wish({
        deployer,
        admins: [],
        contractURI_: faker.internet.url(),
        uri_: faker.internet.url(),
      });

      const [mockForwarder] = await ContractDeployer.Mock.MockForwarder();

      const [wishport] = await ContractDeployer.Wishport({
        deployer,
        wish_: await wish.getAddress(),
        authedSigner_: authedSigner.address,
        trustedForwarder_: await mockForwarder.getAddress(),
      });
      return { target: wishport, owner: deployer, newOwner };
    };

    shouldBehaveLikeOwnable(ownableBehaviourFixture);
  });
});
