// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {TokenRecovery} from "../utils/TokenRecovery.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {IWish} from "./IWish.sol";

/**
 * @title Wish Contract
 * @dev Contract for managing ERC721 tokens with additional features.
 * Implements the {ERC721}, {Ownable}, {AccessControl}, and {TokenRecovery} contracts.
 */
contract Wish is ERC721, Ownable, AccessControl, TokenRecovery, IWish {
    using Strings for uint256;

    /// @dev URI for the contract metadata (for OPENSEA)
    string public contractURI;

    /// @dev Base URI of the ERC721 token metadata
    string public baseURI;

    /// @dev Mapping from tokenId to completion status, true is completed
    mapping(uint256 => bool) internal _completions;

    /// @dev Role for admin users
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes4 public constant MINT_SELECTOR = IWish.mint.selector;
    bytes4 public constant BURN_SELECTOR = IWish.burn.selector;
    bytes4 public constant COMPLETE_SELECTOR = IWish.complete.selector;
    bytes4 private constant SAFE_TRANSFER_FROM_SELECTOR =
        bytes4(
            keccak256(bytes("safeTransferFrom(address,address,uint256,bytes)"))
        );

    /**
     * @dev Initializes the contract by setting the metadata URIs, the initial admin, and granting roles.
     * @dev Set the contract metadata uri
     * @dev Set the contract base uri
     * @dev Setup default admin role
     * @dev Set the contract manager
     *
     * Requirements:
     *
     * - The initial admin addres cannot be the zero address
     *
     * @param name_ The name of the ERC721 token
     * @param symbol_ The symbol of the ERC721 token
     * @param contractURI_ The contract metadata URI
     * @param uri The base URI of the ERC721 token metadata
     */
    constructor(
        string memory name_,
        string memory symbol_,
        string memory contractURI_,
        string memory uri
    ) ERC721(name_, symbol_) Ownable(_msgSender()) {
        contractURI = contractURI_;
        baseURI = uri;
        _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());
    }

    /**
     * @dev Decomposes the token ID into the original token ID and the owner address.
     * @param tokenId The token ID to decompose
     * @return decomposedTokenId The original token ID
     * @return owner The owner's address
     */
    function _decomposeTokenId(
        uint256 tokenId
    ) internal view returns (uint256 decomposedTokenId, address owner) {
        if (tokenId > 2 ** 96) {
            decomposedTokenId = tokenId & ((1 << 96) - 1);
            owner = super._ownerOf(decomposedTokenId);
            if (owner == address(0)) {
                owner = address(uint160(uint256(tokenId >> 96)));
            }
        } else {
            decomposedTokenId = tokenId;
            owner = super._ownerOf(decomposedTokenId);
        }
    }

    /**
     * @dev Sets the contract metadata Uniform Resource Identifier (URI)
     *
     * Requirements:
     *xr
     * - Only owner can set the contractURI
     *
     * @param uri The new URI to set
     */
    function setContractURI(string memory uri) external onlyOwner {
        contractURI = uri;
    }

    /**
     * @dev Sets the base URI for all token IDs. It is automatically added as a prefix to the value returned
     * in {tokenURI}, or to the token ID if {tokenURI} is empty.
     *
     * Requirements:
     *
     * - Only owner can set the baseURI
     *
     * @param uri The base URI to set
     */
    function setBaseURI(string memory uri) external onlyOwner {
        baseURI = uri;
    }

    /**
     * @dev Base URI for computing {tokenURI}. If set, the resulting URI for each
     * @dev token will be the concatenation of the `baseURI` and the `tokenId`. Empty
     * @dev by default, can be overridden in child contracts.
     * @return {BaseURI}
     */
    function _baseURI() internal view virtual override returns (string memory) {
        return baseURI;
    }

    /**
     * @dev Returns the Uniform Resource Identifier (URI) for `tokenId` token.
     * @param tokenId The token ID to get the URI of
     * @return The URI of the token
     */
    function tokenURI(
        uint256 tokenId
    ) public view virtual override(ERC721) returns (string memory) {
        (uint256 decomposedTokenId, address owner) = _decomposeTokenId(tokenId);

        if (owner == address(0)) {
            revert ERC721NonexistentToken(decomposedTokenId);
        }

        string memory uri = _baseURI();
        return
            bytes(uri).length > 0
                ? string.concat(uri, decomposedTokenId.toString())
                : "";
    }

    /**
     * @dev Overridden version of ownerOf from ERC721. Decomposes the token ID to return the correct owner.
     * @param tokenId The token ID to get the owner of
     * @return owner The owner of the token
     */
    function ownerOf(
        uint256 tokenId
    ) public view virtual override(ERC721, IWish) returns (address owner) {
        (, owner) = _decomposeTokenId(tokenId);
    }

    /**
     * @dev Mint the token and returns the function selector if successful.
     *
     * Requirements:
     *
     * - Only admin can mint
     *
     * @param to The address to mint the token to
     * @param tokenId The token ID to mint
     * @return bytes4 The function selector if successful
     */
    function mint(
        address to,
        uint256 tokenId
    ) external virtual onlyRole(ADMIN_ROLE) returns (bytes4) {
        (uint256 decomposedTokenId, address pseudoOwner) = _decomposeTokenId(
            tokenId
        );
        _mint(to == address(0) ? pseudoOwner : to, decomposedTokenId);
        return MINT_SELECTOR;
    }

    /**
     * @dev Completes the token by transferring it to the fulfiller.
     * @param fulfiller The address of the fulfiller
     * @param tokenId The token ID to complete
     */
    function _complete(address fulfiller, uint256 tokenId) internal {
        address from = super._ownerOf(tokenId);

        if (_completions[tokenId]) {
            revert AlreadyCompleted(tokenId);
        }

        if (fulfiller == from) {
            revert InvalidAddress(fulfiller);
        }

        _completions[tokenId] = true;
        _transfer(from, fulfiller, tokenId);

        emit Completed(tokenId, fulfiller);
    }

    /**
     * @dev Completes a token by transferring it to the fulfiller and returns the function selector if successful.
     *
     *
     * Requirements:
     *
     * - Only admin can call the complete function
     *
     * @param fulfiller The address of the fulfiller
     * @param tokenId The token ID to complete
     * @return bytes4 The function selector if successful
     */
    function complete(
        address fulfiller,
        uint256 tokenId
    ) external virtual onlyRole(ADMIN_ROLE) returns (bytes4) {
        (uint256 decomposedTokenId, ) = _decomposeTokenId(tokenId);
        _complete(fulfiller, decomposedTokenId);
        return COMPLETE_SELECTOR;
    }

    /**
     * @dev Returns the completion status of the token.
     * @param tokenId The token ID to get the completion status of
     * @return The completion status of the token
     */
    function completions(uint256 tokenId) external view returns (bool) {
        (uint256 decomposedTokenId, ) = _decomposeTokenId(tokenId);
        return _completions[decomposedTokenId];
    }

    /**
     * @dev Burns `tokenId` and returns the function selector if successful.
     *
     * Requirements:
     *
     * - Only admin can burn
     * - Only non completed token can be burned
     *
     * @param tokenId The token ID to burn
     * @return bytes4 The function selector if successful
     */
    function burn(
        uint256 tokenId
    ) external virtual onlyRole(ADMIN_ROLE) returns (bytes4) {
        (uint256 decomposedTokenId, ) = _decomposeTokenId(tokenId);
        if (_completions[decomposedTokenId]) {
            revert AlreadyCompleted(decomposedTokenId);
        }
        _burn(decomposedTokenId);
        return BURN_SELECTOR;
    }

    /**
     * @dev Approves another address to transfer the given token ID.
     * This function is disabled for this contract.
     */
    function approve(address, uint256) public virtual override(ERC721) {
        revert FunctionDisabled(IERC721.approve.selector);
    }

    /**
     * @dev Gets the approved address for a token ID, or zero if no address set.
     * @return The address currently approved for the given token ID
     */
    function getApproved(
        uint256
    ) public view virtual override(ERC721) returns (address) {
        return address(0);
    }

    /**
     * @dev Sets or unsets the approval of a given operator.
     * This function is disabled for this contract.
     */
    function setApprovalForAll(address, bool) public virtual override(ERC721) {
        revert FunctionDisabled(IERC721.setApprovalForAll.selector);
    }

    /**
     * @dev Tells whether an operator is approved by a given owner.
     * @return A boolean value representing whether the given operator is approved by the given owner
     */
    function isApprovedForAll(
        address,
        address
    ) public view virtual override(ERC721) returns (bool) {
        return false;
    }

    /**
     * @dev Transfers the ownership of a given token ID to another address.
     * This function is disabled for this contract.
     */
    function transferFrom(
        address,
        address,
        uint256
    ) public virtual override(ERC721) {
        revert FunctionDisabled(IERC721.transferFrom.selector);
    }

    /**
     * @dev Safely transfers the ownership of a given token ID to another address.
     * This function is disabled for this contract.
     */
    function safeTransferFrom(
        address,
        address,
        uint256,
        bytes memory
    ) public virtual override(ERC721) {
        revert FunctionDisabled(SAFE_TRANSFER_FROM_SELECTOR);
    }

    /**
     * @dev Indicates whether the contract implements an interface.
     * @param interfaceId The interface identifier, as specified in ERC-165
     * @return A boolean value that indicates whether the contract implements `interfaceId`
     */
    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(ERC721, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    receive() external payable {}

    fallback() external payable {}
}
