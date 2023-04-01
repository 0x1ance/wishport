
import { contractDeployer } from '../../utils/ContractDeployer';
import { expect } from 'chai'
import { IERC165__factory, IERC721Soulbound__factory, IERC721__factory, ISoulbound__factory, IWish__factory } from '../../../types';
import { generateInterfaceID } from '../../../ethers-test-helpers';

describe('UNIT TEST: Wish Contract - supportsInterface', () => {
  it('supportsInterface: should support the IERC164, ISoulbound, IERC721, IERC721Soulbound & IWish interface', async () => {
    const [wish] = await contractDeployer.Wish()

    const IERC165Interface = IERC165__factory.createInterface()
    const ISoulboundInterface = ISoulbound__factory.createInterface()
    const IERC721Interface = IERC721__factory.createInterface()
    const IERC721SoulboundInterface = IERC721Soulbound__factory.createInterface()
    const IWishInterface = IWish__factory.createInterface()

    const IERC165InterfaceId = generateInterfaceID([
      IERC165Interface,
    ])._hex
    const ISoulboundInterfaceId = generateInterfaceID([
      ISoulboundInterface,
      IERC165Interface
    ])._hex
    const IERC721InterfaceId = generateInterfaceID([
      IERC721Interface,
      IERC165Interface
    ])._hex
    const IERC721SoulboundInterfaceId = generateInterfaceID([
      IERC721SoulboundInterface,
      ISoulboundInterface,
    ])._hex
    const IWishInterfaceId = generateInterfaceID([
      IWishInterface,
      IERC721Interface,
      ISoulboundInterface,
      IERC165Interface
    ])._hex

    expect(await wish.supportsInterface(IERC165InterfaceId)).to.be.true
    expect(await wish.supportsInterface(ISoulboundInterfaceId)).to.be.true
    expect(await wish.supportsInterface(IERC721InterfaceId)).to.be.true
    expect(await wish.supportsInterface(IERC721SoulboundInterfaceId)).to.be.true
    expect(await wish.supportsInterface(IWishInterfaceId)).to.be.true
  })
})
