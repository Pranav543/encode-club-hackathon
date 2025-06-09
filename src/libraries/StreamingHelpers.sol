// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../interfaces/IStreamingRecipient.sol";
import "./StreamingErrors.sol";

/// @title StreamingHelpers
/// @notice Library containing helper functions for hook management
library StreamingHelpers {
    /// @notice Checks if an address supports the IStreamingRecipient interface
    /// @param hook The address to check
    /// @return Whether the address supports the interface
    function checkInterface(address hook) internal view returns (bool) {
        // Calculate the correct interface ID
        bytes4 interfaceId = type(IStreamingRecipient).interfaceId;
        
        try IStreamingRecipient(hook).supportsInterface(interfaceId) returns (bool supported) {
            return supported;
        } catch {
            return false;
        }
    }
    
    /// @notice Safely calls a hook function and handles potential reverts
    /// @param hook The hook contract address
    /// @param data The encoded function call data
    /// @return success Whether the call succeeded
    function safeHookCall(address hook, bytes memory data) internal returns (bool success) {
        if (hook.code.length == 0) return false;
        
        (success, ) = hook.call(data);
        return success;
    }
}
