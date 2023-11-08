// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IWishport {
    /// @notice The struct of wish
    struct Wish {
        address reward;
        uint256 amount;
    }

    event Listed(
        uint256 indexed tokenId,
        address indexed creator,
        address indexed reward,
        uint256 amount
    );
    event Unlisted(
        uint256 indexed tokenId,
        address indexed creator,
        address indexed reward,
        uint256 refund,
        uint256 fee
    );
    event Fulfilled(
        uint256 indexed tokenId,
        address indexed fulfiller,
        address indexed reward,
        uint256 netAmount,
        uint256 refund,
        uint256 fee
    );

    /// @dev Error to show when the address is invalid
    error InvalidAddress(address account);
    /// @dev Error to show when the portion is invalid
    error InvalidPortion(uint256 portion);
    /// @dev Error to show when the signer is invalid
    error InvalidSigner();
    error InsufficientEther(uint256 amount);
    error FailedWishOperation(uint256 tokenId);
    error ExpiredSignature(uint256 deadline);
    error UnauthorizedAccess(address account);

    function list(
        uint256 tokenId,
        address reward,
        uint256 amount,
        uint256 deadline,
        bytes calldata signature
    ) external payable;

    function unlist(
        uint256 tokenId,
        uint256 chargePortion,
        uint256 deadline,
        bytes calldata signature
    ) external;

    function fulfill(
        uint256 tokenId,
        address fulfiller,
        uint256 refundPortion,
        uint256 feePortion,
        uint256 deadline,
        bytes calldata signature
    ) external;
}
