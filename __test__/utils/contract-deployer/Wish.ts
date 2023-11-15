import { ethers } from "hardhat";
import { ContractDeployerBase } from "./type";
import { type AddressLike } from "ethers";

type WishDeployerParams = ContractDeployerBase & {
  name_?: string;
  symbol_?: string;
  contractURI_?: string;
  uri_?: string;
  admins?: AddressLike[];
};

export const wishDeployer = async ({
  deployer,
  name_ = "Wish",
  symbol_ = "WISH",
  contractURI_ = "https://test-contractURI.com",
  uri_ = "https://test-uri.com",
  admins = [],
}: WishDeployerParams) => {
  const wish = await ethers.getContractFactory("Wish");
  const wishInstance = await wish.deploy(name_, symbol_, contractURI_, uri_, {
    from: deployer.address,
  });
  // Grant admin role to listed admins
  for (const admin of admins) {
    await wishInstance.grantRole(await wishInstance.ADMIN_ROLE(), admin);
  }
  return [wishInstance];
};
