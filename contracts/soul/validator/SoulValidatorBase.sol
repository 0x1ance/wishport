// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import "./ISoulValidator.sol";
import "./lib/SoulValidatorErrorCodes.sol";

abstract contract SoulValidatorBase is Ownable, ERC165, ISoulValidator {
    constructor() {}

    /**
     * @dev See {IERC165-supportsInterface}.
     */
    function supportsInterface(bytes4 interfaceId_)
        public
        view
        virtual
        override(ERC165, IERC165)
        returns (bool)
    {
        return
            interfaceId_ == type(ISoulValidator).interfaceId ||
            super.supportsInterface(interfaceId_);
    }
}
