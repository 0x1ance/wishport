// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;
pragma experimental ABIEncoderV2;

// access control
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";
import "../utils/SignatureHelper.sol";
import "./WishSBT/IWishSBT.sol";

library WishportError {
    string constant InvalidInterface = "WishportError:InvalidInterface";
    string constant ERC20TransferError = "WishportError:ERC20TransferError";
    string constant InvalidAsset = "WishportError:InvalidAsset";
    string constant InvalidPortion = "WishportError:InvalidPortion";
    string constant InvalidAddress = "WishportError:InvalidAddress";
    string constant Unauthorized = "WishportError:Unauthorized";
    string constant InvalidSigner = "WishportError:InvalidSigner";
    string constant InvalidNonce = "WishportError:InvalidNonce";
    string constant InvalidWish = "WishportError:InvalidWish";
}

enum WishStatusEnum {
    INACTIVE,
    OUTSTANDING,
    COMPLETED
}

struct PortConfig {
    address PLATFORM_FEE_POOL;
}

struct SupportedERC20Config {
    uint256 MINIMUM_REWARD;
    // PLATFORM_FEE_PORTION: e.g. 250_000_000 for 25% in uint256 basis points (parts per 1_000_000_000)
    uint256 PLATFORM_FEE_PORTION;
    uint256 DISPUTE_HANDLING_FEE_PORTION;
}

struct WishHistory {
    uint256 mintedWishCount; // the number of minted wish
    mapping(uint256 => uint256) mintedWishes; // Mapping from position index to wish tokenId, iterated by mintedWishCount
    uint256 fulfillmentCount; // the number of fulfillment this current account has enrolled into (being assigned as a wish fulfiller)
    mapping(uint256 => uint256) fulfillments; // Mapping from positin index to wish tokenId, iterated by fulfillmentCount
}

struct Wish {
    WishStatusEnum status;
    address minter;
    address fulfiller;
    uint256 assetId;
    uint256 amount;
}

