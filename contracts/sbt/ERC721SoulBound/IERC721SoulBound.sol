// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC721/extensions/IERC721Enumerable.sol";
import "../ISoulBoundRegistry.sol";

// import "hardhat/console.sol";

// conditional soul bound
interface IERC721SoulBound is ISoulBoundRegistry {
    /**
     * @dev Get the balance under a soul
     */
    function balanceOfSoul(uint256 soul_) external view returns (uint256);
}
