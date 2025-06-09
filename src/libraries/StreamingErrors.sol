// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @title StreamingErrors
/// @notice Library containing all custom errors for the streaming protocol
library StreamingErrors {
    /// @notice Thrown when a hook is not allowlisted
    error HookNotAllowlisted(address hook);
    
    /// @notice Thrown when trying to allowlist a hook that doesn't support the interface
    error HookUnsupportedInterface(address hook);
    
    /// @notice Thrown when a hook call fails
    error HookCallFailed(address hook, bytes reason);
    
    /// @notice Thrown when trying to allowlist the zero address
    error HookZeroAddress();
    
    /// @notice Thrown when a hook is already allowlisted
    error HookAlreadyAllowlisted(address hook);
}
