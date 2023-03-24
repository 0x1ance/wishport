// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "../wish/IWish.sol";
import "../wish/Wish.sol";

import "hardhat/console.sol";

library WishportError {
    string constant ERC20TransferError = "Wishport:ERC20TransferError";
    string constant InvalidPortion = "Wishport:InvalidPortion";
    string constant InvalidAddress = "Wishport:InvalidAddress";
    string constant Unauthorized = "Wishport:Unauthorized";
    string constant InvalidSigner = "Wishport:InvalidSigner";
    string constant InvalidNonce = "Wishport:InvalidNonce";
    string constant SignatureExpired = "Wishport:SignatureExpired";
    string constant InvalidToken = "Wishport:InvalidToken";
    string constant InsufficientBalance = "Wishport:InsufficientBalance";
    string constant WishTokenError = "Wishport:WishTokenError";
}

// WishStatusEnum
// INACTIVE: pureOwnerOf == address(0)
// OUTSTNADING: pureOwnerOf != address(0) && completed == FALSE
// COMPLETED: pureOwnerOf != address(0) && completed == TRUE
enum WishStatusEnum {
    INACTIVE,
    OUTSTANDING,
    COMPLETED
}

// minter: pureOwnerOf when pureOwnerOf != address(0)
struct WishRewardInfo {
    address token;
    uint256 amount;
}

// asset config
struct AssetConfig {
    // PLATFORM_FEE_PORTION: e.g. 250_000 for 25% in uint256 basis points (parts per 1_000_000_000)
    bool activated;
    uint256 PLATFORM_FEE_PORTION;
    uint256 DISPUTE_HANDLING_FEE_PORTION;
}

