// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TestERC20 is ERC20 {
    uint256 public constant RESERVE = 1000000000 ether;

    constructor() ERC20("TEST", "TEST") {}

    function mint(address account, uint256 amount) external {
        _mint(account, amount);
    }
}
