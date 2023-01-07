// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "./wishport/WishSBT/WishSBT.sol";

// conditional soul bound
contract LumoxWishSBT is WishSBT {
    constructor(
        string memory uri_,
        address soul_
    ) WishSBT("Lumox Wish", "LMXW", uri_, soul_) {}
}
