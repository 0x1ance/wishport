// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "./IERC721SoulBound.sol";
import "../SoulBoundRegistry.sol";
import "../../soul/validator/ISoulValidator.sol";
import "./lib/ERC721SoulBoundErrorCodes.sol";

// import "hardhat/console.sol";

// conditional soul bound
abstract contract ERC721SoulBound is
    ERC721,
    SoulBoundRegistry,
    IERC721SoulBound
{
    // Mapping soul ID to token count
    mapping(uint256 => uint256) private _soulBalances;

    constructor(
        string memory name_,
        string memory symbol_,
        address soul_
    ) ERC721(name_, symbol_) SoulBoundRegistry(soul_) {}

    /**
     * @dev Check whether a token is eligible to transfer from address to address
     */
    function _checkTokenTransferEligibility(
        address from_,
        address to_,
        uint256 tokenId
    ) internal view virtual returns (bool);

    /**
     * @dev See {IERC721-balanceOf}.
     */
    function balanceOfSoul(
        uint256 soul_
    ) public view virtual returns (uint256) {
        return _soulBalances[soul_];
    }

    /**
     * @dev before every token transfer trigger
     *
     * Requirements:
     *
     * - must either mint or transfer between same soul if already completed
     */
    function _beforeTokenTransfer(
        address from_,
        address to_,
        uint256 tokenId_,
        uint256 batchSize_
    ) internal override(ERC721) {
        require(
            _checkTokenTransferEligibility(from_, to_, tokenId_),
            ERC721SoulBoundErrorCodes.Unauthorized
        );

        if (batchSize_ > 1) {
            if (from_ != address(0)) {
                _soulBalances[_soulOf(from_)] -= batchSize_;
            }
            if (to_ != address(0)) {
                _soulBalances[_soulOf(to_)] += batchSize_;
            }
        }
        super._beforeTokenTransfer(from_, to_, tokenId_, batchSize_);
    }

    function supportsInterface(
        bytes4 interfaceId_
    )
        public
        view
        virtual
        override(ERC721, IERC165, SoulBoundRegistry)
        returns (bool)
    {
        return
            interfaceId_ == type(IERC721SoulBound).interfaceId ||
            super.supportsInterface(interfaceId_);
    }
}
