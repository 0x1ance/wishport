// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;
pragma experimental ABIEncoderV2;

// access control
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "../wish/IWish.sol";
import "../wish/Wish.sol";

library WishportError {
    string constant ERC20TransferError = "Wishport:ERC20TransferError";
    string constant InvalidPortion = "Wishport:InvalidPortion";
    string constant InvalidAddress = "Wishport:InvalidAddress";
    string constant Unauthorized = "Wishport:Unauthorized";
    string constant InvalidSigner = "Wishport:InvalidSigner";
    string constant InvalidNonce = "Wishport:InvalidNonce";
    string constant SignatureExpired = "Wishport:SignatureExpired";
}

// WishStatusEnum
// INACTIVE: ownerof == address(0)
// OUTSTNADING: ownerof != address(0) && completed == FALSE
// COMPLETED: ownerof != address(0) && completed == TRUE
enum WishStatusEnum {
    INACTIVE,
    OUTSTANDING,
    COMPLETED
}

// minter: ownerof when ownerof != address(0)
struct WishRewardInfo {
    address token;
    uint256 amount;
}

// asset config
struct AssetConfig {
    // PLATFORM_FEE_PORTION: e.g. 250_000_000 for 25% in uint256 basis points (parts per 1_000_000_000)
    bool activated;
    uint256 MINIMUM_REWARD;
    uint256 PLATFORM_FEE_PORTION;
    uint256 DISPUTE_HANDLING_FEE_PORTION;
}

