// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract TestERC721 is ERC721 {
    constructor() ERC721("TEST", "TEST") {}

    function mint(address to, uint256 tokenId) external {
        _mint(to, tokenId);
    }
}
