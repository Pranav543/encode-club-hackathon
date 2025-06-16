// src/examples/MockPerformanceOracle.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";

/// @title MockPerformanceOracle
/// @notice Mock oracle that provides network performance data for SLA monitoring
contract MockPerformanceOracle is Ownable {
    struct NetworkMetrics {
        uint256 bandwidth; // in Mbps
        uint256 latency;   // in milliseconds
        uint256 timestamp;
        bool isValid;
    }
    
    mapping(address => NetworkMetrics) public nodeMetrics;
    address[] public registeredNodes;
    
    // Default performance parameters
    uint256 public constant BASE_BANDWIDTH = 100; // 100 Mbps
    uint256 public constant BASE_LATENCY = 20;    // 20ms
    uint256 public constant BANDWIDTH_VARIANCE = 30; // ±30 Mbps
    uint256 public constant LATENCY_VARIANCE = 40;   // ±40ms
    
    event MetricsUpdated(
        address indexed node,
        uint256 bandwidth,
        uint256 latency,
        uint256 timestamp
    );
    
    event NodeRegistered(address indexed node);
    
    constructor() Ownable(msg.sender) {}
    
    /// @notice Register a network node for monitoring
    /// @param node The address of the network node
    function registerNode(address node) external onlyOwner {
        require(node != address(0), "Invalid node address");
        require(!nodeMetrics[node].isValid, "Node already registered");
        
        registeredNodes.push(node);
        
        // Initialize with base metrics
        nodeMetrics[node] = NetworkMetrics({
            bandwidth: BASE_BANDWIDTH,
            latency: BASE_LATENCY,
            timestamp: block.timestamp,
            isValid: true
        });
        
        emit NodeRegistered(node);
        emit MetricsUpdated(node, BASE_BANDWIDTH, BASE_LATENCY, block.timestamp);
    }
    
    /// @notice Update metrics for a specific node (simulates real oracle updates)
    /// @param node The network node address
    /// @param bandwidth Current bandwidth in Mbps
    /// @param latency Current latency in milliseconds
    function updateMetrics(
        address node, 
        uint256 bandwidth, 
        uint256 latency
    ) external onlyOwner {
        require(nodeMetrics[node].isValid, "Node not registered");
        
        nodeMetrics[node].bandwidth = bandwidth;
        nodeMetrics[node].latency = latency;
        nodeMetrics[node].timestamp = block.timestamp;
        
        emit MetricsUpdated(node, bandwidth, latency, block.timestamp);
    }
    
    /// @notice Generate realistic performance data with some variance
    /// @param node The network node address
    function generateRealisticMetrics(address node) external onlyOwner {
        require(nodeMetrics[node].isValid, "Node not registered");
        
        // Generate pseudo-random values based on block data
        uint256 randomSeed = uint256(keccak256(abi.encodePacked(
            block.timestamp,
            block.difficulty,
            node
        )));
        
        // Calculate bandwidth with variance (can go below minimum)
        uint256 bandwidthVariation = (randomSeed % (BANDWIDTH_VARIANCE * 2)) - BANDWIDTH_VARIANCE;
        uint256 newBandwidth = BASE_BANDWIDTH;
        
        if (bandwidthVariation > BASE_BANDWIDTH) {
            newBandwidth = 0; // Can drop to 0 for outages
        } else if (bandwidthVariation < 0 && uint256(int256(bandwidthVariation) * -1) > BASE_BANDWIDTH) {
            newBandwidth = 0;
        } else {
            newBandwidth = uint256(int256(BASE_BANDWIDTH) + int256(bandwidthVariation));
        }
        
        // Calculate latency with variance (minimum 1ms)
        uint256 latencyVariation = ((randomSeed >> 8) % (LATENCY_VARIANCE * 2)) - LATENCY_VARIANCE;
        uint256 newLatency = BASE_LATENCY;
        
        if (latencyVariation < 0 && uint256(int256(latencyVariation) * -1) > BASE_LATENCY) {
            newLatency = 1; // Minimum 1ms latency
        } else {
            newLatency = uint256(int256(BASE_LATENCY) + int256(latencyVariation));
        }
        
        // Simulate occasional spikes (5% chance of poor performance)
        if (randomSeed % 20 == 0) {
            newBandwidth = newBandwidth / 3; // Bandwidth drops significantly
            newLatency = newLatency * 3;     // Latency spikes
        }
        
        nodeMetrics[node].bandwidth = newBandwidth;
        nodeMetrics[node].latency = newLatency;
        nodeMetrics[node].timestamp = block.timestamp;
        
        emit MetricsUpdated(node, newBandwidth, newLatency, block.timestamp);
    }
    
    /// @notice Get current metrics for a node
    /// @param node The network node address
    /// @return bandwidth Current bandwidth in Mbps
    /// @return latency Current latency in milliseconds
    /// @return timestamp When metrics were last updated
    function getMetrics(address node) external view returns (
        uint256 bandwidth,
        uint256 latency,
        uint256 timestamp
    ) {
        require(nodeMetrics[node].isValid, "Node not registered");
        NetworkMetrics memory metrics = nodeMetrics[node];
        return (metrics.bandwidth, metrics.latency, metrics.timestamp);
    }
    
    /// @notice Check if a node is registered
    /// @param node The network node address
    /// @return Whether the node is registered
    function isNodeRegistered(address node) external view returns (bool) {
        return nodeMetrics[node].isValid;
    }
    
    /// @notice Get all registered nodes
    /// @return Array of registered node addresses
    function getRegisteredNodes() external view returns (address[] memory) {
        return registeredNodes;
    }
    
    /// @notice Get metrics age in seconds
    /// @param node The network node address
    /// @return Age of metrics in seconds
    function getMetricsAge(address node) external view returns (uint256) {
        require(nodeMetrics[node].isValid, "Node not registered");
        return block.timestamp - nodeMetrics[node].timestamp;
    }
}
