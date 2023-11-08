import { ethers } from "hardhat";
import { ContractDeployerBase } from "./type";
import { type AddressLike } from "ethers";

type WishportDeployerParams = ContractDeployerBase & {
  wish_: AddressLike;
  authedSigner_: AddressLike;
  trustedForwarder_: AddressLike;
};

export const wishportDeployer = async ({
  deployer,
  wish_,
  authedSigner_,
  trustedForwarder_,
}: WishportDeployerParams) => {
  const Wishport = await ethers.getContractFactory("Wishport");
  const wishport = await Wishport.deploy(
    wish_,
    authedSigner_,
    trustedForwarder_,
    {
      from: deployer.address,
    }
  );
  return [wishport];
};
