import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@typechain/hardhat";
import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-chai-matchers";
import "hardhat-deploy";
import "hardhat-gas-reporter";
import "solidity-coverage";
import { env } from "./environment";
import "tsconfig-paths/register";

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.20",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
            details: {
              yul: true,
            },
          },
          // viaIR: true,
        },
      },
    ],
  },
  namedAccounts: {
    deployer: 0,
  },
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true,
    },
    localhost: {
      allowUnlimitedContractSize: true,
    },
    goerli: {
      url: `https://goerli.infura.io/v3/${env.INFURA_API_KEY}`,
      ...(env.ROOT_WALLET_PRIVATE_KEY
        ? { accounts: [env.ROOT_WALLET_PRIVATE_KEY] }
        : {}),
    },
    bsc_testnet: {
      url: "https://data-seed-prebsc-1-s1.binance.org:8545",
      chainId: 97,
      gasPrice: 20000000000,
      ...(env.ROOT_WALLET_PRIVATE_KEY
        ? { accounts: [env.ROOT_WALLET_PRIVATE_KEY] }
        : {}),
      tags: ["dev"],
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./__test__/specs",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  typechain: {
    outDir: "./types",
    target: "ethers-v6",
    alwaysGenerateOverloads: false,
    externalArtifacts: ["externalArtifacts/*.json"],
    dontOverrideCompile: false,
  },
  gasReporter: {
    enabled: true,
  },
};

export default config;
