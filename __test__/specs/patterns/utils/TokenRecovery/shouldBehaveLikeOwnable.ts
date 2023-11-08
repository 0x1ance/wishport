import { BaseContract } from "ethers";
import { ethers } from "hardhat";
import { expect } from "chai";
import { ContractDeployer } from "@test/utils/contract-deployer";
import { faker } from "@faker-js/faker";
import { UnitParser } from "@test/utils/UnitParser";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { Ownable, TokenRecovery } from "@/types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

export const shouldBehaveLikeOwnable = (
  fixture: () => Promise<{
    target: Ownable;
    owner: HardhatEthersSigner;
    newOwner: HardhatEthersSigner;
  }>
) => {
  describe("Ownable", () => {
    describe("owner", () => {
      it("should return the contract owner", async () => {
        // Arrange
        const { target, owner, newOwner } = await loadFixture(fixture);

        // Act

        // Assert
        expect(await target.owner()).to.be.equal(owner.address);
      });
    });
    describe("renounceOwnership", () => {
      it("should transfer ownership to an empty address", async () => {
        // Arrange
        const { target, owner } = await loadFixture(fixture);

        // Act
        await target.connect(owner).renounceOwnership();

        // Assert
        expect(await target.owner()).to.be.equal(ethers.ZeroAddress);
      });
      it("should revert if the caller is not the owner", async () => {
        // Arrange
        const {
          target,
          owner,
          newOwner: notOwner,
        } = await loadFixture(fixture);

        // Act
        const tx = target.connect(notOwner).renounceOwnership();

        // Assert
        await expect(tx)
          .to.be.revertedWithCustomError(target, "OwnableUnauthorizedAccount")
          .withArgs(notOwner.address);
      });
    });
    describe("transferOwnership", () => {
      it("should revert if the caller is not the owner", async () => {
        // Arrange
        const {
          target,
          owner,
          newOwner: notOwner,
        } = await loadFixture(fixture);

        // Act
        const tx = target.connect(notOwner).transferOwnership(notOwner.address);

        // Assert
        await expect(tx)
          .to.be.revertedWithCustomError(target, "OwnableUnauthorizedAccount")
          .withArgs(notOwner.address);
      });
      it("should revert if the new owner is an empty address", async () => {
        // Arrange
        const { target, owner } = await loadFixture(fixture);

        // Act
        const tx = target.connect(owner).transferOwnership(ethers.ZeroAddress);

        // Assert
        await expect(tx)
          .to.be.revertedWithCustomError(target, "OwnableInvalidOwner")
          .withArgs(ethers.ZeroAddress);
      });
      it("should transfer ownership to the new owner address", async () => {
        // Arrange
        const { target, owner, newOwner } = await loadFixture(fixture);

        // Act
        const before = await target.owner();
        await target.connect(owner).transferOwnership(newOwner.address);
        const after = await target.owner();

        // Assert
        expect(after).not.to.equal(before);
        expect(after).to.equal(newOwner.address);
        expect(before).to.equal(owner.address);
      });
      it('should emit an "OwnershipTransferred" event', async () => {
        // Arrange
        const { target, owner, newOwner } = await loadFixture(fixture);

        // Act
        const tx = target.connect(owner).transferOwnership(newOwner.address);

        // Assert
        await expect(tx)
          .to.emit(target, "OwnershipTransferred")
          .withArgs(owner.address, newOwner.address);
      });
    });
  });
};
