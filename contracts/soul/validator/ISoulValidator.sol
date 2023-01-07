// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/utils/introspection/IERC165.sol";

interface ISoulValidator is IERC165 {
    /**
     * @dev Returns true if `signer` is a verifier, and false otherwise.
     */
    function checkVerifier(address signer_) external view returns (bool);
}
