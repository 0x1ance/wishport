import { ethers } from "hardhat";

export const MockDeployer = {
  MockWishAdmin: async (inventory: string) => {
    const mockWishAdmin = await ethers.getContractFactory("MockWishAdmin");
    const mockWishAdminInstance = await mockWishAdmin.deploy(inventory);
    return [mockWishAdminInstance];
  },
};