contract Wishport is Ownable {
    using SafeERC20 for IERC20;
    using Address for address;
    using ECDSA for bytes32;

    // ─── Metadata ────────────────────────────────────────────────────────

    IWish _wish; // wishToken

    // ─────────────────────────────────────────────────────────────────────────────
    // ─── Constants ───────────────────────────────────────────────────────

    uint256 public constant BASE_PORTION = 1_000_000_000; // Base Denominator for Portion Calculations

    // ─────────────────────────────────────────────────────────────────────────────
    // ─── Variables ───────────────────────────────────────────────────────────────

    /**
     * Access Right Management
     */
    address private _authedSigner;
    mapping(address => mapping(uint256 => bool)) public nonce; // Mapping from Account to Consumption Status of Each Nonce, True as the Nonce Has Been Consumed

    /**
     *  Assets Management
     */
    mapping(address => AssetConfig) private _assetConfig; // Mapping from asset address to Asset Config, address(0) as the Native Ether
    mapping(address => mapping(address => uint256)) public clamable; // Mapping from account address to (mapping from token address to account claimable balance, address(0) as native index)

    /**
     * Wish Related Information Management
     */
    mapping(uint256 => WishRewardInfo) public wishRewardInfo; // Mapping from Wish TokenId to Wish Reward Info

    // ─────────────────────────────────────────────────────────────────────────────
    // ─── Constructor ─────────────────────────────────────────────────────

    /**
     * @dev Initialize the smartcontract
     * @param nativeAssetConfig_ The asset configuration of the native ether of deployed chain
     * ! Requirements:
     * ! Input config_ must pass the validation of portConfigGuard
     * ! Input nativeAssetConfig_ must pass the validation of assetConfigGuard
     * * Operations:
     * * Initialize the _name metadata
     * * Initialize the _config metadata
     * * Initialize the _wishToken metadata
     * * Initialize the _assetConfig of address(0)
     * * Initialize the manager status of deployer
     */
    constructor(
        string memory name_,
        string memory symbol_,
        string memory contractURI_,
        string memory uri_,
        address soulhub_,
        address authedSigner_,
        AssetConfig memory nativeAssetConfig_
    ) assetConfigGuard(address(0), nativeAssetConfig_) {
        Wish newWish = new Wish(
            name_,
            symbol_,
            contractURI_,
            uri_,
            soulhub_,
            _msgSender()
        );
        _wish = IWish(address(newWish));
        _assetConfig[address(0)] = nativeAssetConfig_;
        _authedSigner = authedSigner_;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // ─── Modifiers ───────────────────────────────────────────────────────────────

    /**
     * @dev [Assets Management] Ensure the erc20 asset configuration is valid
     * @param config_ The updated erc20 asset config
     * ! Requirements:
     * ! Input config_.PLATFORM_FEE_PORTION must equals or less than the BASE_PORTION
     * ! Input config_.DISPUTE_HANDLING_FEE_PORTION must equals or less than the BASE_PORTION
     */
    modifier assetConfigGuard(address token_, AssetConfig memory config_) {
        if (token_ == address(0)) {
            require(config_.activated);
        }

        require(
            config_.PLATFORM_FEE_PORTION <= BASE_PORTION &&
                config_.DISPUTE_HANDLING_FEE_PORTION <= BASE_PORTION,
            WishportError.InvalidPortion
        );
        _;
    }

    /**
     * @dev [Access Right Management] Ensure the nonce has not been consumed yet,
     * @param account_ The target address for validation
     * @param nonce_ the target nonce to validate
     * ! Requirements:
     * ! The nonce_ of account_ must not been consumed yet
     * * Operations:
     * * Update the nonce_ corresponding to account_ to True after all operations have completed
     */
    modifier nonceGuard(uint256 nonce_, address account_) {
        require(!nonce[account_][nonce_], WishportError.InvalidNonce);

        _;

        nonce[account_][nonce_] = true;
    }

    /**
     * @dev [Access Right Management] Ensure the signature is signed by either the owner or manager
     * @param sig_ The target signature to validate
     * @param msgHash_ the intended hash of the signature message for validation
     * ! Requirements:
     * ! The signer of sig_ recovered from msgHash_ must either equals to owner address or be a manager
     * ! The blockNumber_ must be equal or grater than the current blocknumber minus _signatureExpirationBlockNumber
     */
    modifier signatureGuard(
        bytes memory sig_,
        address signer_,
        bytes32 msgHash_
    ) {
        address recoveredSigner = msgHash_.toEthSignedMessageHash().recover(
            sig_
        );
        // if signer is null address -> use default check
        if (signer_ == address(0)) {
            require(
                recoveredSigner == _authedSigner || recoveredSigner == owner(),
                WishportError.InvalidSigner
            );
        } else {
            require(recoveredSigner == signer_, WishportError.InvalidSigner);
        }
        _;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // ─── Internal Functions ──────────────────────────────────────────────────────

    /**
     * @dev Throw error if the address is invalid
     * @param account_ The target address to be checked
     */
    function _checkAddress(address account_) internal pure {
        require(account_ != address(0), WishportError.InvalidAddress);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // ─── Public Functions ────────────────────────────────────────────────

    function assetConfig() public view returns (AssetConfig memory) {
        return _assetConfig[address(0)];
    }

    /**
     * @dev [Assets Management] Get the configuation of the registered ERC20 of the corresponding AssetId
     * @param token_ The target token address
     * @return {Registered ERC20 Configuration}
     */
    function assetConfig(address token_)
        public
        view
        returns (AssetConfig memory)
    {
        AssetConfig memory config = _assetConfig[token_];

        return config.activated ? config : assetConfig();
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // ─── External Functions ──────────────────────────────────────────────────────

    /**
     * @dev [Metadata] Get the address of wishToken token
     * @return {wishToken Address}
     */
    function wish() external view returns (address) {
        return address(_wish);
    }

    /**
     * @dev Set the manager status of an account
     * @param account_ The target account to be updated with new manager status
     * ! Requirements:
     * ! The caller must be the owner
     * ! Input account_ must be a valid address
     * * Operations:
     * * Update the port config with config_
     */
    function setWishManager(address account_) external onlyOwner {
        _checkAddress(account_);
        _wish.setManager(account_);
    }

    /**
     * @dev Set the manager status of an account
     * @param account_ The target account to be updated with new manager status
     * ! Requirements:
     * ! The caller must be the owner
     * ! Input account_ must be a valid address
     * * Operations:
     * * Update the port config with config_
     */
    function setAuthedSigner(address account_) external onlyOwner {
        _checkAddress(account_);
        _authedSigner = account_;
    }

    /**
     * @dev Set asset config for an token or base ther
     * @param token_ The target token address to assign the asset config, address(0) as the base ether
     * @param config_ The initial configuration of the new target asset support
     * ! Requirements:
     * ! The caller must be the owner
     * ! Input config_ must pass the validation of assetConfigGuard
     * ! Input asset_ must not have been registered before
     * * Operations:
     * * Increment _registeredERC20Count
     * * Assign asset_ into _registeredERC20s with the index of the incremented _registeredERC20Count
     * * Assign config_ into _assetConfig with the index of the incremented _registeredERC20Count
     */
    function setAssetConfig(address token_, AssetConfig memory config_)
        external
        onlyOwner
        assetConfigGuard(token_, config_)
    {
        _assetConfig[token_] = config_;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // ─── Mint Wish ───────────────────────────────────────────────────────────────

    /**
     * @dev Mint a wish
     * @param tokenId_ The tokenId of the target wish
     * @param nonce_ The target nonce_ of the _msgSender() to be consumed
     * @param sig_ The authorization signature signed by the contract owner or the managers
     * @param assetId_ the intended assetId of the reward
     * @param assetAmount_ the intended amount of the reward
     * ! Requirements:
     * ! Input nonce_ must pass the validation of nonceGuard corresponding to _msgSender()
     * ! Input sig_ must pass the validation of managerSignatureGuard
     * ! Input assetId_ & assetAmount_ must pass the validation of mintWishAssetGuard
     * ! Input tokenId_ must not have corressponding minter record or being minted in wishToken token contract
     * * Operations:
     * * Create the corresponding wish information
     * * Update the mintedWishes in the wish history of _msgSender() with tokenId_
     * * Increment the mintedWishCount in the wish history of _msgSender()
     */
    function mint(
        uint256 tokenId_,
        uint256 nonce_,
        bytes memory sig_,
        uint256 assetId_,
        uint256 assetAmount_,
        uint256 blockNumber_
    )
        external
        payable
        nonceGuard(nonce_, _msgSender())
        signatureGuard(
            sig_,
            address(0),
            keccak256(
                abi.encodePacked(
                    "mint(uint256,uint256,bytes,uint256,uint256)",
                    address(this),
                    _msgSender(),
                    tokenId_,
                    nonce_,
                    blockNumber_
                )
            )
        )
    {}

    // ─────────────────────────────────────────────────────────────────────
    // ─── Burn A Wish ─────────────────────────────────────────────────────────────

    /**
     * @dev Burn a wish
     * @param tokenId_ The tokenId of the target wish
     * @param nonce_ The target nonce_ of the _msgSender() to be consumed
     * @param sig_ The authorization signature signed by the contract owner or the managers
     * @param blockNumber_ the block number when the signature is signed
     * ! Requirements:
     * ! Input nonce_ must pass the validation of nonceGuard corresponding to _msgSender()
     * ! Input sig_ && blockNumber must pass the validation of managerSignatureGuard
     * ! Input tokenId_ must not have corressponding minter record or being minted in wishToken token contract
     * * Operations:
     * * remove the corresponding wish information
     * * Update the mintedWishes in the wish history of _msgSender() with tokenId_
     * * decrement the mintedWishCount in the wish history of _msgSender()
     * * transfer the amount to the _msgSender()
     */
    function burnWish(
        uint256 tokenId_,
        uint256 nonce_,
        bytes memory sig_,
        uint256 blockNumber_
    )
        external
        payable
        nonceGuard(nonce_, _msgSender())
        signatureGuard(
            sig_,
            address(0),
            keccak256(
                abi.encodePacked(
                    "burnWish(uint256,uint256,bytes,uint256)",
                    address(this),
                    _msgSender(),
                    tokenId_,
                    nonce_,
                    blockNumber_
                )
            )
        )
    {}

    // ─────────────────────────────────────────────────────────────────────────────
    // ─── Create Fulfillment Of A Wish ────────────────────────────────────────────

    // ─────────────────────────────────────────────────────────────────────
    // burn wish
    // handle dispute
}
