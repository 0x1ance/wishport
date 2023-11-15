// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @dev [Author:0x1ance] Required interface for Wish contract
 */
interface IWish {
    /// @notice Event emitted when a token is completed
    event Completed(uint256 indexed tokenId, address indexed fulfiller);

    /// @dev Error to show when the address is invalid
    error InvalidAddress(address account);

    /// @dev Error to show when the token is already completed
    error AlreadyCompleted(uint256 tokenId);

    /// @dev Error to show when the function is disabled
    error FunctionDisabled(bytes4 selector);

    /**
     * @dev Returns the owner of the `tokenId` token.
     *
     * Requirements:
     *
     * - `tokenId` must exist.
     */
    function ownerOf(uint256 tokenId) external view returns (address owner);

    /**
     * @dev Returns the completion status of the token.
     * @param tokenId The token ID to get the completion status of
     * @return The completion status of the token
     */
    function completions(uint256 tokenId) external view returns (bool);

    /**
     * @dev Mint the token and returns the function selector if successful.
     * @param to_ The address to mint the token to
     * @param tokenId_ The token ID to mint
     * @return bytes4 The function selector if successful
     */
    function mint(address to_, uint256 tokenId_) external returns (bytes4);

    /**
     * @dev Burns `tokenId` and returns the function selector if successful.
     * @param tokenId_ The token ID to burn
     * @return bytes4 The function selector if successful
     */
    function burn(uint256 tokenId_) external returns (bytes4);

    /**
     * @dev Completes a token by transferring it to the fulfiller and returns the function selector if successful.
     * @param fulfiller_ The address of the fulfiller
     * @param tokenId_ The token ID to complete
     * @return bytes4 The function selector if successful
     */
    function complete(
        address fulfiller_,
        uint256 tokenId_
    ) external returns (bytes4);
}
