// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {IWish} from "../../wish/IWish.sol";

contract MockWishAdmin {
    IWish public immutable WISH_INVENTORY;

    bytes4 public mintResult = "0x";
    bytes4 public burnResult = "0x";
    bytes4 public completeResult = "0x";

    constructor(address inventory) {
        WISH_INVENTORY = IWish(inventory);
    }

    function testMint(address to_, uint256 tokenId_) external {
        mintResult = "0x";
        bytes4 receipt = WISH_INVENTORY.mint(to_, tokenId_);
        mintResult = receipt;
    }

    function testBurn(uint256 tokenId_) external {
        burnResult = "0x";
        bytes4 receipt = WISH_INVENTORY.burn(tokenId_);
        burnResult = receipt;
    }

    function testComplete(address fulfiller_, uint256 tokenId_) external {
        completeResult = "0x";
        bytes4 receipt = WISH_INVENTORY.complete(fulfiller_, tokenId_);
        completeResult = receipt;
    }
}
