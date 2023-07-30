import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { LogLevel } from "@ethersproject/logger";
import {
  SoulhubManager,
  Soulhub,
  Wish,
  Wishport,
  TestERC20,
} from "../../types";
import { contractDeployer, WishportDeploymentConfig } from "./ContractDeployer";
import { generateSignature, getCurrentBlock } from "../../hardhat-test-helpers";
import { UnitParser } from "./UnitParser";
import { ZERO_ADDRESS } from "../../ethers-test-helpers";

ethers.utils.Logger.setLogLevel(LogLevel.ERROR);

type AfterWishportMintProps = WishportDeploymentConfig & {
  tokenId: number;
  assetToken?: TestERC20;
  assetAmount: number;
  nonce: number;
  sigExpireBlockNum: number;
  minter: SignerWithAddress;
};

type AfterWishportCompleteProps = AfterWishportMintProps & {
  fulfiller: SignerWithAddress;
};

class ContractStateGenerator {
  async afterWishportMint({
    tokenId,
    assetToken,
    assetAmount,
    nonce,
    sigExpireBlockNum,
    minter,
    ...wishportDeploymentConfig
  }: AfterWishportMintProps) {
    const [wishport, wishToken, soulhub, soulhubManager, owner] =
      await contractDeployer.Wishport(wishportDeploymentConfig);

    const assetAddress = assetToken ? assetToken.address : ZERO_ADDRESS;
    const parsedAmount = assetToken
      ? UnitParser.toBigNumber(assetAmount, await assetToken!.decimals())
      : UnitParser.toEther(assetAmount);

    if (assetToken) {
      const decimals = await assetToken.decimals();
      // mint king token for caller
      await assetToken
        .connect(minter)
        .mint(minter.address, UnitParser.toBigNumber(assetAmount, decimals));
      // approve all buyer king to dtkStore
      await assetToken
        .connect(minter)
        .approve(
          wishport.address,
          UnitParser.toBigNumber(assetAmount, decimals)
        );
    }

    const signature = await generateSignature({
      signer: owner,
      types: [
        "string",
        "uint256",
        "address",
        "address",
        "uint256",
        "address",
        "uint256",
        "uint256",
        "uint256",
      ],
      values: [
        "mint(uint256,address,uint256,uint256,uint256,bytes)",
        (await owner.provider?.getNetwork())?.chainId,
        wishport.address,
        minter.address,
        tokenId,
        assetAddress,
        parsedAmount,
        nonce,
        sigExpireBlockNum,
      ],
    });

    await wishport
      .connect(minter)
      .mint(
        tokenId,
        assetAddress,
        parsedAmount,
        nonce,
        sigExpireBlockNum,
        signature,
        { value: parsedAmount }
      );

    return [wishport, wishToken, soulhub, soulhubManager, owner] as [
      Wishport,
      Wish,
      Soulhub,
      SoulhubManager,
      SignerWithAddress
    ];
  }

  async afterWishportComplete({
    fulfiller,
    ...props
  }: AfterWishportCompleteProps) {
    const [wishport, wishToken, soulhub, soulhubManager, owner] =
      await this.afterWishportMint(props);
    const { tokenId, nonce } = props;

    const sigExpireBlockNum = (await getCurrentBlock()).number + 10;
    const signature = await generateSignature({
      signer: owner,
      types: [
        "string",
        "uint256",
        "address",
        "address",
        "uint256",
        "address",
        "uint256",
        "uint256",
      ],
      values: [
        "complete(uint256,address,uint256,bytes,uint256)",
        (await owner.provider?.getNetwork())?.chainId,
        wishport.address,
        fulfiller.address,
        tokenId,
        fulfiller.address,
        nonce,
        sigExpireBlockNum,
      ],
    });

    await wishport
      .connect(fulfiller)
      .complete(
        tokenId,
        fulfiller.address,
        nonce,
        signature,
        sigExpireBlockNum
      );

    return [wishport, wishToken, soulhub, soulhubManager, owner] as [
      Wishport,
      Wish,
      Soulhub,
      SoulhubManager,
      SignerWithAddress
    ];
  }
}

export const contractStateGenerator = new ContractStateGenerator();
