import { ethers } from "hardhat";
import { expect } from "chai";
import { ContractDeployer } from "@test/utils/contract-deployer";
import { faker } from "@faker-js/faker";
import { IERC165__factory, IERC721__factory } from "@/types";
import { composeTokenId } from "@/utils/composeTokenId";
import { generateInterfaceId } from "@test/utils/generateInterfaceId";
import { IWish__factory } from "@/types/factories/contracts/wish/IWish__factory";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("Wish", () => {
  async function deployWishFixture() {
    const [deployer, admin, user, user2, user3, user4] =
      await ethers.getSigners();
    const contractURI = faker.internet.url();
    const baseURI = faker.internet.url();

    const [wish] = await ContractDeployer.Wish({
      deployer,
      admins: [admin.address],
      contractURI_: contractURI,
      uri_: baseURI,
    });

    return {
      wish,
      deployer,
      admin,
      user,
      user2,
      user3,
      user4,
      contractURI,
      baseURI,
    };
  }

  describe("Deployment", () => {
    it("should set the deployer as owner", async () => {
      const { wish, deployer } = await loadFixture(deployWishFixture);
      // Arrange

      // Act

      // Assert
      expect(await wish.owner()).to.equal(deployer.address);
    });
    it("should set the contractURI", async () => {
      const { wish, contractURI } = await loadFixture(deployWishFixture);
      // Arrange

      // Act

      // Assert
      expect(await wish.contractURI()).to.equal(contractURI);
    });
    it("should set the baseURI", async () => {
      const { wish, baseURI } = await loadFixture(deployWishFixture);
      // Arrange

      // Act

      // Assert
      expect(await wish.baseURI()).to.equal(baseURI);
    });
    it("should set the DEFAULT_ADMIN_ROLE to deployer", async () => {
      const { wish, deployer } = await loadFixture(deployWishFixture);
      // Arrange

      // Act

      // Assert
      expect(
        await wish.hasRole(await wish.DEFAULT_ADMIN_ROLE(), deployer.address)
      ).to.be.true;
    });
  });

  describe("MINT_SELECTOR", () => {
    it("should return the function selector for mint", async () => {
      const { wish } = await loadFixture(deployWishFixture);
      // Arrange
      const IWishInterface = IWish__factory.createInterface();

      // Act

      // Assert
      expect(await wish.MINT_SELECTOR()).to.equal(
        IWishInterface.getFunction("mint").selector
      );
    });
  });

  describe("BURN_SELECTOR", () => {
    it("should return the function selector for burn", async () => {
      const { wish } = await loadFixture(deployWishFixture);
      // Arrange
      const IWishInterface = IWish__factory.createInterface();

      // Act

      // Assert
      expect(await wish.BURN_SELECTOR()).to.equal(
        IWishInterface.getFunction("burn").selector
      );
    });
  });

  describe("COMPLETE_SELECTOR", () => {
    it("should return the function selector for complete", async () => {
      const { wish } = await loadFixture(deployWishFixture);
      // Arrange
      const IWishInterface = IWish__factory.createInterface();

      // Act

      // Assert
      expect(await wish.COMPLETE_SELECTOR()).to.equal(
        IWishInterface.getFunction("complete").selector
      );
    });
  });

  describe("contractURI", () => {
    it("should return the contractURI", async () => {
      const { wish, contractURI } = await loadFixture(deployWishFixture);
      // Arrange

      // Act

      // Assert
      expect(await wish.contractURI()).to.equal(contractURI);
    });
  });

  describe("setContractURI", () => {
    it("should set the contractURI", async () => {
      const { wish } = await loadFixture(deployWishFixture);
      // Arrange
      const newContractURI = faker.internet.url();

      // Act
      await wish.setContractURI(newContractURI);

      // Assert
      expect(await wish.contractURI()).to.equal(newContractURI);
    });
    it("should throw error if caller is not admin", async () => {
      const { wish, user } = await loadFixture(deployWishFixture);
      // Arrange
      const newContractURI = faker.internet.url();

      // Act

      // Assert
      await expect(wish.connect(user).setContractURI(newContractURI))
        .to.be.revertedWithCustomError(wish, "OwnableUnauthorizedAccount")
        .withArgs(user.address);
    });
  });

  describe("baseURI", () => {
    it("should return the baseURI", async () => {
      const { wish, baseURI } = await loadFixture(deployWishFixture);
      // Arrange

      // Act

      // Assert
      expect(await wish.baseURI()).to.equal(baseURI);
    });
  });

  describe("setBaseURI", () => {
    it("should set the baseURI", async () => {
      const { wish, deployer } = await loadFixture(deployWishFixture);
      // Arrange
      const newBaseURI = faker.internet.url();

      // Act
      await wish.connect(deployer).setBaseURI(newBaseURI);

      // Assert
      expect(await wish.baseURI()).to.equal(newBaseURI);
    });
    it("should throw error if caller is not admin", async () => {
      const { wish, user } = await loadFixture(deployWishFixture);
      // Arrange
      const newBaseURI = faker.internet.url();

      // Act

      // Assert
      await expect(wish.connect(user).setBaseURI(newBaseURI))
        .to.be.revertedWithCustomError(wish, "OwnableUnauthorizedAccount")
        .withArgs(user.address);
    });
  });

  describe("tokenURI", () => {
    it("should throw error if tokenId is less than or equals to 96 bits and has not been minted", async () => {
      const { wish } = await loadFixture(deployWishFixture);
      // Arrange
      const tokenId = faker.number.int({ min: 1, max: 1000 });

      // Act

      // Assert
      await expect(wish.tokenURI(tokenId))
        .to.be.revertedWithCustomError(wish, "ERC721NonexistentToken")
        .withArgs(tokenId);
    });
    it("should return the tokenURI if tokenId is less than or equals to 96 bits and has been minted", async () => {
      const { wish, user, admin, baseURI } = await loadFixture(
        deployWishFixture
      );
      // Arrange
      const tokenId = faker.number.int({ min: 1, max: 1000 });

      // Act
      await wish.connect(admin).mint(user.address, tokenId);

      // Assert
      expect(await wish.baseURI()).to.equal(baseURI);
      expect(await wish.tokenURI(tokenId)).to.equal(
        baseURI + tokenId.toString()
      );
    });
    it("should return the tokenURI of the original token if tokenId is greater than 96 bits and has not been minted", async () => {
      const { wish, user, baseURI } = await loadFixture(deployWishFixture);
      // Arrange
      const tokenId = faker.number.int({ min: 1, max: 1000 });
      const pseudoOwnerAddress = user.address;
      const composedTokenId = composeTokenId(pseudoOwnerAddress, tokenId);

      // Act

      // Assert
      expect(await wish.baseURI()).to.equal(baseURI);
      expect(await wish.tokenURI(composedTokenId)).to.equal(
        baseURI + tokenId.toString()
      );
    });

    it("should return the tokenURI of the original token if tokenId is greater than 96 bits and has been minted", async () => {
      const { wish, user, admin, baseURI } = await loadFixture(
        deployWishFixture
      );
      // Arrange
      const tokenId = faker.number.int({ min: 1, max: 1000 });
      const pseudoOwnerAddress = user.address;
      const composedTokenId = composeTokenId(pseudoOwnerAddress, tokenId);

      // Act
      await wish.connect(admin).mint(user.address, tokenId);

      // Assert
      expect(await wish.baseURI()).to.equal(baseURI);
      expect(await wish.tokenURI(composedTokenId)).to.equal(
        baseURI + tokenId.toString()
      );
    });

    it("should return empty string if baseURI is an empty string and the tokenId is less than or equals to 96 bits", async () => {
      const { wish, admin, user, deployer } = await loadFixture(
        deployWishFixture
      );
      // Arrange
      const tokenId = faker.number.int({ min: 1, max: 1000 });

      // Act
      await wish.connect(admin).mint(user.address, tokenId);
      await wish.connect(deployer).setBaseURI("");

      // Assert
      expect(await wish.baseURI()).to.equal("");
      expect(await wish.tokenURI(tokenId)).to.equal("");
    });

    it("should return empty string if baseURI is an empty string and the tokenId is greater than 96 bits", async () => {
      const { wish, user, deployer } = await loadFixture(deployWishFixture);
      // Arrange
      const tokenId = faker.number.int({ min: 1, max: 1000 });
      const pseudoOwnerAddress = user.address;
      const composedTokenId = composeTokenId(pseudoOwnerAddress, tokenId);

      // Act
      await wish.connect(deployer).setBaseURI("");

      // Assert
      expect(await wish.baseURI()).to.equal("");
      expect(await wish.tokenURI(composedTokenId)).to.equal("");
    });
  });

  describe("ownerOf", () => {
    it("should return the owner of the token", async () => {
      const { wish, admin, user } = await loadFixture(deployWishFixture);
      // Arrange
      const tokenId = faker.number.int({ min: 1, max: 1000 });

      // Act
      await wish.connect(admin).mint(user.address, tokenId);

      // Assert
      expect(await wish.ownerOf(tokenId)).to.equal(user.address);
    });
    it("should return the pseudo owner if the tokenId is greater than 96 bits and not minted", async () => {
      const { wish, user } = await loadFixture(deployWishFixture);
      // Arrange
      const tokenId = faker.number.int({ min: 1, max: 1000 });
      const pseudoOwnerAddress = user.address;
      const composedTokenId = composeTokenId(pseudoOwnerAddress, tokenId);

      // Act

      // Assert
      expect(await wish.ownerOf(composedTokenId)).to.equal(pseudoOwnerAddress);
    });
    it("should return the actual owner if the tokenId is greater than 96 bits and minted", async () => {
      const { wish, admin, user, user2 } = await loadFixture(deployWishFixture);
      // Arrange
      const tokenId = faker.number.int({ min: 1, max: 1000 });
      const ownerAddress = user.address;
      const pseudoOwnerAddress = user2.address;
      const composedTokenId = composeTokenId(pseudoOwnerAddress, tokenId);

      // Act
      await wish.connect(admin).mint(ownerAddress, tokenId);

      // Assert
      expect(await wish.ownerOf(composedTokenId)).to.equal(ownerAddress);
    });
    it("should return zero address if the tokenId is less than or equals to 96 bits and is not minted", async () => {
      const { wish } = await loadFixture(deployWishFixture);
      // Arrange
      const tokenId = faker.number.int({ min: 1, max: 1000 });

      // Act

      // Assert
      expect(await wish.ownerOf(tokenId)).to.equal(ethers.ZeroAddress);
    });
    it("should return the actual owner if the tokenId is less than or equals to 96 bits and is minted", async () => {
      const { wish, admin, user } = await loadFixture(deployWishFixture);
      // Arrange
      const tokenId = faker.number.int({ min: 1, max: 1000 });
      const ownerAddress = user.address;

      // Act
      await wish.connect(admin).mint(ownerAddress, tokenId);

      // Assert
      expect(await wish.ownerOf(tokenId)).to.equal(ownerAddress);
    });
  });

  describe("mint", () => {
    it("should throw error if caller is not admin", async () => {
      const { wish, user } = await loadFixture(deployWishFixture);
      // Arrange

      // Act

      // Assert
      await expect(wish.connect(user).mint(user.address, 1))
        .to.be.revertedWithCustomError(wish, "AccessControlUnauthorizedAccount")
        .withArgs(user.address, await wish.ADMIN_ROLE());
    });
    it("should throw error if recipient is zero address and the tokenId is less than or equals to 96 bits", async () => {
      const { wish, admin } = await loadFixture(deployWishFixture);
      // Arrange
      const tokenId = faker.number.int({ min: 1, max: 1000 });
      const receiverAddress = ethers.ZeroAddress;

      // Act

      // Assert
      await expect(wish.connect(admin).mint(receiverAddress, tokenId))
        .to.be.revertedWithCustomError(wish, "ERC721InvalidReceiver")
        .withArgs(receiverAddress);
    });
    it("should mint 1 token to user", async () => {
      const { wish, admin, user } = await loadFixture(deployWishFixture);

      // Arrange
      const tokenId = faker.number.int({ min: 1, max: 1000 });
      const ownerAddress = user.address;

      // Act
      const before = await wish.balanceOf(ownerAddress);
      await wish.connect(admin).mint(user.address, tokenId);
      const after = await wish.balanceOf(ownerAddress);

      // Assert
      expect(after).to.equal(before + 1n);
      expect(after).to.equal(1);
      expect(await wish.ownerOf(tokenId)).to.equal(ownerAddress);
    });
    it("should mint the original token when the token is a composed tokenId", async () => {
      const { wish, admin, user, user2 } = await loadFixture(deployWishFixture);

      // Arrange
      const tokenId = faker.number.int({ min: 1, max: 1000 });
      const ownerAddress = user.address;
      const pseudoOwnerAddress = user2.address;
      const composedTokenId = composeTokenId(pseudoOwnerAddress, tokenId);

      // Act
      const before = await wish.balanceOf(ownerAddress);
      const actualOwnerBefore = await wish.ownerOf(tokenId);
      const composedOwnerBefore = await wish.ownerOf(composedTokenId);
      await wish.connect(admin).mint(ownerAddress, composedTokenId);
      const after = await wish.balanceOf(ownerAddress);
      const actualOwnerAfter = await wish.ownerOf(tokenId);
      const composedOwnerAfter = await wish.ownerOf(composedTokenId);

      // Assert
      expect(after).to.equal(before + 1n);
      expect(after).to.equal(1);
      expect(actualOwnerBefore).to.equal(ethers.ZeroAddress);
      expect(actualOwnerAfter).to.equal(ownerAddress);
      expect(composedOwnerBefore).to.equal(pseudoOwnerAddress);
      expect(composedOwnerAfter).to.equal(ownerAddress);
    });
    it("should mint the original token to the pseudo owner when the token is a composed tokenId and the recipient is zero address", async () => {
      const { wish, admin, user, user2 } = await loadFixture(deployWishFixture);

      // Arrange
      const tokenId = faker.number.int({ min: 1, max: 1000 });
      const receiverAddress = ethers.ZeroAddress;
      const pseudoOwnerAddress = user2.address;
      const composedTokenId = composeTokenId(pseudoOwnerAddress, tokenId);

      // Act
      const before = await wish.balanceOf(pseudoOwnerAddress);
      const actualOwnerBefore = await wish.ownerOf(tokenId);
      const composedOwnerBefore = await wish.ownerOf(composedTokenId);
      await wish.connect(admin).mint(receiverAddress, composedTokenId);
      const after = await wish.balanceOf(pseudoOwnerAddress);
      const actualOwnerAfter = await wish.ownerOf(tokenId);
      const composedOwnerAfter = await wish.ownerOf(composedTokenId);

      // Assert
      expect(after).to.equal(before + 1n);
      expect(after).to.equal(1);
      expect(actualOwnerBefore).to.equal(ethers.ZeroAddress);
      expect(actualOwnerAfter).to.equal(pseudoOwnerAddress);
      expect(composedOwnerBefore).to.equal(pseudoOwnerAddress);
      expect(composedOwnerAfter).to.equal(pseudoOwnerAddress);
    });
    it("should throw error if the pseudo owner is zero address when the token is a composed tokenId and the recipient is zero address", async () => {
      const { wish, admin } = await loadFixture(deployWishFixture);

      // Arrange
      const tokenId = faker.number.int({ min: 1, max: 1000 });
      const receiverAddress = ethers.ZeroAddress;
      const pseudoOwnerAddress = ethers.ZeroAddress;
      const composedTokenId = composeTokenId(pseudoOwnerAddress, tokenId);

      // Act

      // Assert
      await expect(wish.connect(admin).mint(receiverAddress, composedTokenId))
        .to.be.revertedWithCustomError(wish, "ERC721InvalidReceiver")
        .withArgs(receiverAddress);
    });
    it("should return the function selector for mint", async () => {
      const { wish, user } = await loadFixture(deployWishFixture);
      // Arrange
      const [mockWishAdmin] = await ContractDeployer.Mock.MockWishAdmin(
        await wish.getAddress()
      );
      wish.grantRole(await wish.ADMIN_ROLE(), await mockWishAdmin.getAddress());
      const tokenId = faker.number.int({ min: 1, max: 1000 });
      const ownerAddress = user.address;

      // Act
      const ownerBefore = await wish.ownerOf(tokenId);
      const responseBefore = await mockWishAdmin.mintResult();
      await mockWishAdmin.testMint(ownerAddress, tokenId);
      const ownerAfter = await wish.ownerOf(tokenId);
      const responseAfter = await mockWishAdmin.mintResult();

      // Assert
      expect(ownerAfter).to.equal(ownerAddress);
      expect(ownerAfter).not.to.equal(ownerBefore);
      expect(responseAfter).to.equal(await wish.MINT_SELECTOR());
      expect(responseAfter).to.not.equal(responseBefore);
    });
  });

  describe("complete", () => {
    it("should throw error if caller is not admin", async () => {
      const { wish, user } = await loadFixture(deployWishFixture);
      // Arrange
      const tokenId = faker.number.int({ min: 1, max: 1000 });
      const fulfillerAddress = user.address;

      // Act

      // Assert
      await expect(wish.connect(user).complete(fulfillerAddress, tokenId))
        .to.be.revertedWithCustomError(wish, "AccessControlUnauthorizedAccount")
        .withArgs(user.address, await wish.ADMIN_ROLE());
    });
    it("should throw error if the token does not exist", async () => {
      const { wish, admin } = await loadFixture(deployWishFixture);
      // Arrange
      const tokenId = faker.number.int({ min: 1, max: 1000 });
      const fulfillerAddress = admin.address;

      // Act

      // Assert
      await expect(wish.connect(admin).complete(fulfillerAddress, tokenId))
        .to.be.revertedWithCustomError(wish, "ERC721NonexistentToken")
        .withArgs(tokenId);
    });
    it("should throw error if the fulfiller is the token owner", async () => {
      const { wish, admin, user } = await loadFixture(deployWishFixture);
      // Arrange
      const tokenId = faker.number.int({ min: 1, max: 1000 });
      const ownerAddress = user.address;
      const fulfillerAddress = ownerAddress;
      await wish.connect(admin).mint(ownerAddress, tokenId);

      // Act

      // Assert
      await expect(wish.connect(admin).complete(fulfillerAddress, tokenId))
        .to.be.revertedWithCustomError(wish, "WishInvalidAddress")
        .withArgs(ownerAddress);
    });
    it("should throw error if the fulfiller is a zero address", async () => {
      const { wish, admin, user } = await loadFixture(deployWishFixture);
      // Arrange
      const tokenId = faker.number.int({ min: 1, max: 1000 });
      const ownerAddress = user.address;
      const fulfillerAddress = ethers.ZeroAddress;
      await wish.connect(admin).mint(ownerAddress, tokenId);

      // Act

      // Assert
      await expect(wish.connect(admin).complete(fulfillerAddress, tokenId))
        .to.be.revertedWithCustomError(wish, "WishInvalidAddress")
        .withArgs(ethers.ZeroAddress);
    });
    it("should throw error if the token is completed", async () => {
      const { wish, admin, user, user2 } = await loadFixture(deployWishFixture);
      // Arrange
      const tokenId = faker.number.int({ min: 1, max: 1000 });

      const ownerAddress = user.address;
      const fulfillerAddress = user2.address;
      await wish.connect(admin).mint(ownerAddress, tokenId);
      await wish.connect(admin).complete(fulfillerAddress, tokenId);

      // Act

      // Assert
      await expect(wish.connect(admin).complete(fulfillerAddress, tokenId))
        .to.be.revertedWithCustomError(wish, "WishAlreadyCompleted")
        .withArgs(tokenId);
    });
    it("should set the token completion status to true", async () => {
      const { wish, admin, user, user2 } = await loadFixture(deployWishFixture);
      // Arrange
      const tokenId = faker.number.int({ min: 1, max: 1000 });
      const ownerAddress = user.address;
      const fulfillerAddress = user2.address;
      await wish.connect(admin).mint(ownerAddress, tokenId);

      // Act
      const before = await wish.completions(tokenId);
      await wish.connect(admin).complete(fulfillerAddress, tokenId);
      const after = await wish.completions(tokenId);

      // Assert
      expect(before).to.be.false;
      expect(after).to.be.true;
    });
    it("should set the completion status of the original token to true if the token is a composed tokenId", async () => {
      const { wish, admin, user, user2, user3 } = await loadFixture(
        deployWishFixture
      );
      // Arrange
      const tokenId = faker.number.int({ min: 1, max: 1000 });
      const ownerAddress = user.address;
      const pseudoOwnerAddress = user2.address;
      const fulfillerAddress = user3.address;
      const composedTokenId = composeTokenId(pseudoOwnerAddress, tokenId);
      await wish.connect(admin).mint(ownerAddress, composedTokenId);

      // Act
      const before = await wish.completions(tokenId);
      const composedBefore = await wish.completions(composedTokenId);
      await wish.connect(admin).complete(fulfillerAddress, composedTokenId);
      const after = await wish.completions(tokenId);
      const composedAfter = await wish.completions(composedTokenId);

      // Assert
      expect(before).to.be.false;
      expect(after).to.be.true;
      expect(composedBefore).to.be.false;
      expect(composedAfter).to.be.true;
    });
    it("should transfer the token from the owner to the fulfiller", async () => {
      const { wish, admin, user, user2 } = await loadFixture(deployWishFixture);
      // Arrange
      const tokenId = faker.number.int({ min: 1, max: 1000 });
      const ownerAddress = user.address;
      const fulfillerAddress = user2.address;
      await wish.connect(admin).mint(ownerAddress, tokenId);

      // Act
      const before = await wish.ownerOf(tokenId);
      await wish.connect(admin).complete(fulfillerAddress, tokenId);
      const after = await wish.ownerOf(tokenId);

      // Assert
      expect(before).to.equal(ownerAddress);
      expect(after).to.equal(fulfillerAddress);
    });
    it("should transfer the token from the actual owner to the fulfiller if the token is a composed tokenId", async () => {
      const { wish, admin, user, user2, user3 } = await loadFixture(
        deployWishFixture
      );
      // Arrange
      const tokenId = faker.number.int({ min: 1, max: 1000 });
      const ownerAddress = user.address;
      const pseudoOwnerAddress = user2.address;
      const fulfillerAddress = user3.address;
      const composedTokenId = composeTokenId(pseudoOwnerAddress, tokenId);
      await wish.connect(admin).mint(ownerAddress, composedTokenId);

      // Act
      const before = await wish.ownerOf(composedTokenId);
      await wish.connect(admin).complete(fulfillerAddress, composedTokenId);
      const after = await wish.ownerOf(composedTokenId);

      // Assert
      expect(before).to.equal(ownerAddress);
      expect(after).to.equal(fulfillerAddress);
    });
    it('should emit a "Transfer" event', async () => {
      const { wish, admin, user, user2 } = await loadFixture(deployWishFixture);
      // Arrange
      const tokenId = faker.number.int({ min: 1, max: 1000 });
      const ownerAddress = user.address;
      const fulfillerAddress = user2.address;
      await wish.connect(admin).mint(ownerAddress, tokenId);

      // Act
      const before = await wish.ownerOf(tokenId);
      const tx = await wish.connect(admin).complete(fulfillerAddress, tokenId);
      const after = await wish.ownerOf(tokenId);

      // Assert
      expect(before).to.equal(ownerAddress);
      expect(after).to.equal(fulfillerAddress);
      await expect(tx)
        .to.emit(wish, "Transfer")
        .withArgs(ownerAddress, fulfillerAddress, tokenId);
    });
    it('should emit a "Completed" event', async () => {
      const { wish, admin, user, user2 } = await loadFixture(deployWishFixture);
      // Arrange
      const tokenId = faker.number.int({ min: 1, max: 1000 });
      const ownerAddress = user.address;
      const fulfillerAddress = user2.address;
      await wish.connect(admin).mint(ownerAddress, tokenId);

      // Act
      const before = await wish.ownerOf(tokenId);
      const tx = await wish.connect(admin).complete(fulfillerAddress, tokenId);
      const after = await wish.ownerOf(tokenId);

      // Assert
      expect(before).to.equal(ownerAddress);
      expect(after).to.equal(fulfillerAddress);
      await expect(tx)
        .to.emit(wish, "Completed")
        .withArgs(tokenId, fulfillerAddress);
    });
    it("should return the function selector for complete", async () => {
      const { wish, admin, user, user2 } = await loadFixture(deployWishFixture);
      // Arrange
      const [mockWishAdmin] = await ContractDeployer.Mock.MockWishAdmin(
        await wish.getAddress()
      );
      wish.grantRole(await wish.ADMIN_ROLE(), await mockWishAdmin.getAddress());
      const tokenId = faker.number.int({ min: 1, max: 1000 });
      const ownerAddress = user.address;
      const fulfillerAddress = user2.address;
      await wish.connect(admin).mint(ownerAddress, tokenId);

      // Act
      const ownerBefore = await wish.ownerOf(tokenId);
      const responseBefore = await mockWishAdmin.completeResult();
      await mockWishAdmin.testComplete(fulfillerAddress, tokenId);
      const ownerAfter = await wish.ownerOf(tokenId);
      const responseAfter = await mockWishAdmin.completeResult();

      // Assert
      expect(ownerAfter).to.equal(fulfillerAddress);
      expect(ownerAfter).not.to.equal(ownerBefore);
      expect(ownerBefore).to.equal(ownerAddress);
      expect(responseAfter).to.equal(await wish.COMPLETE_SELECTOR());
      expect(responseAfter).to.not.equal(responseBefore);
    });
  });

  describe("completions", () => {
    it("should return false if the token has not been completed", async () => {
      const { wish, admin, user } = await loadFixture(deployWishFixture);
      // Arrange
      const tokenId = faker.number.int({ min: 1, max: 1000 });

      const ownerAddress = user.address;
      await wish.connect(admin).mint(ownerAddress, tokenId);

      // Act
      const before = await wish.completions(tokenId);

      // Assert
      expect(before).to.be.false;
    });
    it("should return true if the token has been completed", async () => {
      const { wish, admin, user, user2 } = await loadFixture(deployWishFixture);
      // Arrange
      const tokenId = faker.number.int({ min: 1, max: 1000 });

      const ownerAddress = user.address;
      const fulfillerAddress = user2.address;
      await wish.connect(admin).mint(ownerAddress, tokenId);

      // Act
      const before = await wish.completions(tokenId);
      await wish.connect(admin).complete(fulfillerAddress, tokenId);
      const after = await wish.completions(tokenId);

      // Assert
      expect(before).to.be.false;
      expect(after).to.be.true;
    });
    it("should return true if the token has been completed and the token is a composed tokenId", async () => {
      const { wish, admin, user, user2, user3 } = await loadFixture(
        deployWishFixture
      );
      // Arrange
      const tokenId = faker.number.int({ min: 1, max: 1000 });
      const ownerAddress = user.address;
      const pseudoOwnerAddress = user2.address;
      const fulfillerAddress = user3.address;
      const composedTokenId = composeTokenId(pseudoOwnerAddress, tokenId);
      await wish.connect(admin).mint(ownerAddress, composedTokenId);

      // Act
      const before = await wish.completions(tokenId);
      const composedBefore = await wish.completions(composedTokenId);
      await wish.connect(admin).complete(fulfillerAddress, composedTokenId);
      const after = await wish.completions(tokenId);
      const composedAfter = await wish.completions(composedTokenId);

      // Assert
      expect(before).to.be.false;
      expect(after).to.be.true;
      expect(composedBefore).to.be.false;
      expect(composedAfter).to.be.true;
    });
    it("should return false if the token has not been completed and the token is a composed tokenId", async () => {
      const { wish, admin, user, user2, user3 } = await loadFixture(
        deployWishFixture
      );
      // Arrange
      const tokenId = faker.number.int({ min: 1, max: 1000 });

      const ownerAddress = user.address;
      const pseudoOwnerAddress = user2.address;
      const composedTokenId = composeTokenId(pseudoOwnerAddress, tokenId);
      await wish.connect(admin).mint(ownerAddress, composedTokenId);

      // Act
      const status = await wish.completions(tokenId);
      const composedStatus = await wish.completions(composedTokenId);

      // Assert
      expect(status).to.be.false;
      expect(composedStatus).to.be.false;
    });
  });

  describe("burn", () => {
    it("should throw error if caller is not admin", async () => {
      const { wish, user } = await loadFixture(deployWishFixture);
      // Arrange

      // Act

      // Assert
      await expect(wish.connect(user).burn(1))
        .to.be.revertedWithCustomError(wish, "AccessControlUnauthorizedAccount")
        .withArgs(user.address, await wish.ADMIN_ROLE());
    });
    it("should throw error if the token has been completed", async () => {
      const { wish, admin, user, user2 } = await loadFixture(deployWishFixture);
      // Arrange
      const tokenId = faker.number.int({ min: 1, max: 1000 });
      const ownerAddress = user.address;
      const fulfillerAddress = user2.address;
      await wish.connect(admin).mint(ownerAddress, tokenId);
      await wish.connect(admin).complete(fulfillerAddress, tokenId);

      // Act

      // Assert
      await expect(wish.connect(admin).burn(tokenId))
        .to.be.revertedWithCustomError(wish, "WishAlreadyCompleted")
        .withArgs(tokenId);
    });
    it("should throw error if the original token has been completed and the token is a composed tokenId", async () => {
      const { wish, admin, user, user2, user3 } = await loadFixture(
        deployWishFixture
      );
      // Arrange
      const tokenId = faker.number.int({ min: 1, max: 1000 });
      const ownerAddress = user.address;
      const pseudoOwnerAddress = user2.address;
      const fulfillerAddress = user3.address;
      const composedTokenId = composeTokenId(pseudoOwnerAddress, tokenId);
      await wish.connect(admin).mint(ownerAddress, composedTokenId);
      await wish.connect(admin).complete(fulfillerAddress, composedTokenId);

      // Act

      // Assert
      await expect(wish.connect(admin).burn(composedTokenId))
        .to.be.revertedWithCustomError(wish, "WishAlreadyCompleted")
        .withArgs(tokenId);
    });
    it("should throw error if the token does not exist", async () => {
      const { wish, admin } = await loadFixture(deployWishFixture);
      // Arrange
      const tokenId = faker.number.int({ min: 1, max: 1000 });

      // Act

      // Assert
      await expect(wish.connect(admin).burn(tokenId))
        .to.be.revertedWithCustomError(wish, "ERC721NonexistentToken")
        .withArgs(tokenId);
    });
    it("should burn the token", async () => {
      const { wish, admin, user } = await loadFixture(deployWishFixture);
      // Arrange
      const tokenId = faker.number.int({ min: 1, max: 1000 });
      const ownerAddress = user.address;
      await wish.connect(admin).mint(ownerAddress, tokenId);

      // Act
      const before = await wish.balanceOf(ownerAddress);
      await wish.connect(admin).burn(tokenId);
      const after = await wish.balanceOf(ownerAddress);

      // Assert
      expect(before).to.equal(1);
      expect(after).to.equal(0);
    });
    it("should burn the original token if the token is a composed tokenId", async () => {
      const { wish, admin, user, user2 } = await loadFixture(deployWishFixture);
      // Arrange
      const tokenId = 1;
      const ownerAddress = user.address;
      const pseudoOwnerAddress = user2.address;
      const composedTokenId = composeTokenId(pseudoOwnerAddress, tokenId);
      await wish.connect(admin).mint(ownerAddress, composedTokenId);

      // Act
      const before = await wish.balanceOf(ownerAddress);
      const composedBefore = await wish.balanceOf(pseudoOwnerAddress);
      await wish.connect(admin).burn(composedTokenId);
      const after = await wish.balanceOf(ownerAddress);
      const composedAfter = await wish.balanceOf(pseudoOwnerAddress);

      // Assert
      expect(before).to.equal(1);
      expect(after).to.equal(0);
      expect(composedBefore).to.equal(0);
      expect(composedAfter).to.equal(0);
    });
    it('should emit a "Transfer" event', async () => {
      const { wish, admin, user } = await loadFixture(deployWishFixture);
      // Arrange
      const tokenId = 1;
      const ownerAddress = user.address;
      await wish.connect(admin).mint(ownerAddress, tokenId);

      // Act
      const before = await wish.balanceOf(ownerAddress);
      const tx = await wish.connect(admin).burn(tokenId);
      const after = await wish.balanceOf(ownerAddress);

      // Assert
      expect(before).to.equal(1);
      expect(after).to.equal(0);
      await expect(tx)
        .to.emit(wish, "Transfer")
        .withArgs(ownerAddress, ethers.ZeroAddress, tokenId);
    });
    it("should return the function selector for burn", async () => {
      const { wish, admin, user } = await loadFixture(deployWishFixture);
      // Arrange
      const [mockWishAdmin] = await ContractDeployer.Mock.MockWishAdmin(
        await wish.getAddress()
      );
      wish.grantRole(await wish.ADMIN_ROLE(), await mockWishAdmin.getAddress());
      const tokenId = 1;
      const ownerAddress = user.address;
      await wish.connect(admin).mint(ownerAddress, tokenId);

      // Act
      const before = await wish.balanceOf(ownerAddress);
      const responseBefore = await mockWishAdmin.burnResult();
      await mockWishAdmin.testBurn(tokenId);
      const after = await wish.balanceOf(ownerAddress);
      const responseAfter = await mockWishAdmin.burnResult();

      // Assert
      expect(before).to.equal(1);
      expect(after).to.equal(0);
      expect(responseAfter).to.equal(await wish.BURN_SELECTOR());
      expect(responseAfter).to.not.equal(responseBefore);
    });
  });

  describe("approve", () => {
    it("should throw error if anyone calls this function", async () => {
      const { wish, user } = await loadFixture(deployWishFixture);
      // Arrange

      // Act

      // Assert
      await expect(wish.connect(user).approve(user.address, 1))
        .to.be.revertedWithCustomError(wish, "WishFunctionDisabled")
        .withArgs();
    });
    it("should throw error if admin calls this function", async () => {
      const { wish, admin } = await loadFixture(deployWishFixture);
      // Arrange

      // Act

      // Assert
      await expect(wish.connect(admin).approve(admin.address, 1))
        .to.be.revertedWithCustomError(wish, "WishFunctionDisabled")
        .withArgs();
    });
  });

  describe("getApproved", () => {
    it("should return a zero address if the tokenId is less than or equals to 96 bits and the token is not minted", async () => {
      const { wish } = await loadFixture(deployWishFixture);
      // Arrange
      const tokenId = faker.number.int({ min: 1, max: 1000 });

      // Act
      const response = await wish.getApproved(tokenId);

      // Assert
      expect(response).to.equal(ethers.ZeroAddress);
    });
    it("should return a zero address if the tokenId is less than or equals to 96 bits and the token is minted", async () => {
      const { wish, admin, user } = await loadFixture(deployWishFixture);
      // Arrange
      const tokenId = 1;
      const ownerAddress = user.address;
      await wish.connect(admin).mint(ownerAddress, tokenId);

      // Act
      const response = await wish.getApproved(tokenId);

      // Assert
      expect(response).to.equal(ethers.ZeroAddress);
    });
    it("should return a zero address if the tokenId is greater than 96 bits and the token is not minted", async () => {
      const { wish, user } = await loadFixture(deployWishFixture);
      // Arrange
      const tokenId = faker.number.int({ min: 1, max: 1000 });
      const pseudoOwnerAddress = user.address;
      const composedTokenId = composeTokenId(pseudoOwnerAddress, tokenId);

      // Act
      const response = await wish.getApproved(composedTokenId);

      // Assert
      expect(response).to.equal(ethers.ZeroAddress);
    });
    it("should return a zero address if the tokenId is greater than 96 bits and the token is minted", async () => {
      const { wish, admin, user } = await loadFixture(deployWishFixture);
      // Arrange
      const tokenId = faker.number.int({ min: 1, max: 1000 });
      const ownerAddress = user.address;
      const pseudoOwnerAddress = user.address;
      const composedTokenId = composeTokenId(pseudoOwnerAddress, tokenId);
      await wish.connect(admin).mint(ownerAddress, tokenId);

      // Act
      const response = await wish.getApproved(composedTokenId);

      // Assert
      expect(response).to.equal(ethers.ZeroAddress);
    });
  });

  describe("setApprovalForAll", () => {
    it("should throw error if anyone calls this function", async () => {
      const { wish, user } = await loadFixture(deployWishFixture);
      // Arrange

      // Act

      // Assert
      await expect(wish.connect(user).setApprovalForAll(user.address, true))
        .to.be.revertedWithCustomError(wish, "WishFunctionDisabled")
        .withArgs();
    });
    it("should throw error if admin calls this function", async () => {
      const { wish, admin } = await loadFixture(deployWishFixture);
      // Arrange

      // Act

      // Assert
      await expect(wish.connect(admin).setApprovalForAll(admin.address, true))
        .to.be.revertedWithCustomError(wish, "WishFunctionDisabled")
        .withArgs();
    });
  });

  describe("isApprovedForAll", () => {
    it("should return false for all circumstances", async () => {
      const { wish, admin, user } = await loadFixture(deployWishFixture);
      // Arrange
      const operatorAddress = user.address;

      // Act
      const response = await wish.isApprovedForAll(
        admin.address,
        operatorAddress
      );

      // Assert
      expect(response).to.be.false;
    });
  });

  describe("transferFrom", () => {
    it("should throw error if anyone calls this function", async () => {
      const { wish, user } = await loadFixture(deployWishFixture);
      // Arrange

      // Act

      // Assert
      await expect(
        wish.connect(user).transferFrom(user.address, user.address, 1)
      )
        .to.be.revertedWithCustomError(wish, "WishFunctionDisabled")
        .withArgs();
    });
    it("should throw error if admin calls this function", async () => {
      const { wish, admin } = await loadFixture(deployWishFixture);
      // Arrange

      // Act

      // Assert
      await expect(
        wish.connect(admin).transferFrom(admin.address, admin.address, 1)
      )
        .to.be.revertedWithCustomError(wish, "WishFunctionDisabled")
        .withArgs();
    });
  });

  describe("safeTransferFrom(address,address,uint256)", () => {
    it("should throw error if anyone calls this function", async () => {
      const { wish, user } = await loadFixture(deployWishFixture);
      // Arrange
      const tokenId = faker.number.int({ min: 1, max: 1000 });

      // Act

      // Assert
      await expect(
        wish
          .connect(user)
          ["safeTransferFrom(address,address,uint256)"](
            user.address,
            user.address,
            tokenId
          )
      )
        .to.be.revertedWithCustomError(wish, "WishFunctionDisabled")
        .withArgs();
    });
    it("should throw error if admin calls this function", async () => {
      const { wish, admin } = await loadFixture(deployWishFixture);
      // Arrange
      const tokenId = faker.number.int({ min: 1, max: 1000 });

      // Act

      // Assert
      await expect(
        wish
          .connect(admin)
          ["safeTransferFrom(address,address,uint256)"](
            admin.address,
            admin.address,
            tokenId
          )
      )
        .to.be.revertedWithCustomError(wish, "WishFunctionDisabled")
        .withArgs();
    });
  });

  describe("safeTransferFrom(address,address,uint256,bytes)", () => {
    it("should throw error if anyone calls this function", async () => {
      const { wish, user } = await loadFixture(deployWishFixture);
      // Arrange
      const tokenId = faker.number.int({ min: 1, max: 1000 });

      // Act

      // Assert
      await expect(
        wish
          .connect(user)
          ["safeTransferFrom(address,address,uint256,bytes)"](
            user.address,
            user.address,
            tokenId,
            "0x"
          )
      )
        .to.be.revertedWithCustomError(wish, "WishFunctionDisabled")
        .withArgs();
    });
    it("should throw error if admin calls this function", async () => {
      const { wish, admin } = await loadFixture(deployWishFixture);
      // Arrange
      const tokenId = faker.number.int({ min: 1, max: 1000 });

      // Act

      // Assert
      await expect(
        wish
          .connect(admin)
          ["safeTransferFrom(address,address,uint256,bytes)"](
            admin.address,
            admin.address,
            tokenId,
            "0x"
          )
      )
        .to.be.revertedWithCustomError(wish, "WishFunctionDisabled")
        .withArgs();
    });
  });

  describe("supportsInterface", () => {
    it("should supportsInterface for ERC165", async () => {
      const { wish } = await loadFixture(deployWishFixture);
      // Arrange
      const IERC165Interface = IERC165__factory.createInterface();
      const IERC165InterfaceId = generateInterfaceId([IERC165Interface]);

      // Act

      // Assert
      expect(await wish.supportsInterface(IERC165InterfaceId)).to.be.true;
    });
    it("should supportsInterface for IERC721", async () => {
      const { wish } = await loadFixture(deployWishFixture);
      // Arrange
      const IERC721Interface = IERC721__factory.createInterface();
      const IERC165Interface = IERC165__factory.createInterface();
      const IERC721InterfaceId = generateInterfaceId([
        IERC165Interface,
        IERC721Interface,
      ]);

      // Act

      // Assert
      expect(await wish.supportsInterface(IERC721InterfaceId)).to.be.true;
    });
  });
});