contract Wishport is Ownable {
    // ─── Metadata ────────────────────────────────────────────────────────

    string public _name; // Port Name
    IWishSBT _wishSBT; // WishSBT
    PortConfig private _config; // Port Configuration

    // ─────────────────────────────────────────────────────────────────────────────
    // ─── Constants ───────────────────────────────────────────────────────

    uint256 private constant NATIVE_INDEX = 0; // Native Index of Supported Assets (Representing Root Ether of the Deployed Chain)
    uint256 public constant BASE_PORTION = 1_000_000_000; // Base Denominator for Portion Calculations

    // ─────────────────────────────────────────────────────────────────────────────
    // ─── Variables ───────────────────────────────────────────────────────────────

    /**
     * Access Right Management
     */
    mapping(address => bool) private _managers; // Mapping from Account to Manager Status, True as the Manager
    mapping(address => mapping(uint256 => bool)) private _nonces; // Mapping from Account to Consumption Status of Each Nonce, True as the Nonce Has Been Consumed

    /**
     *  Assets Management
     */
    uint256 public _supportedERC20Count = 0; // Counter of Supported ERC20 Assets
    mapping(uint256 => address) _supportedERC20s; // Mapping from AssetId to ERC20 Asset Info, 0 as the Native Ether
    mapping(uint256 => SupportedERC20Config) _supportedERC20Configs; // Mapping from AssetId to ERC20 Asset Config, 0 as the Native Ether
    mapping(uint256 => uint256) private _rewardPools; // Mapping from AssetId to the Corresponding Total Outstanding Reward Balance
    mapping(uint256 => mapping(address => uint256)) _accountBalances; // Mapping from AssetId to the Outstanding Balance of Each Account

    /**
     * Wish Related Information Management
     */
    mapping(address => WishHistory) private _wishHistories; // Mapping from Account to the Wish History
    mapping(uint256 => Wish) private _wishes; // Mapping from Wish TokenId to Wish Info

    // ─────────────────────────────────────────────────────────────────────────────
    // ─── Constructor ─────────────────────────────────────────────────────

    /**
     * @dev [Metadata] Initialize the smartcontract
     * @param name_ The name of the smart contract
     * @param wishSBTAddress_ The address of the wishSBT token
     * @param config_ The port configuration of the smart contract
     * @param nativeAssetConfig_ The asset configuration of the native ether of deployed chain
     * ! Requirements:
     * ! Input wishSBTAddress_ must pass the validation of interfaceGuard corresponding to the IWishSBT interface
     * ! Input config_ must pass the validation of portConfigGuard
     * ! Input nativeAssetConfig_ must pass the validation of erc20ConfigGuard
     * * Operations:
     * * Initialize the _name metadata
     * * Initialize the _config metadata
     * * Initialize the _wishSBT metadata
     * * Initialize the _supportedERC20Configs of NATIVE_INDEX
     * * Initialize the manager status of deployer
     */
    constructor(
        string memory name_,
        address wishSBTAddress_,
        PortConfig memory config_,
        SupportedERC20Config memory nativeAssetConfig_
    )
        interfaceGuard(wishSBTAddress_, type(IWishSBT).interfaceId)
        portConfigGuard(config_)
        erc20ConfigGuard(nativeAssetConfig_)
    {
        _name = name_;
        _config = config_;
        _wishSBT = IWishSBT(wishSBTAddress_);
        _supportedERC20Configs[NATIVE_INDEX] = nativeAssetConfig_;
        _managers[_msgSender()] = true;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // ─── Modifiers ───────────────────────────────────────────────────────────────

    /**
     * @dev [Metadata] Ensure the port configuration is valid
     * @param config_ The updated port config
     * ! Requirements:
     * ! Input config_.PLATFORM_FEE_POOL must be a valid address
     */
    modifier portConfigGuard(PortConfig memory config_) {
        _checkAddress(config_.PLATFORM_FEE_POOL);
        _;
    }

    /**
     * @dev [Assets Management] Ensure the erc20 asset configuration is valid
     * @param config_ The updated erc20 asset config
     * ! Requirements:
     * ! Input config_.PLATFORM_FEE_PORTION must equals or less than the BASE_PORTION
     * ! Input config_.DISPUTE_HANDLING_FEE_PORTION must equals or less than the BASE_PORTION
     */
    modifier erc20ConfigGuard(SupportedERC20Config memory config_) {
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
     * @dev [Access Right Management] Ensure the nonce has not been consumed yet,
     * @param account_ The target address for validation
     * @param nonce_ the target nonce to validate
     * ! Requirements:
     * ! The nonce_ must be available corresponding to account_
     * * Operations:
     * * Update the nonce_ corresponding to account_ to True after all operations have completed
     */
    modifier nonceGuard(uint256 nonce_, address account_) {
        require(
            nonceAvailability(account_, nonce_),
            WishportError.InvalidNonce
        );

        _;

        _nonces[account_][nonce_] = true;
    }

    /**
     * @dev [Access Right Management] Ensure the signature is signed by either the owner or manager
     * @param sig_ The target signature to validate
     * @param msgHash_ the intended hash of the signature message for validation
     * ! Requirements:
     * ! The signer of sig_ recovered from msgHash_ must either equals to owner address or be a manager
     */
    modifier managerSignatureGuard(bytes memory sig_, bytes32 msgHash_) {
        address recoveredSigner = SignatureHelper.recoverSigner(msgHash_, sig_);
        require(
            recoveredSigner == owner() || managerStatus(recoveredSigner),
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
    modifier signatureGuard(
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
     * @dev [Assets Management] Return the outstanding balance of an account
     * @param assetId_ The target AssetId
     * @param account_ The target account
     * @return {Account Balance}
     */
    function _accountBalance(
        uint256 assetId_,
        address account_
    ) internal view returns (uint256) {
        return _accountBalances[assetId_][account_];
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // ─── Public Functions ────────────────────────────────────────────────

    /**
     * @dev [Metadata] Return the port config
     * @return {Port Config}
     */
    function config() public view returns (PortConfig memory) {
        return _config;
    }

    /**
     * @dev [Access Right Management] Return the manager status of an account
     * @param account_ The target account
     * @return {Manager Status} TRUE as account_ being a manager, FALSE as account_ not a manager
     */
    function managerStatus(address account_) public view returns (bool) {
        return _managers[account_];
    }

    /**
     * @dev [Assets Management] Return the address of the supported ERC20 of the corresponding AssetId
     * @param assetId_ The target AssetId
     * @return {Supported ERC20 Address}
     */
    function supportedERC20(uint256 assetId_) public view returns (address) {
        return _supportedERC20s[assetId_];
    }

    /**
     * @dev [Assets Management] Return the configuation of the supported ERC20 of the corresponding AssetId
     * @param assetId_ The target AssetId
     * @return {Supported ERC20 Configuration}
     */
    function supportedERC20Config(
        uint256 assetId_
    ) public view returns (SupportedERC20Config memory) {
        return _supportedERC20Configs[assetId_];
    }

    /**
     * @dev [Wish Related Information Management] Get the wish info by tokenId
     * @param tokenId_ the tokenId of the wish
     * @return {Wish Info}
     */
    function wish(uint256 tokenId_) public view returns (Wish memory) {
        return _wishes[tokenId_];
    }

    /**
     * @dev [Access Right Management] Return the availability of a nonce under an account
     * @param account_ The target account
     * @param nonce_ The target nonce
     * @return {Nonce Availability} TRUE as nonce_ available to consume for account_, FALSE as nonce_ has already been consumed by account_
     */
    function nonceAvailability(
        address account_,
        uint256 nonce_
    ) public view returns (bool) {
        return !_nonces[account_][nonce_];
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // ─── External Functions ──────────────────────────────────────────────────────

    /**
     * @dev [Metadata] Return the address of wishSBT token
     * @return {WishSBT Address}
     */
    function wishSBT() external view returns (address) {
        return address(_wishSBT);
    }

    /**
     * @dev [Metadata] Set the port config
     * @param config_ The new port config
     * ! Requirements:
     * ! The caller must be the owner
     * ! Input config_ must pass the validation of portConfigGuard
     * * Operations:
     * * Update the port config with config_
     */
    function setConfig(
        PortConfig memory config_
    ) external onlyOwner portConfigGuard(config_) {
        _config = config_;
    }

    /**
     * @dev [Assets Management] Get the reward pool balance by assetId
     * @param assetId_ The target AssetId
     * @return {Balance of Reward Pool}
     */
    function rewardPoolBalance(
        uint256 assetId_
    ) external view returns (uint256) {
        return _rewardPools[assetId_];
    }

    /**
     * @dev Set the manager status of an account
     * @param account_ The target account to be updated with new manager status
     * @param status_ The new manager status
     * ! Requirements:
     * ! The caller must be the owner
     * ! Input account_ must be a valid address
     * * Operations:
     * * Update the port config with config_
     */
    function setManagerStatus(
        address account_,
        bool status_
    ) external onlyOwner {
        _checkAddress(account_);
        _managers[account_] = status_;
    }

    /**
     * @dev Register a new ERC20 asset support
     * @param asset_ The target asset address to be registered & support
     * @param config_ The initial configuration of the new target asset support
     * ! Requirements:
     * ! The caller must be the owner
     * ! Input asset_ must pass the validation of interfaceGuard corresponding to the interface IERC20
     * ! Input config_ must pass the validation of erc20ConfigGuard
     * ! Input asset_ must not have been registered before
     * * Operations:
     * * Increment _supportedERC20Count
     * * Assign asset_ into _supportedERC20s with the index of the incremented _supportedERC20Count
     * * Assign config_ into _supportedERC20Configs with the index of the incremented _supportedERC20Count
     */
    function registerERC20(
        address asset_,
        SupportedERC20Config memory config_
    )
        external
        onlyOwner
        interfaceGuard(asset_, type(IERC20).interfaceId)
        erc20ConfigGuard(config_)
    {
        for (uint256 i = 0; i < _supportedERC20Count; i++) {
            require(_supportedERC20s[i] != asset_, WishportError.InvalidAsset);
        }
        _supportedERC20Count += 1;
        _supportedERC20s[++_supportedERC20Count] = asset_;
        _supportedERC20Configs[_supportedERC20Count] = config_;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // ─── Mint Wish ───────────────────────────────────────────────────────────────

    /**
     * @dev Ensure the asset related input is valid
     * @param assetId_ the assetId of the wish reward
     * @param assetAmount_ the amount of the wish reward
     * ! Requirements:
     * ! Input assetAmount_ must greater than the MINIMUM_REWARD in the asset configuration
     * ! If the assetId_ equals to the NATIVE_INDEX, msg.value must be equal to the assetAmount_
     * ! If the assetId_ NOT equals to the NATIVE_INDEX, assetId_ must be mapped to a valid ERC20 address
     * ! If the assetId_ NOT equals to the NATIVE_INDEX, assetAmount_ amount of ERC20 token corresponding to assetId_ must be transfered from _msgSender() address to this contract
     * * Operations:
     * * Increment the reward pool balance corresponding to assetId_ by assetAmount_
     * * Increment the account balance of the _msgSender() corresponding to assetId_ by assetAmount_
     */
    modifier mintWishAssetGuard(uint256 assetId_, uint256 assetAmount_) {
        SupportedERC20Config memory assetConfig = supportedERC20Config(
            assetId_
        );
        require(
            assetAmount_ >= assetConfig.MINIMUM_REWARD,
            WishportError.InvalidAsset
        );
        if (assetId_ == NATIVE_INDEX) {
            require(msg.value == assetAmount_, WishportError.InvalidAsset);
        } else {
            address targetERC20Address = supportedERC20(assetId_);
            require(
                targetERC20Address != address(0),
                WishportError.InvalidAsset
            );
            require(
                IERC20(targetERC20Address).transferFrom(
                    _msgSender(),
                    address(this),
                    assetAmount_
                ),
                WishportError.ERC20TransferError
            );
        }

        _;

        _rewardPools[assetId_] += assetAmount_;
        _accountBalances[assetId_][_msgSender()] += assetAmount_;
    }

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
     * ! Input tokenId_ must not have corressponding minter record or being minted in wishSBT token contract
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
        uint256 assetAmount_
    )
        external
        payable
        nonceGuard(nonce_, _msgSender())
        managerSignatureGuard(
            sig_,
            SignatureHelper.prefixed(
                keccak256(
                    abi.encodePacked(
                        "mintWish(uint256,uint256,bytes,uint256,uint256)",
                        address(this),
                        _msgSender(),
                        tokenId_,
                        nonce_
                    )
                )
            )
        )
        mintWishAssetGuard(assetId_, assetAmount_)
    {
        Wish storage _currentWish = _wishes[tokenId_];
        require(
            _currentWish.minter == address(0) &&
                _wishSBT.mint(_msgSender(), tokenId_),
            WishportError.InvalidWish
        );
        _currentWish.status = WishStatusEnum.OUTSTANDING;
        _currentWish.minter = _msgSender();
        _currentWish.assetId = assetId_;
        _currentWish.amount = assetAmount_;
        WishHistory storage _accountWishHistory = _wishHistories[_msgSender()];
        _accountWishHistory.mintedWishes[
            _accountWishHistory.mintedWishCount++
        ] = tokenId_;
    }

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
        signatureGuard(
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
    {
        Wish storage currentWish = _wishes[tokenId_];
        require(currentWish.minter == _msgSender(), WishportError.Unauthorized);
        require(currentWish.fulfiller == address(0), WishportError.InvalidWish);
        require(
            snapshotAssetId_ == currentWish.assetId &&
                snapshotAssetAmount_ <= currentWish.amount,
            WishportError.InvalidAsset
        );
        currentWish.fulfiller = fulfiller_;
        WishHistory storage fulfillerWishHistory = _wishHistories[fulfiller_];
        fulfillerWishHistory.fulfillments[
            fulfillerWishHistory.fulfillmentCount++
        ] = tokenId_;
    }
    // ─────────────────────────────────────────────────────────────────────
}
