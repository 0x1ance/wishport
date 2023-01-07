// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;
pragma experimental ABIEncoderV2;

import "./soul/SoulBase.sol";

// implementation of Vitalik Buterin's SBT whitepaper at https://papers.ssrn.com/sol3/papers.cfm?abstract_id=4105763

contract LumoxSoul is SoulBase {
    constructor(
        address soulValidator_
    ) SoulBase("Lumox Soul", soulValidator_) {}
}
