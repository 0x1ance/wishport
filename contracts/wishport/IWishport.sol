// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;
pragma experimental ABIEncoderV2;

// access control
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/introspection/IERC165.sol";

enum WishStatusEnum {
    INACTIVE,
    OUTSTANDING,
    IN_PROGRESS,
    COMPLETED
}

interface IWishport is IERC165 {
    struct PortConfig {
        uint256 MINIMUM_REWARD;
        // PLATFORM_FEE_PORTION: e.g. 250_000_000 for 25% in uint256 basis points (parts per 1_000_000_000)
        uint256 PLATFORM_FEE_PORTION;
        uint256 DISPUTE_HANDLING_FEE_PORTION;
        address PLATFORM_FEE_POOL;
    }

    /**
     * @dev return the port config
     */
    function getPortConfig() external view returns (PortConfig memory);

    /**
     * @dev Set the port config
     *
     * Requirements:
     *
     * - caller must be the owner
     */
    function setPortConfig(PortConfig memory config_) external;

    /**
     * @dev return true if the address is a manager
     */
    function isManager(address a_) external view returns (bool);

    /**
     * @dev Set the manager role
     *
     * Requirements:
     *
     * - caller must be the owner
     */
    function setManager(address a_, bool status_) external;

    /**
     * @dev return the currentNonce of an address
     *
     */
    function hasNonceConsumed(
        address a_,
        uint256 nonce_
    ) external view returns (bool);

    /**
     * @dev return supported erc20 of corresponding asset index
     */
    function getSupportedERC20ByIdx(
        uint256 assetIdx_
    ) external view returns (address);

    /**
     * @dev return all supported erc20 of corresponding asset index
     */
    function getSupportedERC20s() external view returns (address[] memory);

    /**
     * @dev register supported asset, increment supported erc20 count
     *
     * Requirements:
     *
     * - caller must be the owner
     * - asset must implement IERC20 interface
     */
    function registerSupportedAsset(address a_) external;
}
