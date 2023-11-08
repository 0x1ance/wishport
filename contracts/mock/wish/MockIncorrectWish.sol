// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Wish} from "../../wish/Wish.sol";

contract MockIncorrectWish is Wish {
    constructor() Wish("Wish", "WISH", "random", "random") {}

    function mint(
        address,
        uint256
    ) external override onlyRole(ADMIN_ROLE) returns (bytes4) {
        return 0x11111111;
    }

    function complete(
        address,
        uint256
    ) external override onlyRole(ADMIN_ROLE) returns (bytes4) {
        return 0x11111111;
    }

    function burn(
        uint256
    ) external override onlyRole(ADMIN_ROLE) returns (bytes4) {
        return 0x11111111;
    }
}
