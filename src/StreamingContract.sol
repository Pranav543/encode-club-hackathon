// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract StreamingContract is ERC721, ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

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
        uint256 ratePerSecond; // Only used for linear streams
        bool isActive;
        bool cancelable;
        StreamShape shape;
        // Logarithmic curve parameters
        uint256 logScale; // Scaling factor for logarithmic calculations
        uint256 logOffset; // Offset to ensure log domain is positive
    }

    // Struct to hold parameters for _createStream, reducing stack load
    struct CreateStreamParams {
        address recipient;
        uint256 deposit;
        address tokenAddress; // Keep as address, convert to IERC20 inside
        uint256 startTime;
        uint256 stopTime;
        bool cancelable;
        StreamShape shape;
        uint256 logOffset;
        uint256 logScale;
    }

    mapping(uint256 => Stream) public streams;
    uint256 private _streamIds;

    uint256 public constant BROKER_FEE_PERCENTAGE = 100; // 1%
    uint256 public constant PERCENTAGE_SCALE = 10000;
    uint256 public constant LOG_PRECISION = 1e18; // 18 decimal precision for log calculations
    uint256 public constant MAX_LOG_INPUT = 1e36; // Maximum input for log function

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

    constructor(
        address initialOwner
    ) ERC721("Streaming NFT", "STREAM") Ownable(initialOwner) {}

    // ============ LOGARITHMIC MATH FUNCTIONS ============
    // ln function and calculateLogStreamedAmount remain unchanged
    /**
     * @dev Calculates natural logarithm using Taylor series approximation
     * @param x Input value (scaled by LOG_PRECISION)
     * @return Natural logarithm of x (scaled by LOG_PRECISION)
     */
    function ln(uint256 x) internal pure returns (uint256) {
        require(x > 0, "ln: input must be positive");

        if (x == LOG_PRECISION) return 0; // ln(1) = 0

        uint256 result = 0;
        uint256 y = x;

        // Handle values greater than 1
        if (y >= LOG_PRECISION) {
            uint256 powerOf2 = 0;
            while (y >= 2 * LOG_PRECISION) {
                y = y / 2;
                powerOf2++;
            }
            result = powerOf2 * 693147180559945309; // ln(2) * LOG_PRECISION
        }

        // Taylor series for ln(1 + z) where z = y - 1
        if (y != LOG_PRECISION) {
            uint256 z = y > LOG_PRECISION
                ? y - LOG_PRECISION
                : LOG_PRECISION - y;
            uint256 term = z;
            uint256 i = 1;

            // Calculate first 10 terms of Taylor series for reasonable precision
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

                // Prevent overflow
                if (term < 1000) break;
            }
        }

        return result;
    }

    /**
     * @dev Calculates the logarithmic streaming amount for a given time
     * @param totalAmount Total amount to be streamed
     * @param elapsedTime Time elapsed since stream start
     * @param totalDuration Total duration of the stream
     * @param offset Offset to ensure positive domain for logarithm
     * @return Streamed amount based on logarithmic curve
     */
    function calculateLogStreamedAmount(
        uint256 totalAmount,
        uint256 elapsedTime,
        uint256 totalDuration,
        uint256 offset
    ) internal pure returns (uint256) {
        if (elapsedTime == 0) return 0;
        if (elapsedTime >= totalDuration) return totalAmount;

        // Calculate ln(elapsedTime + offset) and ln(totalDuration + offset)
        uint256 logElapsed = ln(
            ((elapsedTime + offset) * LOG_PRECISION) / (offset + 1)
        ); // Assuming offset >= 0
        uint256 logTotal = ln(
            ((totalDuration + offset) * LOG_PRECISION) / (offset + 1)
        ); // Assuming offset >= 0

        if (logTotal == 0) return totalAmount; // Prevent division by zero

        return (totalAmount * logElapsed) / logTotal;
    }

    // ============ STREAM CREATION FUNCTIONS ============

    /**
     * @dev Creates a linear stream (existing functionality)
     */
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

    /**
     * @dev Creates a logarithmic stream with custom curve parameters
     * @param offset Offset for logarithmic function (recommended: duration / 10)
     */
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

    /**
     * @dev Internal function to create streams with different shapes
     */
    function _createStream(
        CreateStreamParams memory params
    ) internal returns (uint256) {
        // Changed to accept struct
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
        // Original code: require(deposit >= duration, "Deposit smaller than time delta");
        // This check might be too strict if deposit is a token amount and duration is in seconds.
        // For example, 1000 tokens for 3600 seconds. 1000 < 3600.
        // Assuming ratePerSecond calculation implies deposit should be divisible by duration for linear streams,
        // and that `deposit` means total tokens, not tokens per second.
        // If ratePerSecond is expected to be >= 1, then netDeposit / duration must be >= 1.
        // The original check `deposit >= duration` might be intended to ensure ratePerSecond is at least 1 (if token has 0 decimals).
        // Let's assume the original intent for `deposit >= duration` was to simplify rate calculation or ensure a minimum stream value per second.
        // If `netDeposit / duration` can be 0 (e.g. 100 tokens over 200 seconds = 0.5 tokens/sec, which is 0 in integer math),
        // this needs careful handling. The original code: `temp.ratePerSecond = (shape == StreamShape.LINEAR) ? (netDeposit / duration) : 0;`
        // This division will truncate. For a rate-based stream, it's crucial.
        // The original require `deposit >= duration` prevents `netDeposit / duration` from being zero if `netDeposit` is similar to `deposit`.
        // Let's keep this require as it was in the original logic:
        require(params.deposit >= duration, "Deposit smaller than time delta");

        // 1) Calculate broker fee and netDeposit
        uint256 brokerFee = (params.deposit * BROKER_FEE_PERCENTAGE) /
            PERCENTAGE_SCALE;
        uint256 netDeposit = params.deposit - brokerFee;
        require(netDeposit > 0, "Net deposit is zero after fee"); // Added safety check

        // 2) Transfer entire deposit from sender
        IERC20(params.tokenAddress).safeTransferFrom(
            msg.sender,
            address(this),
            params.deposit
        );

        // 3) Transfer broker fee to owner
        if (brokerFee > 0) {
            IERC20(params.tokenAddress).safeTransfer(owner(), brokerFee);
        }

        // 4) Mint a new stream ID
        uint256 streamId = ++_streamIds;

        // 5) Get a storage pointer and assign fields directly
        Stream storage newStream = streams[streamId];
        newStream.sender = msg.sender;
        newStream.recipient = params.recipient;
        newStream.deposit = netDeposit;
        newStream.tokenAddress = IERC20(params.tokenAddress); // This was the problematic area
        newStream.startTime = params.startTime;
        newStream.stopTime = params.stopTime;
        newStream.remainingBalance = netDeposit;

        if (params.shape == StreamShape.LINEAR) {
            require(
                duration > 0,
                "Duration must be positive for linear stream rate calculation"
            ); // Safety for division
            newStream.ratePerSecond = netDeposit / duration;
            // Original check `deposit >= duration` and `netDeposit > 0` should ensure ratePerSecond > 0
            // if deposit is significantly larger than duration and fee is small.
            // If netDeposit < duration, ratePerSecond will be 0. This needs to be an acceptable outcome or guarded against.
            // Given original `deposit >= duration`, `netDeposit` will also likely be >= `duration` (unless fee is huge),
            // or at least `netDeposit / duration` would be non-zero if `netDeposit >= duration`.
            // If `netDeposit < duration` is possible and problematic (rate 0), add:
            // require(newStream.ratePerSecond > 0, "Rate per second is zero");
        } else {
            newStream.ratePerSecond = 0;
        }

        newStream.isActive = true;
        newStream.cancelable = params.cancelable;
        newStream.shape = params.shape;
        newStream.logScale = params.logScale;
        newStream.logOffset = params.logOffset;

        // 7) Mint the NFT to the recipient (params.recipient was recipient of stream)
        _mint(params.recipient, streamId);

        emit StreamCreated(
            streamId,
            msg.sender,
            params.recipient,
            netDeposit,
            params.tokenAddress, // Pass address for event
            params.startTime,
            params.stopTime,
            params.cancelable,
            params.shape
        );

        return streamId;
    }

    // ============ BALANCE CALCULATION ============
    // balanceOf, withdrawFromStream, cancelStream, getStream, getTotalStreams, getStreamShape, getStreamProgress, createStream (legacy)
    // remain unchanged from the original paste.txt.
    // These functions are assumed to be correct as they were not the source of the "Stack too deep" error.
    // (The following are copied from the provided code for completeness of the contract structure, but unchanged)

    /**
     * @dev Calculates available balance based on stream shape
     */
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
            // Ensure logOffset used here matches how it was stored
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

    // ============ WITHDRAWAL AND CANCELLATION ============

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

        uint256 recipientBalance = balanceOf(streamId); // Calculates current claimable by recipient
        uint256 senderRefund = stream.remainingBalance - recipientBalance; // What's left for sender

        stream.isActive = false;
        stream.remainingBalance = 0; // All funds will be paid out

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

    /**
     * @dev Gets the percentage of tokens streamed for any stream shape
     * @return percentage Percentage streamed (scaled by PERCENTAGE_SCALE)
     */
    function getStreamProgress(
        uint256 streamId
    ) external view returns (uint256 percentage) {
        require(_ownerOf(streamId) != address(0), "Stream does not exist");
        Stream storage stream = streams[streamId];

        if (!stream.isActive || block.timestamp <= stream.startTime) {
            return 0;
        }

        if (block.timestamp >= stream.stopTime) {
            return PERCENTAGE_SCALE; // 100%
        }

        uint256 elapsedTime = block.timestamp - stream.startTime;
        uint256 totalDuration = stream.stopTime - stream.startTime;

        if (stream.shape == StreamShape.LINEAR) {
            // Ensure totalDuration is not zero to prevent division by zero.
            // stopTime > startTime check in _createStream should guarantee this.
            if (totalDuration == 0) return PERCENTAGE_SCALE; // Or handle as error, though unlikely
            percentage = (elapsedTime * PERCENTAGE_SCALE) / totalDuration;
        } else {
            // Ensure stream.deposit is not zero to prevent division by zero.
            // netDeposit > 0 check in _createStream should guarantee this.
            if (stream.deposit == 0) return 0; // Or handle as error
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

    /**
     * @dev Backward compatible function - creates linear stream
     */
    function createStream(
        address recipient,
        uint256 deposit,
        address tokenAddress,
        uint256 startTime,
        uint256 stopTime,
        bool cancelable
    ) external returns (uint256) {
        // Calls the refactored createLinearStream which now uses the params struct internally
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
