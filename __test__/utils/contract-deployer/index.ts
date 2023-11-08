import { tokenRecoveryDeployer } from "./TokenRecovery";
import { wishDeployer } from "./Wish";
import { MockDeployer } from "./mock";
import { TestTokenDeployer } from "./token";
import { wishportDeployer } from "./Wishport";

export const ContractDeployer = {
  Token: TestTokenDeployer,
  TokenRecovery: tokenRecoveryDeployer,
  Wish: wishDeployer,
  Wishport: wishportDeployer,
  Mock: MockDeployer,
};
