// src/examples/TestToken.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title TestToken
/// @notice A simple ERC20 token for testing the streaming protocol
contract TestToken is ERC20, Ownable {
    
    constructor() ERC20("Demo Streaming Token", "DEMO") Ownable(msg.sender) {
        // Mint 1,000,000 tokens to deployer
        _mint(msg.sender, 1000000 * 10**18);
    }
    
    /// @notice Mint new tokens (only owner)
    /// @param to Address to mint tokens to
    /// @param amount Amount of tokens to mint (with 18 decimals)
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
    
    /// @notice Burn tokens from caller's balance
    /// @param amount Amount of tokens to burn
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }
}
