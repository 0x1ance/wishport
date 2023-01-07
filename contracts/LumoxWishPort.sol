// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;
import "./wishport/Wishport.sol";

contract Moxport is Wishport {
    constructor(
        address wishSBTAddress_,
        PortConfig memory config_,
        SupportedERC20Config memory nativeEtherConfig_
    )
        Wishport("Lumox Taskport", wishSBTAddress_, config_, nativeEtherConfig_)
    {}
}
