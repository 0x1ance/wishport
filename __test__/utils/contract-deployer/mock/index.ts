import { ethers } from "hardhat";
import { ContractDeployerBase } from "../type";

export const MockDeployer = {
  MockWishAdmin: async (inventory: string) => {
    const mockWishAdmin = await ethers.getContractFactory("MockWishAdmin");
    const mockWishAdminInstance = await mockWishAdmin.deploy(inventory);
    return [mockWishAdminInstance];
  },
  MockForwarder: async () => {
    const mockForwarder = await ethers.getContractFactory("MockForwarder");
    const mockForwarderInstance = await mockForwarder.deploy();
    return [mockForwarderInstance];
  },
  MockIncorrectWish: async ({ deployer }: ContractDeployerBase) => {
    const mockIncorrectWish = await ethers.getContractFactory(
      "MockIncorrectWish"
    );
    const mockIncorrectWishInstance = await mockIncorrectWish.deploy({
      from: deployer.address,
    });
    return [mockIncorrectWishInstance];
  },
};
