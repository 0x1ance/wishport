import { tokenRecoveryDeployer } from "./TokenRecovery";
import { wishDeployer } from "./Wish";
import { MockDeployer } from "./mock";
import { TestTokenDeployer } from "./token";

export const ContractDeployer = {
  Token: TestTokenDeployer,
  TokenRecovery: tokenRecoveryDeployer,
  Wish: wishDeployer,
  Mock: MockDeployer,
};
