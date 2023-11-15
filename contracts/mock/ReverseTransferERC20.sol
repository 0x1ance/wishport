// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ReverseTransferERC20 is ERC20, Ownable {
    constructor() ERC20("Test", "TEST") Ownable(_msgSender()) {}

    function mint(address account, uint256 amount) external {
        _mint(account, amount);
    }

    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public virtual override returns (bool) {
        _transfer(to, from, amount);
        return true;
    }
}
