import { ethers } from 'hardhat'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import Chance from 'chance'
import { LogLevel } from '@ethersproject/logger'
import { SoulhubManager, Soulbound, Soulhub, Wish, Wishport, Wish__factory, TestERC20, TestUSDT__factory, TestUSDT } from '../../types';
import { AssetConfigStruct } from '../../types/contracts/wishport/Wishport';

ethers.utils.Logger.setLogLevel(LogLevel.ERROR);
const chance = new Chance()

export type ContractDeploymentBaseConfig = {
    owner?: SignerWithAddress
}

export type SoulhubDeploymentConfig = ContractDeploymentBaseConfig & {
    name?: string,
    soulhubManager?: SoulhubManager
}

export type SoulboundDeploymentConfig = ContractDeploymentBaseConfig & SoulhubDeploymentConfig & {
    soulhub?: Soulhub
}

export type WishDeploymentConfig = ContractDeploymentBaseConfig & SoulhubDeploymentConfig & {
    soulhub?: Soulhub
    soulhubManager?: SoulhubManager
    name?: string,
    symbol?: string,
    uri?: string,
    contractURI?: string
    manager?: string
}

export type WishportDeploymentConfig = ContractDeploymentBaseConfig & Omit<WishDeploymentConfig, 'manager'> & {
    authedSigner?: string,
    defaultAssetConfig?: AssetConfigStruct
}



export class ContractDeployer {
    async TestERC20({ owner }: ContractDeploymentBaseConfig = {}) {
        const [defaultOwner] = await ethers.getSigners()
        const contractFactory = await ethers.getContractFactory('TestERC20')
        const targetOwner = owner ?? defaultOwner
        const testerc20 = await contractFactory.connect(targetOwner).deploy(
        )
        return [testerc20, targetOwner] as [
            TestERC20,
            SignerWithAddress,
        ]
    }
    async TestUSDT({ owner }: ContractDeploymentBaseConfig = {}) {
        const [defaultOwner] = await ethers.getSigners()
        const contractFactory = await ethers.getContractFactory('TestUSDT')
        const targetOwner = owner ?? defaultOwner
        const testUsdt = await contractFactory.connect(targetOwner).deploy(
        )
        return [testUsdt, targetOwner] as [
            TestUSDT,
            SignerWithAddress,
        ]
    }
    async SoulhubManager(
        { owner }: ContractDeploymentBaseConfig = {}
    ) {
        const [defaultOwner] = await ethers.getSigners()
        const contractFactory = await ethers.getContractFactory('SoulhubManager')
        const targetOwner = owner ?? defaultOwner
        const soulhubManager = await contractFactory.connect(targetOwner).deploy(
        )

        return [soulhubManager, targetOwner] as [
            SoulhubManager,
            SignerWithAddress,
        ]
    }
    async Soulhub(
        { owner, soulhubManager, name = chance.string({ length: 8 }) }: SoulhubDeploymentConfig = {}
    ) {
        const [defaultOwner] = await ethers.getSigners()
        const contractFactory = await ethers.getContractFactory('Soulhub', {
        })
        const targetOwner = owner ?? defaultOwner
        const targetSoulhubManager = soulhubManager ?? (await this.SoulhubManager({ owner: targetOwner }))[0]
        const soulhub = await contractFactory.connect(targetOwner).deploy(
            name,
            targetSoulhubManager.address
        )
        return [soulhub, targetSoulhubManager, targetOwner] as [
            Soulhub,
            SoulhubManager,
            SignerWithAddress,
        ]
    }
    async Soulbound(
        { owner, soulhubManager, name = chance.string({ length: 8 }), soulhub }: SoulboundDeploymentConfig = {}
    ) {
        const [defaultOwner] = await ethers.getSigners()
        const targetOwner = owner ?? defaultOwner
        const targetSoulhubManager = soulhubManager ?? (await this.SoulhubManager({ owner: targetOwner }))[0]
        const targetSoulhub = soulhub ?? (await this.Soulhub({ owner: targetOwner, soulhubManager: targetSoulhubManager, name }))[0]

        const contractFactory = await ethers.getContractFactory('Soulbound', {
        })
        const soulbound = await contractFactory.connect(targetOwner).deploy(
            targetSoulhub.address
        )

        return [soulbound, targetSoulhub, targetSoulhubManager, targetOwner] as [
            Soulbound,
            Soulhub,
            SoulhubManager,
            SignerWithAddress,
        ]
    }
    async Wish(
        { owner, manager, name = chance.string({ length: 8 }), symbol = chance.string({ length: 8 }), uri = chance.domain({ length: 8 }), contractURI = chance.domain({ length: 8 }), soulhub, soulhubManager }: WishDeploymentConfig = {}
    ) {
        const [defaultOwner] = await ethers.getSigners()
        const targetOwner = owner ?? defaultOwner
        const targetSoulhubManager = soulhubManager ?? (await this.SoulhubManager({ owner: targetOwner }))[0]
        const targetSoulhub = soulhub ?? (await this.Soulhub({ owner: targetOwner, soulhubManager: targetSoulhubManager, name }))[0]

        const contractFactory = await ethers.getContractFactory('Wish', {
        })
        const wish = await contractFactory.connect(targetOwner).deploy(
            name,
            symbol,
            contractURI,
            uri,
            targetSoulhub.address,
            manager ?? targetOwner.address
        )
        return [wish, targetSoulhub, targetSoulhubManager, targetOwner] as [
            Wish,
            Soulhub,
            SoulhubManager,
            SignerWithAddress,
        ]
    }
    async Wishport(
        {
            owner,
            name = chance.string({ length: 8 }),
            symbol = chance.string({ length: 8 }),
            uri = chance.domain({ length: 8 }),
            contractURI = chance.domain({ length: 8 }),
            soulhub,
            soulhubManager,
            authedSigner,
            defaultAssetConfig = {
                activated: true,
                PLATFORM_FEE_PORTION: chance.integer({ min: 0, max: 10000 }),
                DISPUTE_HANDLING_FEE_PORTION: chance.integer({ min: 0, max: 10000 })
            }
        }: WishportDeploymentConfig = {}
    ) {
        const [defaultOwner] = await ethers.getSigners()
        const targetOwner = owner ?? defaultOwner
        const targetSoulhubManager = soulhubManager ?? (await this.SoulhubManager({ owner: targetOwner }))[0]
        const targetSoulhub = soulhub ?? (await this.Soulhub({ owner: targetOwner, soulhubManager: targetSoulhubManager, name }))[0]
        const targeAuthedSigner = authedSigner ?? targetOwner.address
        const contractFactory = await ethers.getContractFactory('Wishport', {
        })
        const wishport = (await contractFactory.connect(targetOwner).deploy(
            name,
            symbol,
            contractURI,
            uri,
            targetSoulhub.address,
            targeAuthedSigner,
            defaultAssetConfig
        )) as Wishport

        const wishToken = Wish__factory.connect(await wishport.wish(), targetOwner)

        return [wishport, wishToken, targetSoulhub, targetSoulhubManager, targetOwner] as [
            Wishport,
            Wish,
            Soulhub,
            SoulhubManager,
            SignerWithAddress,
        ]
    }
}

export const contractDeployer = new ContractDeployer();