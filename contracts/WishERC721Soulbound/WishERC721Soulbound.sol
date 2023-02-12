// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Pausable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@dyut6/soulbound/contracts/sbt/ERC721Soulbound/ERC721Soulbound.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "./IWishERC721Soulbound.sol";

library WishERC721SoulboundError {
    string constant SetTransferableError =
        "WishERC721Soulbound:SetTransferableError";
    string constant UnauthorizedError = "WishERC721Soulbound:Unauthorized";
}

// conditional soul bound
contract WishERC721Soulbound is
    ERC721Soulbound,
    ERC721Pausable,
    ERC721Enumerable,
    IWishERC721Soulbound
{
    // ─── Events ──────────────────────────────────────────────────────────────────

    event Mint(address indexed to_, uint256 indexed tokenId_);
    event Burn(uint256 indexed tokenId_);
    event SetTransferable(uint256 indexed tokenId_, bool status);

    // ─────────────────────────────────────────────────────────────────────────────
    // ─── Metadata ────────────────────────────────────────────────────────

    string private _uri; // baseURI of the ERC721 metadata
    address _wishport; // address of the wishport controller

    // ─────────────────────────────────────────────────────────────────────
    // ─── Variables ───────────────────────────────────────────────────────────────

    /**
     *  Token Management
     */
    mapping(uint256 => bool) _transferable; // Mapping from tokenId to transferable status, if true then transferable
    mapping(address => uint256) _balanceOfTransferable; // Mapping from address to transferable token balance

    // ─────────────────────────────────────────────────────────────────────────────
    // ─── Constructor ─────────────────────────────────────────────────────────────

    /**
     * @param name_ The name of the ERC721Soulbound token
     * @param symbol_ The symbol of the ERC721Soulbound token
     * @param uri_ The initial baseURI of the ERC721 contract
     * @param soulhub_ The address of the initial soulhub contract this contract is subscribed to
     * * Operations:
     * * Initialize the _uri metadata
     */
    constructor(
        string memory name_,
        string memory symbol_,
        string memory uri_,
        address soulhub_
    ) ERC721Soulbound(name_, symbol_, soulhub_) {
        _uri = uri_;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // ─── Modifiers ───────────────────────────────────────────────────────

    /**
     * @dev [Metadata] Ensure the message sender is the wishport
     */
    modifier onlyWishport() {
        require(_msgSender() == _wishport);
        _;
    }

    // ─────────────────────────────────────────────────────────────────────
    // ─── Internal Functions ──────────────────────────────────────────────────────

    /**
     * @dev Base URI for computing {tokenURI}. If set, the resulting URI for each
     * @dev token will be the concatenation of the `baseURI` and the `tokenId`. Empty
     * @dev by default, can be overridden in child contracts.
     * @return {BaseURI}
     */
    function _baseURI() internal view virtual override returns (string memory) {
        return _uri;
    }

    function transferable(uint256 tokenId_) public view returns (bool) {
        return _transferable[tokenId_];
    }

    function _checkTokenTransferEligibility(
        address from_,
        address to_,
        uint256 tokenId_
    ) internal view virtual override returns (bool) {
        // if its minting || burning: must be soul verifier or owner
        if (from_ == address(0) || to_ == address(0)) {
            return (_msgSender() == _wishport);
        }

        // only allow not locked tokens to be transferred under same soul
        return transferable(tokenId_) && _checkSameSoul(from_, to_);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // ─── external Functions ────────────────────────────────────────────────

    function setBaseURI(string memory uri_) external onlyOwner {
        _uri = uri_;
    }

    /**
     * @dev Pause the contract
     *
     * Requirements:
     *
     * - caller must be the owner
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause the contract
     *
     * Requirements:
     *
     * - caller must be the owner
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    function balanceOfTransferable(address account_)
        public
        view
        returns (uint256)
    {
        return _balanceOfTransferable[account_];
    }

    /**
     * @dev Returns all the tokens owned by an address
     */
    function tokensOfOwner(address a_) public view returns (uint256[] memory) {
        uint256 ownerTokenCount = balanceOf(a_);

        uint256[] memory ownedTokens = new uint256[](ownerTokenCount);

        for (uint256 i = 0; i < ownerTokenCount; i++) {
            ownedTokens[i] = tokenOfOwnerByIndex(a_, i);
        }

        return ownedTokens;
    }

    /**
     * @dev Returns all the tokens owned by an address
     */
    function tokensOfOwner(address a_, bool transferable_)
        external
        view
        returns (uint256[] memory)
    {
        uint256 ownerTokenCount = balanceOf(a_);
        uint256 ownerTransferableTokenCount = balanceOfTransferable(a_);

        uint256[] memory ownedTokens = new uint256[](
            transferable_
                ? ownerTransferableTokenCount
                : ownerTokenCount - ownerTransferableTokenCount
        );

        for (uint256 i = 0; i < ownerTokenCount; i++) {
            if (transferable(ownedTokens[i]) == transferable_) {
                ownedTokens[i] = tokenOfOwnerByIndex(a_, i);
            }
        }

        return ownedTokens;
    }

    /**
     * @dev mint the token
     *
     * Requirements:
     *
     * - when the contract is not paused
     * - only owner or soul verifiers can mint to address
     */
    function mint(address to_, uint256 tokenId_)
        external
        whenNotPaused
        onlyWishport
        returns (bool)
    {
        _mint(to_, tokenId_);
        emit Mint(to_, tokenId_);
        return true;
    }

    /**
     * @dev burn the token
     *
     * Requirements:
     *
     * - when the contract is not paused
     * - only owner or soul verifiers can mint to address
     */
    function burn(uint256 tokenId_)
        external
        whenNotPaused
        onlyWishport
        returns (bool)
    {
        _burn(tokenId_);
        emit Burn(tokenId_);
        return true;
    }

    /**
     * @dev set the token transferablity
     *
     * Requirements:
     *
     * - only owner or soul verifiers can mint to address
     * - token has to be minted
     */
    function setTransferable(uint256 tokenId_, bool status_)
        external
        whenNotPaused
        onlyWishport
        returns (bool)
    {
        _requireMinted(tokenId_);
        require(
            _transferable[tokenId_] != status_,
            WishERC721SoulboundError.SetTransferableError
        );
        // if set true, increment the owner transferable balance
        // else decrement the owner transferable balance
        if (status_) {
            _balanceOfTransferable[ownerOf(tokenId_)] += 1;
        } else {
            _balanceOfTransferable[ownerOf(tokenId_)] -= 1;
        }
        _transferable[tokenId_] = status_;
        emit SetTransferable(tokenId_, status_);
        return true;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // ─── Inherited Functions ─────────────────────────────────────────────────────

    /**
     * @dev See {ERC721-_beforeTokenTransfer}
     */
    function _beforeTokenTransfer(
        address from_,
        address to_,
        uint256 tokenId_,
        uint256 batchSize_
    )
        internal
        virtual
        override(ERC721Pausable, ERC721Enumerable, ERC721Soulbound)
    {
        super._beforeTokenTransfer(from_, to_, tokenId_, batchSize_);
        // if token is transferable, update the transferable balance
        if (transferable(tokenId_)) {
            if (from_ != address(0)) {
                _balanceOfTransferable[from_] -= 1;
            }
            if (to_ != address(0)) {
                _balanceOfTransferable[to_] += 1;
            }
        }
    }

    /**
     * @dev See {IERC165-supportsInterface}
     */
    function supportsInterface(bytes4 interfaceId_)
        public
        view
        virtual
        override(IERC165, ERC721, ERC721Enumerable, ERC721Soulbound)
        returns (bool)
    {
        return
            interfaceId_ == type(IWishERC721Soulbound).interfaceId ||
            super.supportsInterface(interfaceId_);
    }

    // ─────────────────────────────────────────────────────────────────────
}
