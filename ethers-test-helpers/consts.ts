import { BigNumber } from 'ethers'

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'
const ZERO_BYTES32 =
    '0x0000000000000000000000000000000000000000000000000000000000000000'

const MAX_UINT256 = BigNumber.from('2')
    .pow(BigNumber.from('256'))
    .sub(BigNumber.from('1'))
const MAX_INT256 = BigNumber.from('2')
    .pow(BigNumber.from('255'))
    .sub(BigNumber.from('1'))
const MIN_INT256 = BigNumber.from('2')
    .pow(BigNumber.from('255'))
    .mul(BigNumber.from('-1'))

export { ZERO_ADDRESS, ZERO_BYTES32, MAX_UINT256, MAX_INT256, MIN_INT256 }