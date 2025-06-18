// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract PerformanceDataGenerator {
    struct PerformanceMetric {
        uint256 timestamp;
        uint256 latency;      // in milliseconds
        uint256 bandwidth;    // in Mbps
        uint256 blockNumber;
        string dataType;      // "good" or "violation"
    }
    
    mapping(uint256 => PerformanceMetric) public performanceData;
    uint256 public currentMetricId;
    
    event PerformanceUpdated(
        uint256 indexed metricId,
        uint256 latency,
        uint256 bandwidth,
        uint256 timestamp,
        string dataType
    );
    
    function generateGoodPerformanceData() external {
        _generatePerformanceData("good");
    }
    
    function generateViolationPerformanceData() external {
        _generatePerformanceData("violation");
    }
    
    function _generatePerformanceData(string memory dataType) internal {
        currentMetricId++;
        
        uint256 latency;
        uint256 bandwidth;
        
        // Fixed: Use block.prevrandao instead of block.difficulty
        uint256 randomSeed = uint256(keccak256(abi.encodePacked(
            block.timestamp, 
            block.prevrandao,  // ✅ Updated from block.difficulty
            currentMetricId,
            msg.sender
        )));
        
        if (keccak256(abi.encodePacked(dataType)) == keccak256(abi.encodePacked("good"))) {
            latency = (randomSeed % 31) + 10;  // 10-40ms
            bandwidth = ((randomSeed >> 8) % 41) + 110;  // 110-150 Mbps
        } else {
            uint256 violationType = randomSeed % 3;
            
            if (violationType == 0) {
                latency = ((randomSeed >> 16) % 50) + 60;  // 60-110ms
                bandwidth = ((randomSeed >> 24) % 41) + 110;  // 110-150 Mbps
            } else if (violationType == 1) {
                latency = (randomSeed % 31) + 10;  // 10-40ms
                bandwidth = ((randomSeed >> 8) % 40) + 60;  // 60-99 Mbps
            } else {
                latency = ((randomSeed >> 16) % 50) + 60;  // 60-110ms
                bandwidth = ((randomSeed >> 24) % 40) + 60;  // 60-99 Mbps
            }
        }
        
        performanceData[currentMetricId] = PerformanceMetric({
            timestamp: block.timestamp,
            latency: latency,
            bandwidth: bandwidth,
            blockNumber: block.number,
            dataType: dataType
        });
        
        emit PerformanceUpdated(currentMetricId, latency, bandwidth, block.timestamp, dataType);
    }
    
    function getLatestPerformance() external view returns (PerformanceMetric memory) {
        require(currentMetricId > 0, "No performance data available");
        return performanceData[currentMetricId];
    }
    
    function getPerformanceHistory(uint256 count) external view returns (PerformanceMetric[] memory) {
        require(count > 0, "Count must be greater than 0");
        require(count <= currentMetricId, "Count exceeds available data");
        
        PerformanceMetric[] memory history = new PerformanceMetric[](count);
        for (uint256 i = 0; i < count; i++) {
            history[i] = performanceData[currentMetricId - i];
        }
        return history;
    }
    
    function getTotalMetricsCount() external view returns (uint256) {
        return currentMetricId;
    }
    
    // ✅ Added: Explicit getter for struct return
    function getPerformanceMetric(uint256 metricId) external view returns (PerformanceMetric memory) {
        require(metricId > 0 && metricId <= currentMetricId, "Invalid metric ID");
        return performanceData[metricId];
    }
}
