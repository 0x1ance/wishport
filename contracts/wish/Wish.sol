// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@dyut6/soulbound/contracts/sbt/ERC721Soulbound/ERC721Soulbound.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "./IWish.sol";

library WishError {
    string constant SetCompletedError = "Wish:SetCompletedError";
    string constant UnauthorizedError = "Wish:Unauthorized";
    string constant InvalidAddress = "Wish:InvalidAddress";
}

// conditional soul bound
contract Wish is ERC721Soulbound, ERC721Enumerable, IWish {
    // ─── Events ──────────────────────────────────────────────────────────────────

    event SetCompleted(uint256 indexed tokenId_, bool status);

    // ─────────────────────────────────────────────────────────────────────────────
    // ─── Metadata ────────────────────────────────────────────────────────

    string private _contractURI; // uri for the contract metadata (for OPENSEA)
    string private _uri; // baseURI of the ERC721 token metadata
    address public manager; // address of the contract manager

    // ─────────────────────────────────────────────────────────────────────
    // ─── Variables ───────────────────────────────────────────────────────────────

    /**
     *  Token Management
     */

    mapping(uint256 => bool) public completed; // Mapping from tokenId to completed status, if true then completed

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
        string memory contractURI_,
        string memory uri_,
        address soulhub_,
        address manager_
    ) ERC721Soulbound(name_, symbol_, soulhub_) {
        require(manager_ != address(0), WishError.InvalidAddress);
        _contractURI = contractURI_;
        _uri = uri_;
        manager = manager_;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // ─── Modifiers ───────────────────────────────────────────────────────

    /**
     * @dev [Metadata] Ensure the message sender is the contract manager
     */
    modifier onlyManager() {
        require(_msgSender() == manager, WishError.UnauthorizedError);
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

    function contractURI() public view returns (string memory) {
        return _contractURI;
    }

    function _checkTokenTransferEligibility(
        address from_,
        address to_,
        uint256 tokenId_
    ) internal view virtual override returns (bool) {
        // if its minting || burning: must be manager
        if (from_ == address(0) || to_ == address(0)) {
            return (_msgSender() == manager);
        }

        // only allow not locked tokens to be transferred under same soul
        return completed[tokenId_] && _checkSameSoul(from_, to_);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // ─── external Functions ────────────────────────────────────────────────

    function balanceOfCompleted(
        address a_
    ) external view virtual returns (uint256) {
        uint256 ownerTokenCount = balanceOf(a_);

        uint256 count = 0;
        for (uint256 i = 0; i < ownerTokenCount; i++) {
            uint256 currentTokenId = tokenOfOwnerByIndex(a_, i);
            if (completed[currentTokenId]) {
                count++;
            }
        }
        return count;
    }

    function pureOwnerOf(
        uint256 tokenId_
    ) external view virtual returns (address) {
        return _ownerOf(tokenId_);
    }

    function setBaseURI(string memory uri_) external onlyOwner {
        _uri = uri_;
    }

    function setContractURI(string memory uri_) external onlyOwner {
        _contractURI = uri_;
    }

    function setManager(address manager_) external onlyOwner {
        manager = manager_;
    }

    /**
     * @dev Returns all the tokens owned by an address
     */
    function tokensOfOwner(
        address a_
    ) external view returns (uint256[] memory) {
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
    function tokensOfOwner(
        address a_,
        bool completed_
    ) external view returns (uint256[] memory) {
        uint256 ownerTokenCount = balanceOf(a_);

        uint256[] memory filtered = new uint256[](ownerTokenCount);

        uint256 targetCount = 0;
        for (uint256 i = 0; i < ownerTokenCount; i++) {
            uint256 currentTokenId = tokenOfOwnerByIndex(a_, i);
            if (completed[currentTokenId] == completed_) {
                filtered[targetCount++] = currentTokenId;
            }
        }

        uint256[] memory ownedTokens = new uint256[](targetCount);

        for (uint256 i = 0; i < targetCount; i++) {
            ownedTokens[i] = filtered[i];
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
    function mint(
        address to_,
        uint256 tokenId_
    ) external onlyManager returns (bool) {
        _mint(to_, tokenId_);
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
    function burn(uint256 tokenId_) external onlyManager returns (bool) {
        _burn(tokenId_);
        return true;
    }

    /**
     * @dev set the token completion state
     *
     * Requirements:
     *
     * - only owner or soul verifiers can mint to address
     * - token has to be minted
     */
    function setCompleted(
        uint256 tokenId_,
        bool status_
    ) external onlyManager returns (bool) {
        _requireMinted(tokenId_);
        require(completed[tokenId_] != status_, WishError.SetCompletedError);

        completed[tokenId_] = status_;
        emit SetCompleted(tokenId_, status_);
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
    ) internal virtual override(ERC721Enumerable, ERC721Soulbound) {
        super._beforeTokenTransfer(from_, to_, tokenId_, batchSize_);
    }

    /**
     * @dev See {IERC165-supportsInterface}
     */
    function supportsInterface(
        bytes4 interfaceId_
    )
        public
        view
        virtual
        override(ERC721Enumerable, ERC721Soulbound, IERC165)
        returns (bool)
    {
        return
            interfaceId_ == type(IWish).interfaceId ||
            super.supportsInterface(interfaceId_);
    }

    // ─────────────────────────────────────────────────────────────────────
}
