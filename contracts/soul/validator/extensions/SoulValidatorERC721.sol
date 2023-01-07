// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";
import "../SoulValidatorBase.sol";
import "../lib/SoulValidatorErrorCodes.sol";

contract SoulValidatorERC721 is SoulValidatorBase {
    IERC721 private _verifierToken;

    constructor(
        address a_
    ) SoulValidatorBase() interfaceGuard(a_, type(IERC721).interfaceId) {
        _verifierToken = IERC721(a_);
    }

    modifier interfaceGuard(address account, bytes4 interfaceId) {
        // address must be a valid validator interface
        require(
            ERC165Checker.supportsInterface(account, interfaceId),
            SoulValidatorErrorCodes.InvalidInterface
        );
        _;
    }

    /**
     * @dev Set `_verifierToken`
     *
     * Requirements:
     *
     * - the caller must be the owner.
     */
    function setVerifierToken(
        address a_
    ) external onlyOwner interfaceGuard(a_, type(IERC721).interfaceId) {
        _verifierToken = IERC721(a_);
    }

    /**
     * @dev Returns the verifier token address
     */
    function verifierToken() external view returns (address) {
        return address(_verifierToken);
    }

    /**
     * @dev Return true if the signer is a validator, and false otherwise
     */
    function checkVerifier(address signer_) external view returns (bool) {
        return _verifierToken.balanceOf(signer_) > 0;
    }
}
