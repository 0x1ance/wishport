import { ethers } from "hardhat";
import { ContractDeployer } from "@test/utils/contract-deployer";
import { shouldBehaveLikeTokenRecovery } from "@test/specs/patterns/utils/TokenRecovery/shouldBehaveLikeTokenRecovery";

describe("TokenRecovery", () => {
  const fixture = async () => {
    const [deployer] = await ethers.getSigners();
    const [tokenRecovery] = await ContractDeployer.TokenRecovery({
      deployer,
    });
    return tokenRecovery;
  };

  shouldBehaveLikeTokenRecovery(fixture);
});
