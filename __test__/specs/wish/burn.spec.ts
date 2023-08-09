import { contractDeployer } from "../../utils/ContractDeployer";
import {
  expectEvent,
  expectFnReturnChange,
  expectRevert,
  ZERO_ADDRESS,
} from "../../../ethers-test-helpers";
import { ethers } from "hardhat";

describe("UNIT TEST: Wish Contract - burn", () => {
  it(`burn: should throw error if the caller is not owner or manager
`, async () => {
    const [owner, manager, random] = await ethers.getSigners();
    const [wish] = await contractDeployer.Wish({
      owner,
      manager: manager.address,
    });

    await expectRevert(
      wish.connect(random).burn(1),
      "Wish:Unauthorized"
    );
  });
  it(`burn: should burn the corresponding tokenId if has been minted previously
  `, async () => {
    const [owner, manager, account] = await ethers.getSigners();
    const [wish] = await contractDeployer.Wish({
      owner,
      manager: manager.address,
    });

    const tokenId = 0;

    await wish.connect(manager).mint(account.address, tokenId);

    await expectFnReturnChange(wish.connect(manager).burn, [tokenId], {
      contract: wish,
      functionSignature: "balanceOf",
      params: [account.address],
      expectedBefore: 1,
      expectedAfter: 0,
    });
  });
  it(`burn: should throw error if the tokenId has not been minted`, async () => {
    const [owner, manager, _account] = await ethers.getSigners();
    const [wish] = await contractDeployer.Wish({
      owner,
      manager: manager.address,
    });

    const tokenId = 0;

    await expectRevert(
      wish.connect(manager).burn(tokenId),
      "ERC721: invalid token ID"
    );
  });
  it("burn: should emit a Transfer event", async () => {
    const [owner, manager, account] = await ethers.getSigners();
    const [wish] = await contractDeployer.Wish({
      owner,
      manager: manager.address,
    });

    const tokenId = 0;

    await wish.connect(manager).mint(account.address, tokenId);
    await expectEvent(wish.connect(manager).burn, [tokenId], {
      contract: wish,
      eventSignature: "Transfer",
      eventArgs: {
        from: account.address,
        to: ZERO_ADDRESS,
        tokenId,
      },
    });
  });
});
