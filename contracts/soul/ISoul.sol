// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "./validator/ISoulValidator.sol";
import "@openzeppelin/contracts/utils/introspection/IERC165.sol";

interface ISoul is IERC165 {
    struct SoulProfile {
        uint256 count;
        mapping(uint256 => address) members;
    }

    /**
     * @dev Returns the soul validator address
     */
    function validator() external view returns (address);

    /**
     * @dev Set the soul validator
     */
    function setValidator(address validator_) external;

    /**
     * @dev Returns the soul of the address.
     */
    function soul(address a_) external view returns (uint256);

    /**
     * @dev Returns all the bounded address of a soul
     */
    function soulMembers(
        uint256 soul_
    ) external view returns (address[] memory);

    /**
     * @dev Returns true if two address are bounded to the same soul, and false otherwise.
     */
    function checkSameSoul(
        address a1_,
        address a2_
    ) external view returns (bool);

    /**
     * @dev Returns true if the address is soul verifier, and false otherwise.
     */
    function checkVerifier(address a_) external view returns (bool);

    /**
     * @dev Bind an address to a soul
     *
     * Requirements:
     *
     * - the caller must be the owner.
     */
    function bind(address a_, uint256 soul_) external;

    /**
     * @dev Bind an address to a soul, validate action by verified signature
     *
     */
    function bind(
        address a_,
        uint256 soul_,
        uint256 nonce_,
        bytes memory sig_,
        address signer_
    ) external;

    /**
     * @dev Unbind an address from a soul
     *
     * Requirements:
     *
     * - the caller must be the owner.
     */
    function unbind(address a_, uint256 soul_) external;

    /**
     * @dev Unbind an address to a soul, validate action by verified signature
     *
     */
    function unbind(
        address a_,
        uint256 soul_,
        uint256 nonce_,
        bytes memory sig_,
        address signer_
    ) external;
}
