// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../contracts/NetworkSLA.sol";

contract TelecomNetworkExample {
    NetworkSLA public slaContract;
    
    struct NetworkNode {
        address nodeAddress;
        uint256 reputationScore;
        uint256 maxBandwidth;
        uint256 averageLatency;
        bool isActive;
    }
    
    mapping(address => NetworkNode) public nodes;
    address[] public activeNodes;
    
    event NodeRegistered(address indexed nodeAddress, uint256 maxBandwidth);
    event ServiceRequested(address indexed requester, uint256 requiredBandwidth, uint256 maxLatency);
    event SLAProposed(address indexed provider, address indexed requester, uint256 slaId);
    
    constructor(address _slaContract) {
        slaContract = NetworkSLA(_slaContract);
    }
    
    function registerNode(
        uint256 maxBandwidth,
        uint256 averageLatency
    ) external {
        nodes[msg.sender] = NetworkNode({
            nodeAddress: msg.sender,
            reputationScore: 100, // Starting reputation
            maxBandwidth: maxBandwidth,
            averageLatency: averageLatency,
            isActive: true
        });
        
        activeNodes.push(msg.sender);
        
        emit NodeRegistered(msg.sender, maxBandwidth);
    }
    
    function requestService(
        uint256 requiredBandwidth,
        uint256 maxLatency,
        uint256 duration
    ) external returns (address[] memory suitableProviders) {
        // Find suitable providers
        uint256 count = 0;
        for (uint256 i = 0; i < activeNodes.length; i++) {
            NetworkNode storage node = nodes[activeNodes[i]];
            if (node.isActive && 
                node.maxBandwidth >= requiredBandwidth && 
                node.averageLatency <= maxLatency) {
                count++;
            }
        }
        
        suitableProviders = new address[](count);
        uint256 index = 0;
        
        for (uint256 i = 0; i < activeNodes.length; i++) {
            NetworkNode storage node = nodes[activeNodes[i]];
            if (node.isActive && 
                node.maxBandwidth >= requiredBandwidth && 
                node.averageLatency <= maxLatency) {
                suitableProviders[index] = activeNodes[i];
                index++;
            }
        }
        
        emit ServiceRequested(msg.sender, requiredBandwidth, maxLatency);
        return suitableProviders;
    }
    
    function createSLAWithProvider(
        address provider,
        uint256 guaranteedBandwidth,
        uint256 maxLatency,
        uint256 duration,
        uint256 totalPayment
    ) external returns (uint256 slaId) {
        require(nodes[provider].isActive, "Provider not active");
        require(nodes[provider].maxBandwidth >= guaranteedBandwidth, "Insufficient bandwidth");
        
        uint256 basePaymentRate = totalPayment / duration;
        
        (slaId,) = slaContract.createSLA(
            provider,
            guaranteedBandwidth,
            maxLatency,
            10, // Max violations
            20, // 20% penalty rate
            duration,
            basePaymentRate,
            totalPayment
        );
        
        emit SLAProposed(provider, msg.sender, slaId);
        return slaId;
    }
    
    function updateNodeReputation(address nodeAddress, uint256 newScore) external {
        // In a real implementation, this would be called by a reputation system
        // based on SLA performance
        nodes[nodeAddress].reputationScore = newScore;
    }
}
