import { BaseContract } from "ethers";
import { ethers } from "hardhat";
import { expect } from "chai";
import { ContractDeployer } from "@test/utils/contract-deployer";
import { faker } from "@faker-js/faker";
import { UnitParser } from "@test/utils/UnitParser";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { TokenRecovery } from "@/types";

export const shouldBehaveLikeTokenRecovery = (
  fixture: () => Promise<TokenRecovery>
) => {
  describe("TokenRecovery", () => {
    describe("recoverETH", () => {
      it("should throw error when the caller is not the owner", async () => {
        // Arrange
        const [deployer, depositor, receiver] = await ethers.getSigners();
        const target = await loadFixture(fixture);
        const targetAddress = await target.getAddress();
        // send eth to the target contract
        const initialETHBalance = 1;
        await depositor.sendTransaction({
          to: targetAddress,
          value: UnitParser.toEther(initialETHBalance),
        });

        // Act
        const amount = faker.number.float({ min: 0.01, max: 1 });

        // Assert
        await expect(
          target
            .connect(depositor)
            .recoverETH([receiver.address], [UnitParser.toEther(amount)])
        ).to.be.revertedWithCustomError(target, "OwnableUnauthorizedAccount");
      });

      it('should throw error when the "receivers" and "amounts" length are not equal', async () => {
        // Arrange
        const [deployer] = await ethers.getSigners();
        const target = await loadFixture(fixture);
        // Act
        const amount = faker.number.float({ min: 0.01, max: 1 });

        // Assert
        await expect(
          target
            .connect(deployer)
            .recoverETH(
              [
                faker.finance.ethereumAddress(),
                faker.finance.ethereumAddress(),
              ],
              [UnitParser.toEther(amount)]
            )
        ).to.be.revertedWithCustomError(
          target,
          "TokenRecoveryInconsistentArrays"
        );
      });
      it(`should recover ETH and decrement eth balance in the TokenRecovery Contract`, async () => {
        // Arrange
        const [deployer, depositor, receiver] = await ethers.getSigners();
        const target = await loadFixture(fixture);
        const targetAddress = await target.getAddress();
        // send eth to the target contract
        const initialETHBalance = 1;
        await depositor.sendTransaction({
          to: targetAddress,
          value: UnitParser.toEther(initialETHBalance),
        });

        // Act
        const amount = faker.number.float({ min: 0.01, max: 1 });
        const balanceBefore = await deployer.provider.getBalance(
          targetAddress
        );
        await target
          .connect(deployer)
          .recoverETH([receiver.address], [UnitParser.toEther(amount)]);
        const balanceAfter = await deployer.provider.getBalance(
          targetAddress
        );

        // Assert
        expect(balanceAfter).to.be.lt(balanceBefore);
        expect(balanceAfter + UnitParser.toEther(amount)).to.be.eq(
          balanceBefore
        );
      });
      it("should recover ETH and increment eth balance in the receiver account", async () => {
        // Arrange
        const [deployer, depositor, receiver] = await ethers.getSigners();
  const target = await loadFixture(fixture);
        // send eth to the target contract
        const initialETHBalance = 1;
        await depositor.sendTransaction({
          to: await target.getAddress(),
          value: UnitParser.toEther(initialETHBalance),
        });

        // Act
        const amount = faker.number.float({
          min: 0.01,
          max: initialETHBalance,
        });

        const balanceBefore = await deployer.provider.getBalance(
          receiver.address
        );
        await target
          .connect(deployer)
          .recoverETH([receiver.address], [UnitParser.toEther(amount)]);
        const balanceAfter = await deployer.provider.getBalance(
          receiver.address
        );

        // Assert
        expect(balanceAfter).to.be.gt(balanceBefore);
        expect(balanceAfter).to.be.eq(
          balanceBefore + UnitParser.toEther(amount)
        );
      });

      it("should support recovering multiple times to the different accounts", async () => {
        // Arrange
        const [deployer, depositor, receiver, receiver2] =
          await ethers.getSigners();
          const target = await loadFixture(fixture);
        const targetAddress = await target.getAddress();
        // send eth to the target contract
        const initialETHBalance = 1;
        await depositor.sendTransaction({
          to: targetAddress,
          value: UnitParser.toEther(initialETHBalance),
        });

        // Act
        const amount = faker.number.float({ min: 0.01, max: 0.5 });
        const amount_2 = faker.number.float({ min: 0.01, max: 0.5 });
        const balanceBefore_target = await deployer.provider.getBalance(
          targetAddress
        );
        const balanceBefore = await deployer.provider.getBalance(
          receiver.address
        );
        const balanceBefore_2 = await deployer.provider.getBalance(
          receiver2.address
        );
        await target
          .connect(deployer)
          .recoverETH(
            [receiver.address, receiver2.address],
            [UnitParser.toEther(amount), UnitParser.toEther(amount_2)]
          );
        const balanceAfter_target = await deployer.provider.getBalance(
          targetAddress
        );
        const balanceAfter = await deployer.provider.getBalance(
          receiver.address
        );
        const balanceAfter_2 = await deployer.provider.getBalance(
          receiver2.address
        );

        // Assert
        expect(balanceAfter_target).to.be.lt(
          balanceBefore_target
        );
        expect(
          balanceAfter_target +
            UnitParser.toEther(amount) +
            UnitParser.toEther(amount_2)
        ).to.be.eq(balanceBefore_target);
        expect(balanceAfter).to.be.gt(balanceBefore);
        expect(balanceAfter).to.be.eq(
          balanceBefore + UnitParser.toEther(amount)
        );
        expect(balanceAfter_2).to.be.gt(balanceBefore_2);
        expect(balanceAfter_2).to.be.eq(
          balanceBefore_2 + UnitParser.toEther(amount_2)
        );
      });
    });
    describe("recoverERC20s", () => {
      it("should throw error when the caller is not the owner", async () => {
        // Arrange
        const [deployer, depositor, receiver] = await ethers.getSigners();
        const target = await loadFixture(fixture);
        const [testERC20] = await ContractDeployer.Token.ERC20();
        const testERC20Decimal = await testERC20.decimals();
        const targetAddress = await target.getAddress();
        const initialERC20Balance = faker.number.int({ min: 1000, max: 10000 });
        await testERC20
          .connect(depositor)
          .mint(
            targetAddress,
            UnitParser.toBigNumber(initialERC20Balance, testERC20Decimal)
          );

        // Act
        const amount = faker.number.int({
          min: 1,
          max: initialERC20Balance,
        });

        // Assert
        await expect(
          target
            .connect(depositor)
            .recoverERC20s(
              [receiver.address],
              [await testERC20.getAddress()],
              [UnitParser.toBigNumber(amount, testERC20Decimal)]
            )
        ).to.be.revertedWithCustomError(
          target,
          "OwnableUnauthorizedAccount"
        );
      });
      it('should throw error when the "receivers" and "tokens" length are not equal', async () => {
        // Arrange
        const [deployer] = await ethers.getSigners();
        const target = await loadFixture(fixture);
        const [testERC20] = await ContractDeployer.Token.ERC20();
        const testERC20Decimal = await testERC20.decimals();

        // Act
        const amount = faker.number.int({
          min: 1,
          max: 1000,
        });

        // Assert
        await expect(
          target
            .connect(deployer)
            .recoverERC20s(
              [
                faker.finance.ethereumAddress(),
                faker.finance.ethereumAddress(),
              ],
              [await testERC20.getAddress()],
              [UnitParser.toBigNumber(amount, testERC20Decimal)]
            )
        ).to.be.revertedWithCustomError(
          target,
          "TokenRecoveryInconsistentArrays"
        );
      });
      it('should throw error when the "receivers" and "amounts" length are not equal', async () => {
        // Arrange
        const [deployer] = await ethers.getSigners();
        const target = await loadFixture(fixture);
        const [testERC20] = await ContractDeployer.Token.ERC20();
        const testERC20Decimal = await testERC20.decimals();

        // Act
        const amount = faker.number.int({
          min: 1,
          max: 1000,
        });

        // Assert
        await expect(
          target
            .connect(deployer)
            .recoverERC20s(
              [faker.finance.ethereumAddress()],
              [await testERC20.getAddress()],
              [
                UnitParser.toBigNumber(amount, testERC20Decimal),
                UnitParser.toBigNumber(amount, testERC20Decimal),
              ]
            )
        ).to.be.revertedWithCustomError(
          target,
          "TokenRecoveryInconsistentArrays"
        );
      });
      it("should recover ERC20 and decrement token balance in the TokenRecovery Contract", async () => {
        // Arrange
        const [deployer, depositor, receiver] = await ethers.getSigners();
        const target = await loadFixture(fixture);
        const [testERC20] = await ContractDeployer.Token.ERC20();
        const testERC20Decimal = await testERC20.decimals();
        const targetAddress = await target.getAddress();
        const initialERC20Balance = faker.number.int({ min: 1000, max: 10000 });
        await testERC20
          .connect(depositor)
          .mint(
            targetAddress,
            UnitParser.toBigNumber(initialERC20Balance, testERC20Decimal)
          );

        // Act
        const amount = faker.number.int({
          min: 1,
          max: initialERC20Balance,
        });
        const balanceBefore = await testERC20.balanceOf(targetAddress);
        await target
          .connect(deployer)
          .recoverERC20s(
            [receiver.address],
            [await testERC20.getAddress()],
            [UnitParser.toBigNumber(amount, testERC20Decimal)]
          );
        const balanceAfter = await testERC20.balanceOf(targetAddress);

        // Assert
        expect(balanceAfter).to.be.lt(balanceBefore);
        expect(
          balanceAfter + UnitParser.toBigNumber(amount, testERC20Decimal)
        ).to.be.eq(balanceBefore);
      });
      it("should recover ERC20 and increment token balance in the receiver account", async () => {
        // Arrange
        const [deployer, depositor, receiver] = await ethers.getSigners();
        const target = await loadFixture(fixture);
        const [testERC20] = await ContractDeployer.Token.ERC20();
        const testERC20Decimal = await testERC20.decimals();
        const targetAddress = await target.getAddress();
        const initialERC20Balance = faker.number.int({ min: 1000, max: 10000 });
        await testERC20
          .connect(depositor)
          .mint(
            targetAddress,
            UnitParser.toBigNumber(initialERC20Balance, testERC20Decimal)
          );

        // Act
        const amount = faker.number.int({
          min: 1,
          max: initialERC20Balance,
        });
        const balanceBefore = await testERC20.balanceOf(receiver.address);
        await target
          .connect(deployer)
          .recoverERC20s(
            [receiver.address],
            [await testERC20.getAddress()],
            [UnitParser.toBigNumber(amount, testERC20Decimal)]
          );
        const balanceAfter = await testERC20.balanceOf(receiver.address);

        // Assert
        expect(balanceAfter).to.be.gt(balanceBefore);
        expect(balanceAfter).to.be.eq(
          balanceBefore + UnitParser.toBigNumber(amount, testERC20Decimal)
        );
      });
      it("should support recovering multiple ERC20s", async () => {
        // Arrange
        const [deployer, depositor, receiver] = await ethers.getSigners();
        const target = await loadFixture(fixture);
        const targetAddress = await target.getAddress();
        // prepare ERC20s
        const [testERC20] = await ContractDeployer.Token.ERC20();
        const initialERC20Balance = faker.number.int({ min: 1000, max: 10000 });
        await testERC20
          .connect(depositor)
          .mint(
            targetAddress,
            UnitParser.toBigNumber(
              initialERC20Balance,
              await testERC20.decimals()
            )
          );
        const [testERC20_2] = await ContractDeployer.Token.ERC20();
        const initialERC20Balance_2 = faker.number.int({
          min: 1000,
          max: 10000,
        });
        await testERC20_2
          .connect(depositor)
          .mint(
            targetAddress,
            UnitParser.toBigNumber(
              initialERC20Balance_2,
              await testERC20_2.decimals()
            )
          );

        // Act
        const amount = faker.number.int({
          min: 1,
          max: initialERC20Balance,
        });
        const amount_2 = faker.number.int({
          min: 1,
          max: initialERC20Balance_2,
        });
        const balanceBefore = await testERC20.balanceOf(receiver.address);
        const balanceBefore_2 = await testERC20_2.balanceOf(receiver.address);
        await target
          .connect(deployer)
          .recoverERC20s(
            [receiver.address, receiver.address],
            [await testERC20.getAddress(), await testERC20_2.getAddress()],
            [
              UnitParser.toBigNumber(amount, await testERC20.decimals()),
              UnitParser.toBigNumber(amount_2, await testERC20_2.decimals()),
            ]
          );
        const balanceAfter = await testERC20.balanceOf(receiver.address);
        const balanceAfter_2 = await testERC20_2.balanceOf(receiver.address);

        // Assert
        expect(balanceAfter).to.be.gt(balanceBefore);
        expect(balanceAfter).to.be.eq(
          balanceBefore +
            UnitParser.toBigNumber(amount, await testERC20.decimals())
        );
        expect(balanceAfter_2).to.be.gt(balanceBefore_2);
        expect(balanceAfter_2).to.be.eq(
          balanceBefore_2 +
            UnitParser.toBigNumber(amount_2, await testERC20_2.decimals())
        );
      });
    });
    describe("recoverERC721s", () => {
      it("should throw error when the caller is not the owner", async () => {
        // Arrange
        const [deployer, depositor, receiver] = await ethers.getSigners();
        const target = await loadFixture(fixture);
        const [testERC721] = await ContractDeployer.Token.ERC721();
        const targetAddress = await target.getAddress();
        const tokenId = 1;
        await testERC721.connect(depositor).mint(targetAddress, tokenId);

        // Act

        // Assert
        await expect(
          target
            .connect(depositor)
            .recoverERC721s(
              [receiver.address],
              [await testERC721.getAddress()],
              [tokenId]
            )
        ).to.be.revertedWithCustomError(
          target,
          "OwnableUnauthorizedAccount"
        );
      });
      it('should throw error when the "receivers" and "tokens" length are not equal', async () => {
        // Arrange
        const [deployer] = await ethers.getSigners();
        const target = await loadFixture(fixture);
        const [testERC721] = await ContractDeployer.Token.ERC721();
        const tokenId = 1;

        // Act

        // Assert
        await expect(
          target
            .connect(deployer)
            .recoverERC721s(
              [
                faker.finance.ethereumAddress(),
                faker.finance.ethereumAddress(),
              ],
              [await testERC721.getAddress()],
              [tokenId]
            )
        ).to.be.revertedWithCustomError(
          target,
          "TokenRecoveryInconsistentArrays"
        );
      });
      it('should throw error when the "receivers" and "tokenIds" length are not equal', async () => {
        // Arrange
        const [deployer] = await ethers.getSigners();
        const target = await loadFixture(fixture);
        const [testERC721] = await ContractDeployer.Token.ERC721();
        const tokenId = 1;

        // Act

        // Assert
        await expect(
          target
            .connect(deployer)
            .recoverERC721s(
              [faker.finance.ethereumAddress()],
              [await testERC721.getAddress()],
              [tokenId, tokenId]
            )
        ).to.be.revertedWithCustomError(
          target,
          "TokenRecoveryInconsistentArrays"
        );
      });
      it("should recover ERC721 and decrement token balance in the TokenRecovery Contract", async () => {
        // Arrange
        const [deployer, depositor, receiver] = await ethers.getSigners();
        const target = await loadFixture(fixture);
        const [testERC721] = await ContractDeployer.Token.ERC721();
        const targetAddress = await target.getAddress();
        const tokenId = 1;
        await testERC721.connect(depositor).mint(targetAddress, tokenId);

        // Act
        const balanceBefore = await testERC721.balanceOf(targetAddress);
        await target
          .connect(deployer)
          .recoverERC721s(
            [receiver.address],
            [await testERC721.getAddress()],
            [tokenId]
          );
        const balanceAfter = await testERC721.balanceOf(targetAddress);

        // Assert
        expect(balanceAfter).to.be.lt(balanceBefore);
        expect(balanceAfter + 1n).to.be.eq(balanceBefore);
      });
      it('should transfer ownership of the ERC721 to the "receiver"', async () => {
        // Arrange
        const [deployer, depositor, receiver] = await ethers.getSigners();
        const target = await loadFixture(fixture);
        const [testERC721] = await ContractDeployer.Token.ERC721();
        const targetAddress = await target.getAddress();
        const tokenId = 1;
        await testERC721.connect(depositor).mint(targetAddress, tokenId);

        // Act
        const ownerBefore = await testERC721.ownerOf(tokenId);
        await target
          .connect(deployer)
          .recoverERC721s(
            [receiver.address],
            [await testERC721.getAddress()],
            [tokenId]
          );
        const ownerAfter = await testERC721.ownerOf(tokenId);

        // Assert
        expect(ownerAfter).to.be.eq(receiver.address);
        expect(ownerAfter).to.be.not.eq(ownerBefore);
        expect(ownerBefore).to.be.eq(targetAddress);
      });
      it("should support recovering multiple ERC721s", async () => {
        // Arrange
        const [deployer, depositor, receiver] = await ethers.getSigners();
        const target = await loadFixture(fixture);
        const targetAddress = await target.getAddress();
        // prepare ERC721s
        const [testERC721] = await ContractDeployer.Token.ERC721();
        const tokenId = 1;
        await testERC721.connect(depositor).mint(targetAddress, tokenId);
        const [testERC721_2] = await ContractDeployer.Token.ERC721();
        const tokenId_2 = 2;
        await testERC721_2
          .connect(depositor)
          .mint(targetAddress, tokenId_2);

        // Act
        const ownerBefore = await testERC721.ownerOf(tokenId);
        const ownerBefore_2 = await testERC721_2.ownerOf(tokenId_2);
        await target
          .connect(deployer)
          .recoverERC721s(
            [receiver.address, receiver.address],
            [await testERC721.getAddress(), await testERC721_2.getAddress()],
            [tokenId, tokenId_2]
          );
        const ownerAfter = await testERC721.ownerOf(tokenId);
        const ownerAfter_2 = await testERC721_2.ownerOf(tokenId_2);

        // Assert
        expect(ownerAfter).to.be.eq(receiver.address);
        expect(ownerAfter).to.be.not.eq(ownerBefore);
        expect(ownerBefore).to.be.eq(targetAddress);
        expect(ownerAfter_2).to.be.eq(receiver.address);
        expect(ownerAfter_2).to.be.not.eq(ownerBefore_2);
        expect(ownerBefore_2).to.be.eq(targetAddress);
      });
    });
  });
};
