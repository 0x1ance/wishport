// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";
import "./ISoul.sol";
import "./validator/ISoulValidator.sol";
import "./lib/SoulErrorCodes.sol";
import "../utils/SignatureHelper.sol";

// implementation of Vitalik Buterin's SBT whitepaper at https://papers.ssrn.com/sol3/papers.cfm?abstract_id=4105763

contract SoulBase is ISoul, ERC165, Ownable {
    // soul name
    string public _name;
    // binded soul of each address
    mapping(address => uint256) internal _souls;
    // all binded address of each soul
    mapping(uint256 => SoulProfile) internal _soulProfiles;

    // soul validator (swappable)
    ISoulValidator internal _validator;

    // action verifier
    mapping(address => uint256) internal _nonces; // all the nonces consumed by each address

    uint256 internal constant NULL_SOUL = 0;

    event Bind(address indexed a_, uint256 indexed soul_);
    event Bind(
        address indexed a_,
        uint256 indexed soul_,
        uint256 nonce_,
        address indexed signer
    );
    event Unbind(address indexed a_, uint256 indexed soul_);
    event Unbind(
        address indexed a_,
        uint256 indexed soul_,
        uint256 nonce_,
        address indexed signer
    );
    event SetValidator(address validator_);

    constructor(
        string memory soulName_,
        address validator_
    ) interfaceGuard(validator_, type(ISoulValidator).interfaceId) {
        _name = soulName_;
        _validator = ISoulValidator(validator_);
    }

    modifier interfaceGuard(address account_, bytes4 interfaceId_) {
        // address must be a valid validator interface
        require(
            ERC165Checker.supportsInterface(account_, interfaceId_),
            SoulErrorCodes.InvalidInterface
        );
        _;
    }

    /**
     * @dev Returns true if the signature is signed by a validator, and false otherwise.
     */
    modifier signatureGuard(
        string memory methodIdentifier_,
        address a_,
        uint256 soul_,
        uint256 nonce_,
        bytes memory sig_,
        address signer_
    ) {
        require(checkVerifier(signer_), SoulErrorCodes.InvalidSigner);
        require(currentNonce(a_) == nonce_, SoulErrorCodes.InvalidNonce);

        bytes32 msgHash = SignatureHelper.prefixed(
            keccak256(
                abi.encodePacked(
                    methodIdentifier_,
                    address(this),
                    a_,
                    soul_,
                    nonce_
                )
            )
        );

        require(
            SignatureHelper.recoverSigner(msgHash, sig_) == signer_,
            SoulErrorCodes.InvalidSignature
        );

        _;

        _nonces[a_] += 1;
    }

    /**
     * @dev return the currentNonce of an address
     *
     */
    function currentNonce(address a_) public view returns (uint256) {
        return _nonces[a_];
    }

    /**
     * @dev Returns true if the address is soul verifier, and false otherwise.
     */
    function checkVerifier(address a_) public view returns (bool) {
        return _validator.checkVerifier(a_);
    }

    /**
     * @dev Returns the soul validator address
     */
    function validator() external view returns (address) {
        return address(_validator);
    }

    /**
     * @dev Set the soul validator
     *
     * Requirements:
     *
     * - caller must be the owner
     */
    function setValidator(
        address validator_
    )
        external
        onlyOwner
        interfaceGuard(validator_, type(ISoulValidator).interfaceId)
    {
        _validator = ISoulValidator(validator_);
        emit SetValidator(validator_);
    }

    /**
     * @dev Returns the soul of the address.
     */
    function soul(address a_) public view returns (uint256) {
        return _souls[a_];
    }

    /**
     * @dev Returns all the bounded address of a soul
     */
    function soulMembers(
        uint256 soul_
    ) external view returns (address[] memory) {
        SoulProfile storage soulProfile = _soulProfiles[soul_];

        address[] memory members = new address[](soulProfile.count);

        for (uint256 i = 0; i < soulProfile.count; i++) {
            members[i] = soulProfile.members[i];
        }

        return members;
    }

    /**
     * @dev Returns true if two address are bounded to the same soul, and false otherwise.
     *
     * Requirements:
     *
     * - if addresses are either empty, return false
     * - if addresses are neither binded, return false
     */
    function checkSameSoul(address a1_, address a2_) public view returns (bool) {
        return
            (a1_ != address(0)) &&
            (_souls[a1_] != 0) &&
            (_souls[a1_] == _souls[a2_]);
    }

    /**
     * @dev Core logic of binding a soul
     *
     * Requirements:
     *
     * - the soul_ must not be a null soul (0)
     * - the address must not be binded to any soul
     */
    function _bindSoulLogic(address a_, uint256 soul_) private {
        require(soul_ != NULL_SOUL, SoulErrorCodes.InvalidSoul);
        require(_souls[a_] == NULL_SOUL, SoulErrorCodes.Unauthorized);
        // update binded soul of target address
        _souls[a_] = soul_;
        // update profile of target soul
        SoulProfile storage soulProfile = _soulProfiles[soul_];
        soulProfile.members[soulProfile.count] = a_;
        soulProfile.count += 1;
    }

    /**
     * @dev Bind an address to a soul, update soulProfile
     *
     * Requirements:
     *
     * - the caller must be either owner or verifier.
     */
    function bind(address a_, uint256 soul_) external {
        require(_msgSender() == owner() || checkVerifier(_msgSender()));
        _bindSoulLogic(a_, soul_);
        emit Bind(a_, soul_);
    }

    /**
     * @dev Bind an address to a soul, validate action by verified signature
     *
     * Requirements:
     *
     * - the signature must pass validation of soul validator
     */
    function bind(
        address a_,
        uint256 soul_,
        uint256 nonce_,
        bytes memory sig_,
        address signer_
    )
        external
        signatureGuard(
            "bind(address,uint256,uint256,bytes,address)",
            a_,
            soul_,
            nonce_,
            sig_,
            signer_
        )
    {
        _bindSoulLogic(a_, soul_);
        emit Bind(a_, soul_, nonce_, signer_);
    }

    /**
     * @dev Core logic of unbind a soul
     *
     * Requirements:
     *
     * - the soul_ must not be a null soul (0)
     * - the address must be binded to the target _soul
     */
    function _unbindSoulLogic(address a_, uint256 soul_) private {
        require(soul_ != NULL_SOUL, SoulErrorCodes.InvalidSoul);
        require(_souls[a_] == soul_, SoulErrorCodes.Unauthorized);

        // assign null soul (0) to target address
        _souls[a_] = NULL_SOUL;
        // update profile of target soul, remove address from the member mapping, update member count
        SoulProfile storage soulProfile = _soulProfiles[soul_];
        uint256 memberIdx;
        for (uint256 i = 0; i < soulProfile.count; i++) {
            if (soulProfile.members[i] == a_) {
                memberIdx = i;
                break;
            }
        }
        if (memberIdx != (soulProfile.count - 1)) {
            soulProfile.members[memberIdx] = soulProfile.members[
                soulProfile.count - 1
            ];
        }
        delete soulProfile.members[soulProfile.count - 1];
        soulProfile.count -= 1;
    }

    /**
     * @dev Unbind an address from a soul, update soulProfile
     *
     * Requirements:
     *
     * - the caller must be either owner or verifier.
     */
    function unbind(address a_, uint256 soul_) external {
        require(_msgSender() == owner() || checkVerifier(_msgSender()));
        _unbindSoulLogic(a_, soul_);
        emit Unbind(a_, soul_);
    }

    /**
     * @dev Unbind an address from a soul, update soulProfile, validate action by verified signature
     *
     * Requirements:
     *
     * - the signature must pass validation of soul validator
     */
    function unbind(
        address a_,
        uint256 soul_,
        uint256 nonce_,
        bytes memory sig_,
        address signer_
    )
        external
        signatureGuard(
            "unbind(address,uint256,uint256,bytes,address)",
            a_,
            soul_,
            nonce_,
            sig_,
            signer_
        )
    {
        _unbindSoulLogic(a_, soul_);
        emit Unbind(a_, soul_, nonce_, signer_);
    }

    /**
     * @dev See {IERC165-supportsInterface}.
     */
    function supportsInterface(
        bytes4 interfaceId_
    ) public view virtual override(ERC165, IERC165) returns (bool) {
        return
            interfaceId_ == type(ISoul).interfaceId ||
            super.supportsInterface(interfaceId_);
    }
}
