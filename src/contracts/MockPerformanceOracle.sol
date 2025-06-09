// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract MockPerformanceOracle {
    struct PerformanceData {
        uint256 latency;    // in milliseconds
        uint256 bandwidth; // in Mbps
        uint256 timestamp;
    }

    mapping(uint256 => PerformanceData[]) public performanceHistory;
    mapping(uint256 => uint256) public slaSeeds; // For deterministic randomness

    event PerformanceDataGenerated(
        uint256 indexed slaId,
        uint256 latency,
        uint256 bandwidth,
        uint256 timestamp
    );

    function getPerformanceData(uint256 slaId) external returns (uint256 latency, uint256 bandwidth) {
        // Generate pseudo-random performance data
        uint256 seed = slaSeeds[slaId];
        if (seed == 0) {
            seed = uint256(keccak256(abi.encodePacked(block.timestamp, slaId, msg.sender)));
            slaSeeds[slaId] = seed;
        }

        // Update seed for next call
        slaSeeds[slaId] = uint256(keccak256(abi.encodePacked(seed, block.timestamp)));

        // Generate latency (5-50ms with occasional spikes)
        uint256 baseLatency = 8 + (slaSeeds[slaId] % 12); // 8-20ms normal range
        
        // 15% chance of latency spike
        if (slaSeeds[slaId] % 100 < 15) {
            latency = baseLatency + (slaSeeds[slaId] % 30); // Spike up to 50ms
        } else {
            latency = baseLatency;
        }

        // Generate bandwidth (80-120 Mbps with occasional drops)
        uint256 baseBandwidth = 95 + (slaSeeds[slaId] % 20); // 95-115 Mbps normal range
        
        // 10% chance of bandwidth drop
        if ((slaSeeds[slaId] / 2) % 100 < 10) {
            bandwidth = baseBandwidth - (slaSeeds[slaId] % 40); // Drop to as low as 75 Mbps
        } else {
            bandwidth = baseBandwidth;
        }

        // Store performance data
        performanceHistory[slaId].push(PerformanceData({
            latency: latency,
            bandwidth: bandwidth,
            timestamp: block.timestamp
        }));

        emit PerformanceDataGenerated(slaId, latency, bandwidth, block.timestamp);

        return (latency, bandwidth);
    }

    function getPerformanceHistory(uint256 slaId) external view returns (PerformanceData[] memory) {
        return performanceHistory[slaId];
    }

    function getLatestPerformance(uint256 slaId) external view returns (uint256 latency, uint256 bandwidth, uint256 timestamp) {
        PerformanceData[] storage history = performanceHistory[slaId];
        if (history.length == 0) {
            return (0, 0, 0);
        }
        
        PerformanceData storage latest = history[history.length - 1];
        return (latest.latency, latest.bandwidth, latest.timestamp);
    }

    // Admin function to simulate specific performance scenarios
    function simulatePerformance(
        uint256 slaId,
        uint256 latency,
        uint256 bandwidth
    ) external {
        performanceHistory[slaId].push(PerformanceData({
            latency: latency,
            bandwidth: bandwidth,
            timestamp: block.timestamp
        }));

        emit PerformanceDataGenerated(slaId, latency, bandwidth, block.timestamp);
    }
}
