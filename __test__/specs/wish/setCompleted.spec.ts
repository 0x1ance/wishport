import { contractDeployer } from "../../utils/ContractDeployer";
import {
  expectEvent,
  expectFnReturnChange,
  expectRevert,
  ZERO_ADDRESS,
} from "../../../ethers-test-helpers";
import { ethers } from "hardhat";

describe("UNIT TEST: Wish Contract - setCompleted", () => {
  it(`setCompleted: should throw error if the caller is not manager or owner
`, async () => {
    const [owner, manager, random] = await ethers.getSigners();
    const [wish] = await contractDeployer.Wish({
      owner,
      manager: manager.address,
    });

    const tokenId = 0;
    await expectRevert(
      wish.connect(random).setCompleted(tokenId, true),
      "Wish:Unauthorized"
    );
  });
  it(`setCompleted: should throw error if the tokenId has not been minted
  `, async () => {
    const [owner, manager, _account] = await ethers.getSigners();
    const [wish] = await contractDeployer.Wish({
      owner,
      manager: manager.address,
    });
    const tokenId = 0;

    await expectRevert(
      wish.connect(manager).setCompleted(tokenId, true),
      "ERC721: invalid token ID"
    );
  });
  it(`setCompleted: should throw error if the current completed status && the input status param both equals to false
  `, async () => {
    const [owner, manager, account] = await ethers.getSigners();
    const [wish] = await contractDeployer.Wish({
      owner,
      manager: manager.address,
    });

    const tokenId = 0;
    await wish.connect(manager).mint(account.address, tokenId);

    await expectRevert(
      wish.connect(manager).setCompleted(tokenId, false),
      "Wish:SetCompletedError"
    );
  });
  it(`setCompleted: should throw error if the current completed status && the input status param both equals to false
  `, async () => {
    const [owner, manager, account] = await ethers.getSigners();
    const [wish] = await contractDeployer.Wish({
      owner,
      manager: manager.address,
    });
    
    const tokenId = 0;
    await wish.connect(manager).mint(account.address, tokenId);

    await expectRevert(
      wish.connect(manager).setCompleted(tokenId, false),
      "Wish:SetCompletedError"
    );
  });
  it(`setCompleted: should throw error if the current completed status && the input status param both equals to true
  `, async () => {
    const [owner, account] = await ethers.getSigners();
    const [wish] = await contractDeployer.Wish({ owner });

    const tokenId = 0;
    await wish.connect(owner).mint(account.address, tokenId);

    await wish.connect(owner).setCompleted(tokenId, true);
    await expectRevert(
      wish.connect(owner).setCompleted(tokenId, true),
      "Wish:SetCompletedError"
    );
  });
  it(`setCompleted: should increment the balanceOfCompleted of owner if completed status is set to true
  `, async () => {
    const [owner, manager, account] = await ethers.getSigners();
    const [wish] = await contractDeployer.Wish({
      owner,
      manager: manager.address,
    });

    const tokenId = 0;
    await wish.connect(manager).mint(account.address, tokenId);

    await expectFnReturnChange(
      wish.connect(manager).setCompleted,
      [tokenId, true],
      {
        contract: wish,
        functionSignature: "balanceOfCompleted",
        params: [account.address],
        expectedBefore: 0,
        expectedAfter: 1,
      }
    );
  });
  it(`setCompleted: should update token completed status to false when the input status param is false
  `, async () => {
    const [owner, manager, account] = await ethers.getSigners();
    const [wish] = await contractDeployer.Wish({
      owner,
      manager: manager.address,
    });

    const tokenId = 0;
    await wish.connect(manager).mint(account.address, tokenId);

    await wish.connect(manager).setCompleted(tokenId, true);
    await expectFnReturnChange(
      wish.connect(manager).setCompleted,
      [tokenId, false],
      {
        contract: wish,
        functionSignature: "completed",
        params: [tokenId],
        expectedBefore: true,
        expectedAfter: false,
      }
    );
  });
  it(`setCompleted: should update token completed status to true when the input status param is true
  `, async () => {
    const [owner, manager, account] = await ethers.getSigners();
    const [wish] = await contractDeployer.Wish({
      owner,
      manager: manager.address,
    });

    const tokenId = 0;
    await wish.connect(manager).mint(account.address, tokenId);

    await expectFnReturnChange(
      wish.connect(manager).setCompleted,
      [tokenId, true],
      {
        contract: wish,
        functionSignature: "completed",
        params: [tokenId],
        expectedBefore: false,
        expectedAfter: true,
      }
    );
  });
  it("setCompleted: should emit a SetCompleted event", async () => {
    const [owner, manager, account] = await ethers.getSigners();
    const [wish] = await contractDeployer.Wish({
      owner,
      manager: manager.address,
    });
    const tokenId = 0;
    const newStatus = true;
    await wish.connect(manager).mint(account.address, tokenId);

    await expectEvent(wish.connect(manager).setCompleted, [tokenId, newStatus], {
      contract: wish,
      eventSignature: "SetCompleted",
      eventArgs: {
        tokenId_: tokenId,
        status: newStatus,
      },
    });
  });
});
