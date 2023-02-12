// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "@dyut6/soulbound/contracts/sbt/ERC721Soulbound/ERC721Soulbound.sol";

// conditional soul bound
interface IWishERC721Soulbound is IERC721Soulbound {
    /**
     * @dev mint the token
     *
     * Requirements:
     *
     * - when the contract is not paused
     * - only owner or soul verifiers can mint to address
     */
    function mint(address to_, uint256 tokenId_) external returns (bool);

    /**
     * @dev burn the token
     *
     * Requirements:
     *
     * - when the contract is not paused
     * - only owner or soul verifiers can mint to address
     */
    function burn(uint256 tokenId_) external returns (bool);

    /**
     * @dev set the token transferablity
     *
     * Requirements:
     *
     * - only owner or soul verifiers can mint to address
     * - token has to be minted
     */
    function setTransferable(uint256 tokenId_, bool status_)
        external
        returns (bool);
}
