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
import "../utils/SignatureHelper.sol";
import "../wish/IWish.sol";
import "../wish/Wish.sol";

library WishportError {
    string constant InvalidInterface = "Wishport:InvalidInterface";
    string constant ERC20TransferError = "Wishport:ERC20TransferError";
    string constant MintWishError = "Wishport:MintWishError";
    string constant AssetTransferError = "Wishport:AssetTransferError";
    string constant BurnWishError = "Wishport:BurnWishError";
    string constant InvalidAsset = "Wishport:InvalidAsset";
    string constant InvalidPortion = "Wishport:InvalidPortion";
    string constant InvalidAddress = "Wishport:InvalidAddress";
    string constant Unauthorized = "Wishport:Unauthorized";
    string constant InvalidSigner = "Wishport:InvalidSigner";
    string constant InvalidNonce = "Wishport:InvalidNonce";
    string constant InvalidWish = "Wishport:InvalidWish";
    string constant InvalidBlock = "Wishport:InvalidBlock";
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

struct RegisteredERC20Config {
    bool activated;
    uint256 MINIMUM_REWARD;
    // PLATFORM_FEE_PORTION: e.g. 250_000_000 for 25% in uint256 basis points (parts per 1_000_000_000)
    uint256 PLATFORM_FEE_PORTION;
    uint256 DISPUTE_HANDLING_FEE_PORTION;
}

// minter: ownerof when ownerof != address(0)
struct WishRewardInfo {
    address token;
    uint256 amount;
}

contract Wishport is Ownable {
    using SafeERC20 for IERC20;
    using Address for address;
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
    mapping(address => RegisteredERC20Config) _registeredERC20Configs; // Mapping from AssetId to ERC20 Asset Config, 0 as the Native Ether
    mapping(uint256 => uint256) private _rewardPools; // Mapping from AssetId to the Corresponding Total Outstanding Reward Balance
    mapping(uint256 => mapping(address => uint256)) _accountBalances; // Mapping from AssetId to the Outstanding Balance of Each Account

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
     * ! Input wishAddress_ must pass the validation of interfaceGuard corresponding to the IwishToken interface
     * ! Input config_ must pass the validation of portConfigGuard
     * ! Input nativeAssetConfig_ must pass the validation of erc20ConfigGuard
     * * Operations:
     * * Initialize the _name metadata
     * * Initialize the _config metadata
     * * Initialize the _wishToken metadata
     * * Initialize the _registeredERC20Configs of address(0)
     * * Initialize the manager status of deployer
     */
    constructor(
        string memory name_,
        string memory symbol_,
        string memory contractURI_,
        string memory uri_,
        address soulhub_,
        address authedSigner_,
        RegisteredERC20Config memory nativeAssetConfig_
    ) erc20ConfigGuard(nativeAssetConfig_) {
        Wish newWish = new Wish(
            name_,
            symbol_,
            contractURI_,
            uri_,
            soulhub_,
            _msgSender()
        );
        _wish = IWish(address(newWish));
        _registeredERC20Configs[address(0)] = nativeAssetConfig_;
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
    modifier erc20ConfigGuard(RegisteredERC20Config memory config_) {
        require(
            config_.PLATFORM_FEE_PORTION <= BASE_PORTION &&
                config_.DISPUTE_HANDLING_FEE_PORTION <= BASE_PORTION,
            WishportError.InvalidPortion
        );
        _;
    }

    /**
     * @dev Ensure the address is implemented with correct Interface
     * @param account_ The target account for validation
     * @param interfaceId_ the interfaceId to validate
     * ! Requirements:
     * ! Input account_ must be a valid address
     * ! Input account_ must supports the interface of interfaceId_
     */
    modifier interfaceGuard(address account_, bytes4 interfaceId_) {
        _checkAddress(account_);
        require(
            ERC165Checker.supportsInterface(account_, interfaceId_),
            WishportError.InvalidInterface
        );
        _;
    }

    /**
     * @dev [Access Right Management] Ensure the blockNumber is within the range of the valid blocks
     * @param blockNumber_ The target address for validation
     * ! Requirements:
     * ! The nonce_ of account_ must not been consumed yet
     * * Operations:
     * * Update the nonce_ corresponding to account_ to True after all operations have completed
     */
    modifier blockNumberGuard(uint256 blockNumber_, uint256 validBlocks_) {
        require(
            blockNumber_ >= block.number - validBlocks_,
            WishportError.InvalidBlock
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
    modifier signerSignatureGuard(bytes memory sig_, bytes32 msgHash_) {
        address recoveredSigner = SignatureHelper.recoverSigner(msgHash_, sig_);
        require(
            recoveredSigner == _authedSigner || recoveredSigner == owner(),
            WishportError.InvalidSigner
        );
        _;
    }

    /**
     * @dev [Access Right Management] Ensure the signature is signed by the intended signer
     * @param sig_ The target signature to validate
     * @param signer_ the intended signature signer for validation
     * @param msgHash_ the intended hash of the signature message for validation
     * ! Requirements:
     * ! The signer of sig_ recovered from msgHash_ must equals to signer_
     */
    modifier customSignatureGuard(
        bytes memory sig_,
        address signer_,
        bytes32 msgHash_
    ) {
        require(
            SignatureHelper.recoverSigner(msgHash_, sig_) == signer_,
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

    /**
     * @dev [Assets Management] Get the outstanding balance of an account
     * @param assetId_ The target AssetId
     * @param account_ The target account
     * @return {Account Balance}
     */
    function _accountBalance(uint256 assetId_, address account_)
        internal
        view
        returns (uint256)
    {
        return _accountBalances[assetId_][account_];
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // ─── Public Functions ────────────────────────────────────────────────

    function defaultERC20Config()
        public
        view
        returns (RegisteredERC20Config memory)
    {
        return _registeredERC20Configs[address(0)];
    }

    /**
     * @dev [Assets Management] Get the configuation of the registered ERC20 of the corresponding AssetId
     * @param tokenAddress_ The target token address
     * @return {Registered ERC20 Configuration}
     */
    function registeredERC20Config(address tokenAddress_)
        public
        view
        returns (RegisteredERC20Config memory)
    {
        RegisteredERC20Config memory config = _registeredERC20Configs[
            tokenAddress_
        ];

        return config.activated ? config : defaultERC20Config();
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
     * @dev [Assets Management] Get the reward pool balance by assetId
     * @param assetId_ The target AssetId
     * @return {Balance of Reward Pool}
     */
    function rewardPoolBalance(uint256 assetId_)
        external
        view
        returns (uint256)
    {
        return _rewardPools[assetId_];
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
     * @dev Register a new ERC20 asset support
     * @param tokenAddress_ The target token address to be registered
     * @param config_ The initial configuration of the new target asset support
     * ! Requirements:
     * ! The caller must be the owner
     * ! Input asset_ must pass the validation of interfaceGuard corresponding to the interface IERC20
     * ! Input config_ must pass the validation of erc20ConfigGuard
     * ! Input asset_ must not have been registered before
     * * Operations:
     * * Increment _registeredERC20Count
     * * Assign asset_ into _registeredERC20s with the index of the incremented _registeredERC20Count
     * * Assign config_ into _registeredERC20Configs with the index of the incremented _registeredERC20Count
     */
    function registerERC20(
        address tokenAddress_,
        RegisteredERC20Config memory config_
    )
        external
        onlyOwner
        interfaceGuard(tokenAddress_, type(IERC20).interfaceId)
        erc20ConfigGuard(config_)
    {
        _registeredERC20Configs[tokenAddress_] = config_;
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
     * ! Input blockNumber_ must pass the blockNumberGuard
     * * Operations:
     * * Create the corresponding wish information
     * * Update the mintedWishes in the wish history of _msgSender() with tokenId_
     * * Increment the mintedWishCount in the wish history of _msgSender()
     */
    function mintWish(
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
        signerSignatureGuard(
            sig_,
            SignatureHelper.prefixed(
                keccak256(
                    abi.encodePacked(
                        "mintWish(uint256,uint256,bytes,uint256,uint256)",
                        address(this),
                        _msgSender(),
                        tokenId_,
                        nonce_,
                        blockNumber_
                    )
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
     * ! Input blockNumber_ must pass the blockNumberGuard
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
        signerSignatureGuard(
            sig_,
            SignatureHelper.prefixed(
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
        )
        blockNumberGuard(blockNumber_, 100) // only allows 100 blocks time
    {}

    // ─────────────────────────────────────────────────────────────────────────────
    // ─── Create Fulfillment Of A Wish ────────────────────────────────────────────

    /**
     * @dev Create a fulfilment for the target wish (assign a fulfiller)
     * @param tokenId_ The tokenId of the target wish
     * @param fulfiller_ The target account to be registered as the fulfiller
     * @param fulfillerNonce_ The nonce of the target fulfiller to be consumed
     * @param snapshotAssetId_ The assetId at the snapshot that the fulfiller apply to the wish
     * @param snapshotAssetAmount_ The asset amount at the snapshot that the fulfiller apply to the wish
     * @param applicationSig_ The application signature that fulfiller has signed
     * ! Requirements:
     * ! Input fulfillerNonce_ must pass the validation of nonceGuard corresponding to fulfiller_
     * ! Input applicationSig_ must pass the validation of signatureGuard as fulfiller_ being the signer
     * ! The caller must be the minter of the target wish
     * ! The target wish must NOT have been assigned to any fulfiller
     * ! Input snapshotAssetId_ must match with the reward assetId of the current wish info
     * ! Input snapshotAssetAmount_ must equal or less than the reward amount of the current wish info
     * * Operations:
     * * Assign the fulfiller to the target wish info
     * * Update the fulfillments in the wish history of the fulfiller with tokenId_
     * * Increment the fulfillmentCount in the wish history of the fulfiller
     */
    function createFulfilment(
        uint256 tokenId_,
        address fulfiller_,
        uint256 fulfillerNonce_,
        uint256 snapshotAssetId_,
        uint256 snapshotAssetAmount_,
        bytes memory applicationSig_
    )
        external
        payable
        nonceGuard(fulfillerNonce_, fulfiller_)
        customSignatureGuard(
            applicationSig_,
            fulfiller_,
            SignatureHelper.prefixed(
                keccak256(
                    abi.encodePacked(
                        "createFulfilment(uint256,address,uint256,uint256,uint256,bytes)",
                        address(this),
                        _msgSender(),
                        tokenId_,
                        fulfillerNonce_,
                        snapshotAssetId_,
                        snapshotAssetAmount_
                    )
                )
            )
        )
    {}
    // ─────────────────────────────────────────────────────────────────────
    // update fulfillment (confirm or cancel)
    // burn wish
    // handle dispute
}