contract Wishport is Ownable {
    using SafeERC20 for IERC20;
    using Address for address;
    using ECDSA for bytes32;

    // ─── Events ──────────────────────────────────────────────────────────────────

    event Mint(
        uint256 indexed tokenId,
        address indexed rewardToken,
        uint256 rewardAmount
    );

    // ─────────────────────────────────────────────────────────────────────────────

    // ─── Metadata ────────────────────────────────────────────────────────

    IWish _wish; // wishToken

    // ─────────────────────────────────────────────────────────────────────────────
    // ─── Constants ───────────────────────────────────────────────────────

    uint256 public constant BASE_PORTION = 100_000; // Base Denominator for Portion Calculations

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
        require(authedSigner_ != address(0), WishportError.InvalidSigner);
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
     * ! if token_ is address(0), the config.activated must be TRUE
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
    modifier nonceGuard(address account_, uint256 nonce_) {
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
     * ! The sigExpireBlockNum_ must be equal or grater than the current blocknumber
     */
    modifier signatureGuard(
        bytes memory sig_,
        address signer_,
        bytes32 msgHash_,
        uint256 sigExpireBlockNum_
    ) {
        require(
            sigExpireBlockNum_ >= block.number,
            WishportError.SignatureExpired
        );
        address recoveredSigner = msgHash_.toEthSignedMessageHash().recover(
            sig_
        );
        // if signer is authedSigner -> can allow the signer also be the owner
        require(
            recoveredSigner == signer_ ||
                (
                    signer_ == authedSigner()
                        ? recoveredSigner == owner()
                        : false
                ),
            WishportError.InvalidSigner
        );
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

    /**
     * @dev [Metadata]: Get the authed signer address
     */
    function authedSigner() public view returns (address) {
        return _authedSigner;
    }

    /**
     * @dev [Assets Management]: Get the configuration of the base ether (default configuration)
     */
    function assetConfig() public view returns (AssetConfig memory) {
        return _assetConfig[address(0)];
    }

    /**
     * @dev [Assets Management] Get the configuation of the registered ERC20 of the corresponding AssetId
     * @param token_ The target token address
     * @return {Registered ERC20 Configuration}
     */
    function assetConfig(
        address token_
    ) public view returns (AssetConfig memory) {
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
    function setAssetConfig(
        address token_,
        AssetConfig memory config_
    ) external onlyOwner assetConfigGuard(token_, config_) {
        _assetConfig[token_] = config_;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // ─── Mint Wish ───────────────────────────────────────────────────────────────

    /**
     * @dev Mint a wish
     * @param tokenId_ The tokenId of the target wish
     * @param assetAddress_ the intended asset address of the reward, address(0) as the base ether
     * @param assetAmount_ the intended amount of the reward
     * @param nonce_ The target nonce_ of the _msgSender() to be consumed
     * @param sigExpireBlockNum_ the block number where the signature will be expired at
     * @param sig_ The authorization signature signed by the authedSigner
     * ! Requirements:
     * ! Input nonce_ must pass the validation of nonceGuard corresponding to _msgSender()
     * ! Input sig_ must pass the validation of managerSignatureGuard
     * ! Input tokenId_ must not have been minted before
     * ! If assetAddress_ is address(0), the msg.value must greater or equal to assetAmount_
     * * Operations:
     * * If assetAddress_ is not address(0), transfer the asset from _msgSender() to address(this)
     * * save the corresponding wish reward info
     * * mint the wish with tokenId_ to the _msgSender()
     */
    function mint(
        uint256 tokenId_,
        address assetAddress_,
        uint256 assetAmount_,
        uint256 nonce_,
        uint256 sigExpireBlockNum_,
        bytes memory sig_
    )
        external
        payable
        nonceGuard(_msgSender(), nonce_)
        signatureGuard(
            sig_,
            authedSigner(),
            keccak256(
                abi.encodePacked(
                    "mint(uint256,address,uint256,uint256,uint256,bytes)",
                    address(this),
                    _msgSender(),
                    tokenId_,
                    assetAddress_,
                    assetAmount_,
                    nonce_,
                    sigExpireBlockNum_
                )
            ),
            sigExpireBlockNum_
        )
    {
        // require(
        //     _wish.pureOwnerOf(tokenId_) == address(0),
        //     WishportError.InvalidToken
        // );

        uint256 rewardAmount;
        if (assetAddress_ == address(0)) {
            require(
                msg.value >= assetAmount_,
                WishportError.InsufficientBalance
            );
            rewardAmount = assetAmount_;
        } else {
            IERC20 token = IERC20(assetAddress_);
            uint256 balanceBefore = token.balanceOf(address(this));

            token.safeTransferFrom(_msgSender(), address(this), assetAmount_);
            uint256 balanceAfter = token.balanceOf(address(this));
            require(balanceAfter >= balanceBefore, "ERC20 transfer error");

            rewardAmount = balanceAfter - balanceBefore;
        }

        // save wish reward info
        WishRewardInfo storage rewardInfo = wishRewardInfo[tokenId_];
        rewardInfo.token = assetAddress_;
        rewardInfo.amount = rewardAmount;

        // mint the wish
        bool success = _wish.mint(_msgSender(), tokenId_);
        require(success, WishportError.WishTokenError);

        emit Mint(tokenId_, assetAddress_, rewardAmount);
    }

    // ─────────────────────────────────────────────────────────────────────
    // ─── Burn A Wish ─────────────────────────────────────────────────────────────

    /**
     * @dev Burn a wish
     * @param tokenId_ The tokenId of the target wish
     * @param nonce_ The target nonce_ of the _msgSender() to be consumed
     * @param sig_ The authorization signature signed by the contract owner or the managers
     * @param sigExpireBlockNum_ the block number when the signature is expired
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
        uint256 sigExpireBlockNum_
    )
        external
        payable
        nonceGuard(_msgSender(), nonce_)
        signatureGuard(
            sig_,
            authedSigner(),
            keccak256(
                abi.encodePacked(
                    "burnWish(uint256,uint256,bytes,uint256)",
                    address(this),
                    _msgSender(),
                    tokenId_,
                    nonce_,
                    sigExpireBlockNum_
                )
            ),
            sigExpireBlockNum_
        )
    {}

    // ─────────────────────────────────────────────────────────────────────────────
    // ─── Create Fulfillment Of A Wish ────────────────────────────────────────────

    // ─────────────────────────────────────────────────────────────────────
    // burn wish
    // handle dispute

    receive() external payable {}

    fallback() external payable {}
}
