import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers"

export type ContractDeployerBase = {
    deployer: SignerWithAddress
}