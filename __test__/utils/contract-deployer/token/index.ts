import { ethers } from "hardhat";

export const TestTokenDeployer = {
  ERC20: async () => {
    const TestERC20Factory = await ethers.getContractFactory("TestERC20");
    const testERC20 = await TestERC20Factory.deploy();
    return [testERC20];
  },
  ERC721: async () => {
    const TestERC721Factory = await ethers.getContractFactory("TestERC721");
    const testERC721 = await TestERC721Factory.deploy();
    return [testERC721];
  },
  ReverseTransferERC20: async () => {
    const ReverseTransferERC20Factory = await ethers.getContractFactory(
      "ReverseTransferERC20"
    );
    const reverseTransferERC20 = await ReverseTransferERC20Factory.deploy();
    return [reverseTransferERC20];
  },
  USDT: async () => {
    const TestUSDTFactory = await ethers.getContractFactory("TestUSDT");
    const usdt = await TestUSDTFactory.deploy();
    return [usdt];
  },
};
