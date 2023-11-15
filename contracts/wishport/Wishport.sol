// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/access/Ownable.sol";

import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/Nonces.sol";
import "@openzeppelin/contracts/metatx/ERC2771Context.sol";
import "abdk-libraries-solidity/ABDKMathQuad.sol";
import "@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC721Errors} from "@openzeppelin/contracts/interfaces/draft-IERC6093.sol";
import {TokenRecovery} from "../utils/TokenRecovery.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../wish/IWish.sol";
import "./IWishport.sol";

/**
 * @title Wishport Contract
 * @dev The contract handles the listing, unlisting, and fulfillment of wishes.
 * Wishes are represented as ERC721 tokens, which can be minted, listed, unlisted, and fulfilled.
 * The contract uses multiple inheritances, ERC2771Context, Ownable, Nonces, TokenRecovery, IWishport, ReentrancyGuard.
 * The contract also uses multiple libraries, SafeERC20, Address, MessageHashUtils.
 */
contract Wishport is
    ERC2771Context,
    Ownable,
    Nonces,
    TokenRecovery,
    IWishport,
    ReentrancyGuard
{
    using SafeERC20 for IERC20;
    using Address for address;
    using MessageHashUtils for bytes32;

    IWish public immutable WISH;
    uint256 public constant BASE_PORTION = 1_000_000;

    address public authedSigner;
    address private _trustedForwarder;

    mapping(uint256 => Wish) public wishes;

    /**
     * @dev Constructs the `Wishport` contract.
     * @param wish The address of the `IWish` contract.
     * @param authedSigner_ The address of the authorized signer.
     * @param trustedForwarder_ The address of the trusted forwarder.
     */
    constructor(
        address wish,
        address authedSigner_,
        address trustedForwarder_
    ) ERC2771Context(trustedForwarder_) Ownable(_msgSender()) {
        if (wish == address(0)) {
            revert InvalidAddress(wish);
        }
        WISH = IWish(wish);
        _setAuthedSigner(authedSigner_);
        _setTrustedForwarder(trustedForwarder_);
    }

    /**
     * @dev Calculates the portion of an amount.
     * @param amount The total amount.
     * @param portion The portion out of BASE_PORTION.
     * @return portionAmount The calculated portion of the amount.
     */
    function _calculatePortion(
        uint256 amount,
        uint256 portion
    ) internal pure returns (uint256 portionAmount) {
        if (portion > BASE_PORTION) {
            revert InvalidPortion(portion);
        }
        portionAmount = ABDKMathQuad.toUInt(
            ABDKMathQuad.div(
                ABDKMathQuad.mul(
                    ABDKMathQuad.fromUInt(amount),
                    ABDKMathQuad.fromUInt(portion)
                ),
                ABDKMathQuad.fromUInt(BASE_PORTION)
            )
        );
    }

    /**
     * @dev Checks the validity of a signature.
     * @param signer The signer's address.
     * @param hash_ The hash of the signed message.
     * @param signature The signature.
     * @param deadline The deadline of the signature.
     */
    function _checkSignature(
        address signer,
        bytes32 hash_,
        bytes calldata signature,
        uint256 deadline
    ) internal view virtual {
        if (!SignatureChecker.isValidSignatureNow(signer, hash_, signature)) {
            revert InvalidSigner();
        }
        if (deadline < block.timestamp) {
            revert ExpiredSignature(deadline);
        }
    }

    /**
     * @dev Transfers an asset.
     * @param to The recipient's address.
     * @param asset The asset's contract address.
     * @param amount The amount to transfer.
     */
    function _transferAsset(
        address to,
        address asset,
        uint256 amount
    ) internal {
        if (amount > 0) {
            if (asset == address(0)) {
                payable(to).transfer(amount);
            } else {
                IERC20(asset).safeTransfer(to, amount);
            }
        }
    }

    /**
     * @dev Returns the trusted forwarder's address.
     * @return The address of the trusted forwarder.
     */
    function trustedForwarder() public view virtual override returns (address) {
        return _trustedForwarder;
    }

    /**
     * @dev Sets the trusted forwarder.
     * @param trustedForwarder_ The address of the new trusted forwarder.
     */
    function _setTrustedForwarder(address trustedForwarder_) internal {
        if (trustedForwarder_ == address(0)) {
            revert InvalidAddress(trustedForwarder_);
        }
        _trustedForwarder = trustedForwarder_;
    }

    /**
     * @dev Sets the trusted forwarder. Only the contract owner can call this.
     * @param trustedForwarder_ The address of the new trusted forwarder.
     */
    function setTrustedForwarder(address trustedForwarder_) external onlyOwner {
        _setTrustedForwarder(trustedForwarder_);
    }

    /**
     * @dev Sets the authorized signer.
     * @param authedSigner_ The address of the new authorized signer.
     */
    function _setAuthedSigner(address authedSigner_) internal {
        if (authedSigner_ == address(0)) {
            revert InvalidAddress(authedSigner_);
        }
        authedSigner = authedSigner_;
    }

    /**
     * @dev Sets the authorized signer. Only the contract owner can call this.
     * @param authedSigner_ The address of the new authorized signer.
     */
    function setAuthedSigner(address authedSigner_) external onlyOwner {
        _setAuthedSigner(authedSigner_);
    }

    function list(
        uint256 tokenId,
        address reward,
        uint256 amount_,
        uint256 deadline,
        bytes calldata signature
    ) external payable nonReentrant {
        address operator = _msgSender();
        _checkSignature(
            authedSigner,
            keccak256(
                abi.encodePacked(
                    block.chainid,
                    address(this),
                    IWishport.list.selector,
                    operator,
                    deadline,
                    tokenId,
                    reward,
                    amount_,
                    nonces(operator)
                )
            ).toEthSignedMessageHash(),
            signature,
            deadline
        );

        // consume user nonce
        _useNonce(operator);

        uint256 amount;
        if (reward == address(0)) {
            if (msg.value < amount_) {
                revert InsufficientEther(msg.value);
            }
            amount = amount_;
        } else {
            IERC20 token = IERC20(reward);
            uint256 balanceBefore = token.balanceOf(address(this));

            token.safeTransferFrom(operator, address(this), amount_);
            uint256 balanceAfter = token.balanceOf(address(this));
            if (balanceAfter < balanceBefore) {
                revert SafeERC20.SafeERC20FailedOperation(reward);
            }
            amount = balanceAfter - balanceBefore;
        }

        // save wish info
        Wish storage wish = wishes[tokenId];
        wish.reward = reward;
        wish.amount = amount;

        emit Listed(tokenId, operator, reward, amount);

        // mint the wish
        if (WISH.mint(operator, tokenId) != IWish.mint.selector) {
            revert FailedWishOperation(tokenId);
        }
    }

    function unlist(
        uint256 tokenId,
        uint256 feePortion,
        uint256 deadline,
        bytes calldata signature
    ) external nonReentrant {
        address operator = _msgSender();
        _checkSignature(
            authedSigner,
            keccak256(
                abi.encodePacked(
                    block.chainid,
                    address(this),
                    IWishport.unlist.selector,
                    operator,
                    deadline,
                    tokenId,
                    feePortion,
                    nonces(operator)
                )
            ).toEthSignedMessageHash(),
            signature,
            deadline
        );

        // only creator can unlist
        if (operator != WISH.ownerOf(tokenId)) {
            revert IERC721Errors.ERC721InvalidOwner(operator);
        }

        // consume user nonce
        _useNonce(operator);

        // remove the wish record
        Wish storage wish = wishes[tokenId];
        address reward = wish.reward;
        uint256 fee = _calculatePortion(wish.amount, feePortion);
        uint256 refund = wish.amount - fee;
        delete wishes[tokenId];

        // emit the unlist event
        emit Unlisted(tokenId, operator, reward, refund, fee);

        // burn the wish
        // if the token is completed, the burn should revert
        if (WISH.burn(tokenId) != IWish.burn.selector) {
            revert FailedWishOperation(tokenId);
        }

        // transfer the fee to the contract owner
        _transferAsset(owner(), reward, fee);
        // transfer the refund to the creator
        _transferAsset(operator, reward, refund);
    }

    function fulfill(
        uint256 tokenId,
        address fulfiller,
        uint256 refundPortion,
        uint256 feePortion,
        uint256 deadline,
        bytes calldata signature
    ) external nonReentrant {
        address operator = _msgSender();
        _checkSignature(
            authedSigner,
            keccak256(
                abi.encodePacked(
                    block.chainid,
                    address(this),
                    IWishport.fulfill.selector,
                    operator,
                    deadline,
                    tokenId,
                    fulfiller,
                    refundPortion,
                    feePortion,
                    nonces(operator)
                )
            ).toEthSignedMessageHash(),
            signature,
            deadline
        );

        if (fulfiller == address(0)) {
            revert InvalidAddress(fulfiller);
        }

        // only owner & fulfiller can access the function
        address creator = WISH.ownerOf(tokenId);
        if (operator != creator && operator != fulfiller) {
            revert UnauthorizedAccess(operator);
        }

        // consume user nonce
        _useNonce(operator);

        // calculate the fee and net reward amount
        Wish storage wish = wishes[tokenId];
        uint256 fee = _calculatePortion(wish.amount, feePortion);
        uint256 refund = _calculatePortion(wish.amount - fee, refundPortion);

        // emit the fulfill event
        emit Fulfilled(
            tokenId,
            fulfiller,
            wish.reward,
            wish.amount - fee - refund,
            refund,
            fee
        );

        // complete the token
        // should throw error if fulfiller is the creator
        if (WISH.complete(fulfiller, tokenId) != IWish.complete.selector) {
            revert FailedWishOperation(tokenId);
        }

        // transfer the fee to the contract owner
        _transferAsset(owner(), wish.reward, fee);
        // transfer the refund to the creator
        _transferAsset(creator, wish.reward, refund);
        // transfer the netAmount to the fulfiller
        _transferAsset(fulfiller, wish.reward, wish.amount - fee - refund);
    }

    function _msgSender()
        internal
        view
        override(Context, ERC2771Context)
        returns (address sender)
    {
        return ERC2771Context._msgSender();
    }

    function _msgData()
        internal
        view
        override(Context, ERC2771Context)
        returns (bytes calldata data)
    {
        data = ERC2771Context._msgData();
    }

    receive() external payable {}

    fallback() external payable {}
}
