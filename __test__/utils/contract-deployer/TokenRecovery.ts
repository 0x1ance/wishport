import { ethers } from "hardhat";
import { ContractDeployerBase } from "./type";

type TokenRecoveryDeployerParams = ContractDeployerBase;

export const tokenRecoveryDeployer = async ({
  deployer,
}: TokenRecoveryDeployerParams) => {
  const tokenRecovery = await ethers.getContractFactory("TestTokenRecovery");
  const tokenRecoveryInstance = await tokenRecovery.deploy({
    from: deployer.address,
  });
  return [tokenRecoveryInstance];
};
