// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import '@openzeppelin/contracts/token/ERC721/IERC721.sol';
import '../SoulValidatorBase.sol';

contract SoulValidator is SoulValidatorBase {
  mapping(address => bool) private _verifiers;

  constructor(address a_) SoulValidatorBase() {
    // initiate verifier
    _verifiers[a_] = true;
  }

  /**
   * @dev Set `_verifier`
   *
   * Requirements:
   *
   * - the caller must be the owner.
   */
  function setVerifier(address a_, bool status_) external onlyOwner {
    _verifiers[a_] = status_;
  }

  /**
   * @dev Returns true is the signer is a validator, and false otherwise.
   */
  function checkVerifier(address signer_) external view returns (bool) {
    return _verifiers[signer_];
  }
}
