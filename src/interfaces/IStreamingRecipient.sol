// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/utils/introspection/IERC165.sol";

/// @title IStreamingRecipient
/// @notice Interface for contracts that can receive streaming hooks
interface IStreamingRecipient is IERC165 {
    /// @notice Responds to withdrawals from streams
    /// @param streamId The ID of the stream
    /// @param caller The address that called the withdraw function
    /// @param to The address that received the withdrawn tokens
    /// @param amount The amount of tokens withdrawn
    /// @return selector The function selector if successful
    function onStreamingWithdraw(
        uint256 streamId,
        address caller,
        address to,
        uint256 amount
    ) external returns (bytes4);

    /// @notice Responds to stream cancellations
    /// @param streamId The ID of the stream
    /// @param sender The original sender of the stream
    /// @param senderAmount The amount returned to the sender
    /// @param recipientAmount The amount given to the recipient
    /// @return selector The function selector if successful
    function onStreamingCancel(
        uint256 streamId,
        address sender,
        uint256 senderAmount,
        uint256 recipientAmount
    ) external returns (bytes4);
}
