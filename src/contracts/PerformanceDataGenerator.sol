// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract PerformanceDataGenerator {
    struct PerformanceMetric {
        uint256 timestamp;
        uint256 latency;      // in milliseconds
        uint256 bandwidth;    // in Mbps
        uint256 blockNumber;
    }
    
    mapping(uint256 => PerformanceMetric) public performanceData;
    uint256 public currentMetricId;
    
    event PerformanceUpdated(
        uint256 indexed metricId,
        uint256 latency,
        uint256 bandwidth,
        uint256 timestamp
    );
    
    // Simulate network performance with violation-prone ranges
    function generatePerformanceData() external {
        currentMetricId++;
        
        // Generate pseudo-random latency (1-100ms)
        // With typical maxLatency of 50ms, violations occur ~50% of time (51-100ms)
        uint256 latency = (uint256(keccak256(abi.encodePacked(block.timestamp, block.difficulty, currentMetricId))) % 100) + 1;
        
        // Generate pseudo-random bandwidth (50-149 Mbps)  
        // With typical guaranteedBandwidth of 100Mbps, violations occur ~50% of time (50-99Mbps)
        uint256 bandwidth = (uint256(keccak256(abi.encodePacked(block.timestamp, block.difficulty, currentMetricId + 1))) % 100) + 50;
        
        performanceData[currentMetricId] = PerformanceMetric({
            timestamp: block.timestamp,
            latency: latency,
            bandwidth: bandwidth,
            blockNumber: block.number
        });
        
        emit PerformanceUpdated(currentMetricId, latency, bandwidth, block.timestamp);
    }
    
    function getLatestPerformance() external view returns (PerformanceMetric memory) {
        return performanceData[currentMetricId];
    }
    
    function getPerformanceHistory(uint256 count) external view returns (PerformanceMetric[] memory) {
        require(count <= currentMetricId, "Count exceeds available data");
        
        PerformanceMetric[] memory history = new PerformanceMetric[](count);
        for (uint256 i = 0; i < count; i++) {
            history[i] = performanceData[currentMetricId - i];
        }
        return history;
    }
}
