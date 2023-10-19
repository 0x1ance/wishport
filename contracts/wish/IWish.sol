// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/**
 * @dev [Author:0x1ance] Required interface for Wish contract
 */
interface IWish {
    /// @notice Event emitted when a token is completed
    event Completed(uint256 indexed tokenId, address indexed fulfiller);

    /// @dev Error to show when the sender is not authorized
    error WishUnauthorized(address sender);

    /// @dev Error to show when the address is invalid
    error WishInvalidAddress(address account);

    /// @dev Error to show when the token ID is invalid
    error WishInvalidToken(uint256 tokenId);

    /// @dev Error to show when the token is already completed
    error WishAlreadyCompleted(uint256 tokenId);

    /// @dev Error to show when the function is disabled
    error WishFunctionDisabled();

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
