// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "./interfaces/IStreamingRecipient.sol";
import "./libraries/StreamingErrors.sol";
import "./libraries/StreamingHelpers.sol";

contract StreamingContract is ERC721, ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;
    using Address for address;

    enum StreamShape {
        LINEAR,
        LOGARITHMIC
    }

    struct Stream {
        address sender;
        address recipient;
        uint256 deposit;
        IERC20 tokenAddress;
        uint256 startTime;
        uint256 stopTime;
        uint256 remainingBalance;
        uint256 ratePerSecond;
        bool isActive;
        bool cancelable;
        StreamShape shape;
        uint256 logScale;
        uint256 logOffset;
    }

    struct CreateStreamParams {
        address recipient;
        uint256 deposit;
        address tokenAddress;
        uint256 startTime;
        uint256 stopTime;
        bool cancelable;
        StreamShape shape;
        uint256 logOffset;
        uint256 logScale;
    }

    mapping(uint256 => Stream) public streams;
    uint256 private _streamIds;

    /// @notice Mapping of allowlisted hook contracts
    mapping(address => bool) public isAllowlistedHook;

    /// @notice Array of all allowlisted hooks for enumeration
    address[] public allowlistedHooks;

    uint256 public constant BROKER_FEE_PERCENTAGE = 100;
    uint256 public constant PERCENTAGE_SCALE = 10000;
    uint256 public constant LOG_PRECISION = 1e18;

    event StreamCreated(
        uint256 indexed streamId,
        address indexed sender,
        address indexed recipient,
        uint256 deposit,
        address tokenAddress,
        uint256 startTime,
        uint256 stopTime,
        bool cancelable,
        StreamShape shape
    );

    event WithdrawFromStream(
        uint256 indexed streamId,
        address indexed recipient,
        uint256 amount
    );

    event StreamCanceled(
        uint256 indexed streamId,
        address indexed sender,
        address indexed recipient,
        uint256 senderBalance,
        uint256 recipientBalance
    );

    /// @notice Emitted when a hook is allowlisted
    event HookAllowlisted(address indexed hook);

    /// @notice Emitted when a hook call is made
    event HookCalled(
        address indexed hook,
        uint256 indexed streamId,
        bool success
    );

    constructor(
        address initialOwner
    ) ERC721("Streaming NFT", "STREAM") Ownable(initialOwner) {}

    // ============ HOOK MANAGEMENT ============

    /// @notice Allowlists a hook contract
    /// @param hook The address of the hook contract to allowlist
    function allowlistHook(address hook) external onlyOwner {
        if (hook == address(0)) revert StreamingErrors.HookZeroAddress();
        if (isAllowlistedHook[hook])
            revert StreamingErrors.HookAlreadyAllowlisted(hook);
        if (!StreamingHelpers.checkInterface(hook))
            revert StreamingErrors.HookUnsupportedInterface(hook);

        isAllowlistedHook[hook] = true;
        allowlistedHooks.push(hook);

        emit HookAllowlisted(hook);
    }

    /// @notice Gets the total number of allowlisted hooks
    /// @return The number of allowlisted hooks
    function getAllowlistedHooksCount() external view returns (uint256) {
        return allowlistedHooks.length;
    }

    /// @notice Gets all allowlisted hooks
    /// @return Array of allowlisted hook addresses
    function getAllowlistedHooks() external view returns (address[] memory) {
        return allowlistedHooks;
    }

    /// @notice Checks if a hook is allowlisted
    /// @param hook The hook address to check
    /// @return Whether the hook is allowlisted
    function isHookAllowlisted(address hook) external view returns (bool) {
        return isAllowlistedHook[hook];
    }

    // ============ HOOK EXECUTION ============

    /// @notice Executes withdraw hooks for a recipient if it's an allowlisted hook
    /// @param streamId The ID of the stream
    /// @param caller The address that called withdraw
    /// @param to The address receiving the tokens
    /// @param amount The amount being withdrawn
    function _executeWithdrawHook(
        uint256 streamId,
        address caller,
        address to,
        uint256 amount
    ) internal {
        Stream storage stream = streams[streamId];
        address recipient = stream.recipient;

        if (!isAllowlistedHook[recipient]) return;

        bytes memory data = abi.encodeCall(
            IStreamingRecipient.onStreamingWithdraw,
            (streamId, caller, to, amount)
        );

        bool success = StreamingHelpers.safeHookCall(recipient, data);
        emit HookCalled(recipient, streamId, success);

        if (!success) {
            revert StreamingErrors.HookCallFailed(
                recipient,
                "Withdraw hook failed"
            );
        }
    }

    /// @notice Executes cancel hooks for a recipient if it's an allowlisted hook
    /// @param streamId The ID of the stream
    /// @param sender The original sender of the stream
    /// @param senderAmount Amount returned to sender
    /// @param recipientAmount Amount given to recipient
    function _executeCancelHook(
        uint256 streamId,
        address sender,
        uint256 senderAmount,
        uint256 recipientAmount
    ) internal {
        Stream storage stream = streams[streamId];
        address recipient = stream.recipient;

        if (!isAllowlistedHook[recipient]) return;

        bytes memory data = abi.encodeCall(
            IStreamingRecipient.onStreamingCancel,
            (streamId, sender, senderAmount, recipientAmount)
        );

        bool success = StreamingHelpers.safeHookCall(recipient, data);
        emit HookCalled(recipient, streamId, success);

        if (!success) {
            revert StreamingErrors.HookCallFailed(
                recipient,
                "Cancel hook failed"
            );
        }
    }

    // ============ LOGARITHMIC MATH FUNCTIONS ============
    // [Keep your existing ln and calculateLogStreamedAmount functions unchanged]

    function ln(uint256 x) internal pure returns (uint256) {
        require(x > 0, "ln: input must be positive");
        if (x == LOG_PRECISION) return 0;

        uint256 result = 0;
        uint256 y = x;

        if (y >= LOG_PRECISION) {
            uint256 powerOf2 = 0;
            while (y >= 2 * LOG_PRECISION) {
                y = y / 2;
                powerOf2++;
            }
            result = powerOf2 * 693147180559945309;
        }

        if (y != LOG_PRECISION) {
            uint256 z = y > LOG_PRECISION
                ? y - LOG_PRECISION
                : LOG_PRECISION - y;
            uint256 term = z;
            uint256 i = 1;

            for (uint256 j = 0; j < 10; j++) {
                if (y > LOG_PRECISION) {
                    if (i % 2 == 1) {
                        result += term / i;
                    } else {
                        result -= term / i;
                    }
                } else {
                    if (i % 2 == 1) {
                        result -= term / i;
                    } else {
                        result += term / i;
                    }
                }
                term = (term * z) / LOG_PRECISION;
                i++;

                if (term < 1000) break;
            }
        }

        return result;
    }

    function calculateLogStreamedAmount(
        uint256 totalAmount,
        uint256 elapsedTime,
        uint256 totalDuration,
        uint256 offset
    ) internal pure returns (uint256) {
        if (elapsedTime == 0) return 0;
        if (elapsedTime >= totalDuration) return totalAmount;

        uint256 logElapsed = ln(
            ((elapsedTime + offset) * LOG_PRECISION) / (offset + 1)
        );
        uint256 logTotal = ln(
            ((totalDuration + offset) * LOG_PRECISION) / (offset + 1)
        );

        if (logTotal == 0) return totalAmount;

        return (totalAmount * logElapsed) / logTotal;
    }

    // ============ STREAM CREATION FUNCTIONS ============
    // [Keep your existing stream creation functions unchanged]

    function createLinearStream(
        address recipient,
        uint256 deposit,
        address tokenAddress,
        uint256 startTime,
        uint256 stopTime,
        bool cancelable
    ) public nonReentrant returns (uint256) {
        CreateStreamParams memory params = CreateStreamParams({
            recipient: recipient,
            deposit: deposit,
            tokenAddress: tokenAddress,
            startTime: startTime,
            stopTime: stopTime,
            cancelable: cancelable,
            shape: StreamShape.LINEAR,
            logOffset: 0,
            logScale: 0
        });
        return _createStream(params);
    }

    function createLogarithmicStream(
        address recipient,
        uint256 deposit,
        address tokenAddress,
        uint256 startTime,
        uint256 stopTime,
        bool cancelable,
        uint256 offset
    ) external nonReentrant returns (uint256) {
        uint256 duration = stopTime - startTime;
        require(offset > 0 && offset <= duration, "Invalid log offset");

        CreateStreamParams memory params = CreateStreamParams({
            recipient: recipient,
            deposit: deposit,
            tokenAddress: tokenAddress,
            startTime: startTime,
            stopTime: stopTime,
            cancelable: cancelable,
            shape: StreamShape.LOGARITHMIC,
            logOffset: offset,
            logScale: LOG_PRECISION
        });
        return _createStream(params);
    }

    function _createStream(
        CreateStreamParams memory params
    ) internal returns (uint256) {
        require(params.recipient != address(0), "Stream to zero address");
        require(params.recipient != address(this), "Stream to contract");
        require(params.recipient != msg.sender, "Stream to caller");
        require(params.deposit > 0, "Deposit is zero");
        require(
            params.startTime >= block.timestamp,
            "Start time before block timestamp"
        );
        require(
            params.stopTime > params.startTime,
            "Stop time before start time"
        );

        uint256 duration = params.stopTime - params.startTime;
        require(params.deposit >= duration, "Deposit smaller than time delta");

        uint256 brokerFee = (params.deposit * BROKER_FEE_PERCENTAGE) /
            PERCENTAGE_SCALE;
        uint256 netDeposit = params.deposit - brokerFee;
        require(netDeposit > 0, "Net deposit is zero after fee");

        IERC20(params.tokenAddress).safeTransferFrom(
            msg.sender,
            address(this),
            params.deposit
        );

        if (brokerFee > 0) {
            IERC20(params.tokenAddress).safeTransfer(owner(), brokerFee);
        }

        uint256 streamId = ++_streamIds;

        Stream storage newStream = streams[streamId];
        newStream.sender = msg.sender;
        newStream.recipient = params.recipient;
        newStream.deposit = netDeposit;
        newStream.tokenAddress = IERC20(params.tokenAddress);
        newStream.startTime = params.startTime;
        newStream.stopTime = params.stopTime;
        newStream.remainingBalance = netDeposit;

        if (params.shape == StreamShape.LINEAR) {
            require(
                duration > 0,
                "Duration must be positive for linear stream rate calculation"
            );
            newStream.ratePerSecond = netDeposit / duration;
        } else {
            newStream.ratePerSecond = 0;
        }

        newStream.isActive = true;
        newStream.cancelable = params.cancelable;
        newStream.shape = params.shape;
        newStream.logScale = params.logScale;
        newStream.logOffset = params.logOffset;

        _mint(params.recipient, streamId);

        emit StreamCreated(
            streamId,
            msg.sender,
            params.recipient,
            netDeposit,
            params.tokenAddress,
            params.startTime,
            params.stopTime,
            params.cancelable,
            params.shape
        );

        return streamId;
    }

    // ============ BALANCE CALCULATION ============
    // [Keep your existing balanceOf function unchanged]

    function balanceOf(uint256 streamId) public view returns (uint256) {
        require(_ownerOf(streamId) != address(0), "Stream does not exist");
        Stream storage stream = streams[streamId];

        if (!stream.isActive) return 0;
        if (block.timestamp <= stream.startTime) return 0;
        if (block.timestamp >= stream.stopTime) return stream.remainingBalance;

        uint256 elapsedTime = block.timestamp - stream.startTime;
        uint256 totalDuration = stream.stopTime - stream.startTime;
        uint256 streamedAmount;

        if (stream.shape == StreamShape.LINEAR) {
            streamedAmount = elapsedTime * stream.ratePerSecond;
        } else {
            streamedAmount = calculateLogStreamedAmount(
                stream.deposit,
                elapsedTime,
                totalDuration,
                stream.logOffset
            );
        }

        if (streamedAmount >= stream.deposit) {
            return stream.remainingBalance;
        }

        uint256 withdrawnAmount = stream.deposit - stream.remainingBalance;
        return
            streamedAmount > withdrawnAmount
                ? (streamedAmount - withdrawnAmount)
                : 0;
    }

    // ============ WITHDRAWAL AND CANCELLATION WITH HOOKS ============

    function withdrawFromStream(
        uint256 streamId,
        uint256 amount
    ) external nonReentrant returns (bool) {
        require(_ownerOf(streamId) != address(0), "Stream does not exist");
        Stream storage stream = streams[streamId];
        require(stream.isActive, "Stream not active");
        require(
            msg.sender == stream.recipient || msg.sender == ownerOf(streamId),
            "Caller not recipient"
        );

        uint256 availableBalance = balanceOf(streamId);
        require(availableBalance >= amount, "Insufficient funds");

        stream.remainingBalance -= amount;

        if (stream.remainingBalance == 0) {
            stream.isActive = false;
        }

        // Execute hook before token transfer
        _executeWithdrawHook(streamId, msg.sender, stream.recipient, amount);

        stream.tokenAddress.safeTransfer(stream.recipient, amount);

        emit WithdrawFromStream(streamId, stream.recipient, amount);
        return true;
    }

    function cancelStream(
        uint256 streamId
    ) external nonReentrant returns (bool) {
        require(_ownerOf(streamId) != address(0), "Stream does not exist");
        Stream storage stream = streams[streamId];
        require(stream.isActive, "Stream not active");
        require(stream.cancelable, "Stream not cancelable");
        require(
            msg.sender == stream.sender || msg.sender == stream.recipient,
            "Caller not authorized"
        );

        uint256 recipientBalance = balanceOf(streamId);
        uint256 senderRefund = stream.remainingBalance - recipientBalance;

        stream.isActive = false;
        stream.remainingBalance = 0;

        // Execute hook before token transfers
        _executeCancelHook(
            streamId,
            stream.sender,
            senderRefund,
            recipientBalance
        );

        if (recipientBalance > 0) {
            stream.tokenAddress.safeTransfer(
                stream.recipient,
                recipientBalance
            );
        }

        if (senderRefund > 0) {
            stream.tokenAddress.safeTransfer(stream.sender, senderRefund);
        }

        emit StreamCanceled(
            streamId,
            stream.sender,
            stream.recipient,
            senderRefund,
            recipientBalance
        );
        return true;
    }

    // ============ VIEW FUNCTIONS ============
    // [Keep your existing view functions unchanged]

    function getStream(uint256 streamId) external view returns (Stream memory) {
        require(_ownerOf(streamId) != address(0), "Stream does not exist");
        return streams[streamId];
    }

    function getTotalStreams() external view returns (uint256) {
        return _streamIds;
    }

    function getStreamShape(
        uint256 streamId
    ) external view returns (StreamShape) {
        require(_ownerOf(streamId) != address(0), "Stream does not exist");
        return streams[streamId].shape;
    }

    function getStreamProgress(
        uint256 streamId
    ) external view returns (uint256 percentage) {
        require(_ownerOf(streamId) != address(0), "Stream does not exist");
        Stream storage stream = streams[streamId];

        if (!stream.isActive || block.timestamp <= stream.startTime) {
            return 0;
        }

        if (block.timestamp >= stream.stopTime) {
            return PERCENTAGE_SCALE;
        }

        uint256 elapsedTime = block.timestamp - stream.startTime;
        uint256 totalDuration = stream.stopTime - stream.startTime;

        if (stream.shape == StreamShape.LINEAR) {
            if (totalDuration == 0) return PERCENTAGE_SCALE;
            percentage = (elapsedTime * PERCENTAGE_SCALE) / totalDuration;
        } else {
            if (stream.deposit == 0) return 0;
            uint256 streamedAmount = calculateLogStreamedAmount(
                stream.deposit,
                elapsedTime,
                totalDuration,
                stream.logOffset
            );
            percentage = (streamedAmount * PERCENTAGE_SCALE) / stream.deposit;
        }
        return percentage;
    }

    // ============ LEGACY COMPATIBILITY ============

    function createStream(
        address recipient,
        uint256 deposit,
        address tokenAddress,
        uint256 startTime,
        uint256 stopTime,
        bool cancelable
    ) external returns (uint256) {
        return
            createLinearStream(
                recipient,
                deposit,
                tokenAddress,
                startTime,
                stopTime,
                cancelable
            );
    }
}
