// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {TokenRecovery} from "../utils/TokenRecovery.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract TestTokenRecovery is TokenRecovery {
    constructor() Ownable(_msgSender()) {}

    receive() external payable {}

    fallback() external payable {}
}
