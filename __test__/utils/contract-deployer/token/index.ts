import { ethers } from "hardhat";

export const TestTokenDeployer = {
  ERC20: async () => {
    const tokenRecovery = await ethers.getContractFactory("TestERC20");
    const tokenRecoveryInstance = await tokenRecovery.deploy();
    return [tokenRecoveryInstance];
  },
  ERC721: async () => {
    const tokenRecovery = await ethers.getContractFactory("TestERC721");
    const tokenRecoveryInstance = await tokenRecovery.deploy();
    return [tokenRecoveryInstance];
  },
};
