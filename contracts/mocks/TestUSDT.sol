// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TestUSDT is ERC20, Ownable {
    uint256 public basisPointsRate = 5000;
    uint256 public basePortion = 10000;
    uint256 public maximumFee =
        115792089237316195423570985008687907853269984665640564039457584007913129639935;

    uint256 public constant MAX_uint256 = 2 ** 256 - 1;

    constructor(
        string memory name_,
        string memory symbol_
    ) ERC20(name_, symbol_) Ownable(_msgSender()) {}

    function mint(address account, uint256 amount) external {
        _mint(account, amount);
    }

    function transfer(
        address to,
        uint256 value
    ) public virtual override returns (bool) {
        uint256 fee = (value * basisPointsRate) / (basePortion);
        if (fee > maximumFee) {
            fee = maximumFee;
        }
        uint256 sendAmount = value - fee;
        _transfer(_msgSender(), to, sendAmount);
        if (fee > 0) {
            _transfer(_msgSender(), owner(), fee);
        }
        return true;
    }

    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public virtual override returns (bool) {
        uint256 allowance = allowance(from, _msgSender());

        // Check is not needed because sub(_allowance, _value) will already throw if this condition is not met
        // if (_value > _allowance) throw;

        uint256 fee = (amount * (basisPointsRate)) / (basePortion);
        if (fee > maximumFee) {
            fee = maximumFee;
        }
        if (allowance < MAX_uint256) {
            _approve(from, _msgSender(), allowance - (amount));
        }
        uint256 sendAmount = amount - (fee);
        _transfer(from, to, sendAmount);
        if (fee > 0) {
            _transfer(from, owner(), fee);
        }
        return true;
    }
}
