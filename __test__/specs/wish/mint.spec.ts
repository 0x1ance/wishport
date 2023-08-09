import { contractDeployer } from "../../utils/ContractDeployer";
import {
  expectEvent,
  expectFnReturnChange,
  expectRevert,
  ZERO_ADDRESS,
} from "../../../ethers-test-helpers";
import { ethers } from "hardhat";
import { expect } from "chai";

describe("UNIT TEST: Wish Contract - mint", () => {
  it(`mint: should throw error if the caller is not owner or manager
`, async () => {
    const [owner, manager, random] = await ethers.getSigners();
    const [wish] = await contractDeployer.Wish({
      owner,
      manager: manager.address,
    });

    await expectRevert(
      wish.connect(random).mint(random.address, 1),
      "Wish:Unauthorized"
    );
  });
  it(`mint: should mint the corresponding tokenId if has not been minted previously
  `, async () => {
    const [owner, manager, account] = await ethers.getSigners();
    const [wish] = await contractDeployer.Wish({
      owner,
      manager: manager.address,
    });

    const tokenId = 0;

    await expectFnReturnChange(
      wish.connect(manager).mint,
      [account.address, tokenId],
      {
        contract: wish,
        functionSignature: "balanceOf",
        params: [account.address],
        expectedBefore: 0,
        expectedAfter: 1,
      }
    );
    expect(await wish.ownerOf(tokenId)).to.equal(account.address);
  });
  it(`mint: should throw error if the tokenId has been already minted`, async () => {
    const [owner, manager, account] = await ethers.getSigners();
    const [wish] = await contractDeployer.Wish({
      owner,
      manager: manager.address,
    });

    const tokenId = 0;

    await wish.connect(manager).mint(account.address, tokenId);
    await expectRevert(
      wish.connect(manager).mint(account.address, tokenId),
      "ERC721: token already minted"
    );
  });
  it("mint: should emit a Transfer event", async () => {
    const [owner, manager, account] = await ethers.getSigners();
    const [wish] = await contractDeployer.Wish({
      owner,
      manager: manager.address,
    });

    const tokenId = 0;

    await expectEvent(wish.connect(manager).mint, [account.address, tokenId], {
      contract: wish,
      eventSignature: "Transfer",
      eventArgs: {
        from: ZERO_ADDRESS,
        to: account.address,
        tokenId,
      },
    });
  });
});
