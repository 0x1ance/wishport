// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";
import "../soul/ISoul.sol";
import "./ISoulBoundRegistry.sol";

library SoulBoundRegistryErrorCodes {
    string constant InvalidInterface = "SoulBoundRegistry:InvalidInterface";
    string constant NotOwnerOrSoulVerifier =
        "SoulBoundRegistry:CallerIsNotOwnerOrSoulVerifier";
}

contract SoulBoundRegistry is Ownable, ERC165, ISoulBoundRegistry {
    // soul
    ISoul private _boundSoul;

    event RegisterSoul(address soul_);

    constructor(address soul_) {
        _boundSoul = ISoul(soul_);
    }

    modifier onlyOwnerOrSoulVerifier() {
        require(
            _checkOwnerOrSoulVerifier(_msgSender()),
            SoulBoundRegistryErrorCodes.NotOwnerOrSoulVerifier
        );
        _;
    }

    modifier interfaceGuard(address account_, bytes4 interfaceId_) {
        // address must be a valid validator interface
        require(
            ERC165Checker.supportsInterface(account_, interfaceId_),
            SoulBoundRegistryErrorCodes.InvalidInterface
        );
        _;
    }

    /**
     * @dev Throws if the sender is not the owner.
     */
    function _checkOwnerOrSoulVerifier(address a_) internal view returns (bool) {
        return owner() == a_ || _checkSoulVerifier(a_);
    }

    /**
     * @dev Throws if the sender is not the owner.
     */
    function _checkSoulVerifier(address a_) internal view returns (bool) {
        return _boundSoul.checkVerifier(a_);
    }

    /**
     * @dev returns the soul index of an address
     */
    function _soulOf(address a_) internal view returns (uint256) {
        return _boundSoul.soul(a_);
    }

    /**
     * @dev returns whether two address share same soul index
     */
    function _checkSameSoul(
        address a_,
        address b_
    ) internal view returns (bool) {
        return _boundSoul.checkSameSoul(a_, b_);
    }

    /**
     * @dev returns the address of bounded soul
     */
    function boundSoul() external view returns (address) {
        return address(_boundSoul);
    }

    /**
     * @dev Bind a soul
     *
     * Requirements:
     *
     * - caller must be the owner
     */
    function bindSoul(
        address soul_
    ) external onlyOwner interfaceGuard(soul_, type(ISoul).interfaceId) {
        _boundSoul = ISoul(soul_);
    }

    /**
     * @dev See {IERC165-supportsInterface}.
     */
    function supportsInterface(
        bytes4 interfaceId_
    ) public view virtual override(ERC165, IERC165) returns (bool) {
        return
            interfaceId_ == type(ISoulBoundRegistry).interfaceId ||
            super.supportsInterface(interfaceId_);
    }
}
