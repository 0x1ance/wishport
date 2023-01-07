// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/utils/introspection/IERC165.sol";

interface ISoulBoundRegistry is IERC165 {
    /**
     * @dev returns the address of bounded soul
     */
    function boundSoul() external view returns (address);

    /**
     * @dev Bind a soul
     *
     * Requirements:
     *
     * - caller must be the owner
     */
    function bindSoul(address soul_) external;
}
