
import { ethers } from 'hardhat'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import Chance from 'chance'
import { LogLevel } from '@ethersproject/logger'
import { SoulhubManager, Soulbound, Soulhub, Wish, Wishport } from '../../types';
import { ZERO_ADDRESS } from '../../ethers-test-helpers'

ethers.utils.Logger.setLogLevel(LogLevel.ERROR);
const chance = new Chance()

type ContractDeploymentBaseConfig = {
    owner?: SignerWithAddress
}

type SoulhubDeploymentConfig = ContractDeploymentBaseConfig & {
    name?: string,
    soulhubManager?: SoulhubManager
}

type SoulboundDeploymentConfig = ContractDeploymentBaseConfig & SoulhubDeploymentConfig & {
    soulhub?: Soulhub
}


type WishDeploymentConfig = ContractDeploymentBaseConfig & SoulhubDeploymentConfig & {
    soulhub?: Soulhub
    soulhubManager?: SoulhubManager
    name?: string,
    symbol?: string,
    uri?: string,
    wishport?: string
}

class ContractDeployer {

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
        { owner, wishport, name = chance.string({ length: 8 }), symbol = chance.string({ length: 8 }), uri = chance.domain({ length: 8 }), soulhub, soulhubManager }: WishDeploymentConfig = {}
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
            uri,
            targetSoulhub.address,
            wishport ?? targetOwner.address
        )
        return [wish, targetSoulhub, targetSoulhubManager, targetOwner] as [
            Wish,
            Soulhub,
            SoulhubManager,
            SignerWithAddress,
        ]
    }
}

export const contractDeployer = new ContractDeployer();