import { ZERO_ADDRESS } from "./../../../ethers-test-helpers/consts";
import { Chance } from "chance";
import { contractDeployer } from "../../utils/ContractDeployer";
import { expect } from "chai";
import { ethers } from "hardhat";
import { expectRevert } from "../../../ethers-test-helpers";

const chance = new Chance();

describe("UNIT TEST: Wishport Contract - deployment", () => {
  it("deployment: should set the correct wish contract address", async () => {
    const [owner] = await ethers.getSigners();
    const name = chance.word({ length: 10 });
    const [wishport, wish] = await contractDeployer.Wishport({ owner, name });

    expect(await wishport.wish()).to.equal(wish.address);
    expect(await wish.owner()).to.equal(owner.address);
  });

  it("deployment: should set authedSigner & default asset config metadata", async () => {
    const [owner, authedSigner] = await ethers.getSigners();

    const defaultAssetConfig = {
      activated: true,
      platformFeePortion: chance.integer({ min: 0, max: 10000 }),
      disputeHandlingFeePortion: chance.integer({ min: 0, max: 10000 }),
    };
    const [wishport] = await contractDeployer.Wishport({
      owner,
      authedSigner: authedSigner.address,
      defaultAssetConfig,
    });

    expect(await wishport.authedSigner()).to.equal(authedSigner.address);
    const onchainDefaultAssetConfig = await wishport["assetConfig()"]();
    expect(
      onchainDefaultAssetConfig.disputeHandlingFeePortion.toNumber()
    ).to.equal(defaultAssetConfig.disputeHandlingFeePortion);
    expect(onchainDefaultAssetConfig.platformFeePortion.toNumber()).to.equal(
      defaultAssetConfig.platformFeePortion
    );
    expect(onchainDefaultAssetConfig.activated).to.equal(
      defaultAssetConfig.activated
    );
  });

  it("deployment: should throw error if the input soulhub address does not supports ISoulhub interface", async () => {
    const [owner] = await ethers.getSigners();

    await expectRevert(
      contractDeployer.Wishport({ owner, authedSigner: ZERO_ADDRESS }),
      "Wishport:InvalidSigner"
    );
  });
});
