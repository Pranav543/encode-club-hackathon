// src/examples/NetworkSLA.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../StreamingContract.sol";
import "./MockPerformanceOracle.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title NetworkSLA
/// @notice Manages Service Level Agreements for decentralized network nodes
contract NetworkSLA is Ownable {
    StreamingContract public immutable streamingContract;
    MockPerformanceOracle public immutable performanceOracle;
    
    struct SLATerms {
        uint256 minBandwidth;     // Minimum bandwidth in Mbps
        uint256 maxLatency;       // Maximum latency in milliseconds
        uint256 maxViolations;    // Maximum violations before penalty
        uint256 penaltyRate;      // Penalty percentage (in basis points)
        uint256 duration;         // SLA duration in seconds
        uint256 basePaymentRate;  // Base payment rate in tokens per second
        bool isActive;
    }
    
    struct SLAStatus {
        uint256 streamId;         // Associated payment stream ID
        uint256 violationCount;   // Current violation count
        uint256 lastCheckTime;    // Last time metrics were checked
        uint256 currentRate;      // Current payment rate after penalties
        bool isActive;
    }
    
    mapping(address => SLATerms) public slaTerms;
    mapping(address => SLAStatus) public slaStatus;
    address[] public activeNodes;
    
    // Constants
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant MIN_PAYMENT_RATE = 100; // 1% minimum payment
    uint256 public constant CHECK_INTERVAL = 300;   // 5 minutes between checks
    
    event SLACreated(
        address indexed node,
        uint256 minBandwidth,
        uint256 maxLatency,
        uint256 basePaymentRate
    );
    
    event ViolationDetected(
        address indexed node,
        uint256 bandwidth,
        uint256 latency,
        uint256 violationCount
    );
    
    event PaymentRateAdjusted(
        address indexed node,
        uint256 oldRate,
        uint256 newRate,
        uint256 newStreamId
    );
    
    event SLACompleted(address indexed node, uint256 finalStreamId);
    
    constructor(
        address _streamingContract,
        address _performanceOracle
    ) Ownable(msg.sender) {
        streamingContract = StreamingContract(_streamingContract);
        performanceOracle = MockPerformanceOracle(_performanceOracle);
    }
    
    /// @notice Create a new SLA for a network node
    /// @param node The network node address
    /// @param minBandwidth Minimum required bandwidth in Mbps
    /// @param maxLatency Maximum allowed latency in milliseconds
    /// @param maxViolations Maximum violations before applying penalties
    /// @param penaltyRate Penalty rate in basis points (e.g., 2000 = 20%)
    /// @param duration SLA duration in seconds
    /// @param basePaymentRate Base payment rate in tokens per second
    /// @param token Payment token address
    function createSLA(
        address node,
        uint256 minBandwidth,
        uint256 maxLatency,
        uint256 maxViolations,
        uint256 penaltyRate,
        uint256 duration,
        uint256 basePaymentRate,
        address token
    ) external onlyOwner {
        require(node != address(0), "Invalid node address");
        require(!slaTerms[node].isActive, "SLA already exists");
        require(performanceOracle.isNodeRegistered(node), "Node not registered in oracle");
        require(minBandwidth > 0, "Invalid bandwidth requirement");
        require(maxLatency > 0, "Invalid latency requirement");
        require(penaltyRate <= BASIS_POINTS, "Invalid penalty rate");
        require(duration > 0, "Invalid duration");
        require(basePaymentRate > 0, "Invalid payment rate");
        
        // Store SLA terms
        slaTerms[node] = SLATerms({
            minBandwidth: minBandwidth,
            maxLatency: maxLatency,
            maxViolations: maxViolations,
            penaltyRate: penaltyRate,
            duration: duration,
            basePaymentRate: basePaymentRate,
            isActive: true
        });
        
        // Create initial payment stream
        uint256 totalPayment = basePaymentRate * duration;
        uint256 startTime = block.timestamp;
        uint256 stopTime = startTime + duration;
        
        // Create stream (need to approve tokens first)
        uint256 streamId = streamingContract.createLinearStream(
            node,
            totalPayment,
            token,
            startTime,
            stopTime,
            true // cancelable for rate adjustments
        );
        
        // Initialize SLA status
        slaStatus[node] = SLAStatus({
            streamId: streamId,
            violationCount: 0,
            lastCheckTime: block.timestamp,
            currentRate: basePaymentRate,
            isActive: true
        });
        
        activeNodes.push(node);
        
        emit SLACreated(node, minBandwidth, maxLatency, basePaymentRate);
    }
    
    /// @notice Check performance and apply penalties if needed
    /// @param node The network node to check
    function checkPerformance(address node) external {
        require(slaTerms[node].isActive, "SLA not active");
        require(slaStatus[node].isActive, "SLA status not active");
        require(
            block.timestamp >= slaStatus[node].lastCheckTime + CHECK_INTERVAL,
            "Too soon to check again"
        );
        
        // Get current metrics from oracle
        (uint256 bandwidth, uint256 latency, uint256 timestamp) = 
            performanceOracle.getMetrics(node);
        
        // Check if metrics are fresh (within last hour)
        require(block.timestamp - timestamp <= 3600, "Metrics too old");
        
        SLATerms memory terms = slaTerms[node];
        SLAStatus storage status = slaStatus[node];
        
        // Check for violations
        bool violation = false;
        if (bandwidth < terms.minBandwidth || latency > terms.maxLatency) {
            violation = true;
            status.violationCount++;
            
            emit ViolationDetected(node, bandwidth, latency, status.violationCount);
        }
        
        status.lastCheckTime = block.timestamp;
        
        // Apply penalties if violations exceed threshold
        if (violation && status.violationCount > terms.maxViolations) {
            _adjustPaymentRate(node);
        }
    }
    
    /// @notice Internal function to adjust payment rate based on violations
    /// @param node The network node
    function _adjustPaymentRate(address node) internal {
        SLATerms memory terms = slaTerms[node];
        SLAStatus storage status = slaStatus[node];
        
        // Calculate new rate with penalty
        uint256 penaltyAmount = (terms.basePaymentRate * terms.penaltyRate) / BASIS_POINTS;
        uint256 newRate = terms.basePaymentRate - penaltyAmount;
        
        // Ensure minimum payment rate
        uint256 minRate = (terms.basePaymentRate * MIN_PAYMENT_RATE) / BASIS_POINTS;
        if (newRate < minRate) {
            newRate = minRate;
        }
        
        // Only adjust if rate actually changed
        if (newRate != status.currentRate) {
            uint256 oldRate = status.currentRate;
            status.currentRate = newRate;
            
            // Cancel current stream and create new one with adjusted rate
            _recreateStreamWithNewRate(node, newRate);
            
            emit PaymentRateAdjusted(node, oldRate, newRate, status.streamId);
        }
    }
    
    /// @notice Recreate payment stream with new rate
    /// @param node The network node
    /// @param newRate New payment rate
    function _recreateStreamWithNewRate(address node, uint256 newRate) internal {
        SLAStatus storage status = slaStatus[node];
        SLATerms memory terms = slaTerms[node];
        
        // Get current stream info
        StreamingContract.Stream memory currentStream = streamingContract.getStream(status.streamId);
        
        // Cancel current stream
        streamingContract.cancelStream(status.streamId);
        
        // Calculate remaining duration
        uint256 remainingDuration = currentStream.stopTime > block.timestamp ? 
            currentStream.stopTime - block.timestamp : 0;
        
        if (remainingDuration > 0) {
            // Create new stream with remaining duration and new rate
            uint256 newTotalPayment = newRate * remainingDuration;
            uint256 newStartTime = block.timestamp;
            uint256 newStopTime = newStartTime + remainingDuration;
            
            uint256 newStreamId = streamingContract.createLinearStream(
                node,
                newTotalPayment,
                address(currentStream.tokenAddress),
                newStartTime,
                newStopTime,
                true
            );
            
            status.streamId = newStreamId;
        } else {
            // SLA period ended
            status.isActive = false;
            slaTerms[node].isActive = false;
            emit SLACompleted(node, status.streamId);
        }
    }
    
    /// @notice Get SLA information for a node
    /// @param node The network node address
    /// @return terms The SLA terms
    /// @return status The current SLA status
    function getSLAInfo(address node) external view returns (
        SLATerms memory terms,
        SLAStatus memory status
    ) {
        return (slaTerms[node], slaStatus[node]);
    }
    
    /// @notice Get all active nodes
    /// @return Array of active node addresses
    function getActiveNodes() external view returns (address[] memory) {
        return activeNodes;
    }
    
    /// @notice Check if node is compliant with SLA terms
    /// @param node The network node address
    /// @return isCompliant Whether the node is currently compliant
    function isNodeCompliant(address node) external view returns (bool isCompliant) {
        if (!slaTerms[node].isActive) return false;
        
        try performanceOracle.getMetrics(node) returns (
            uint256 bandwidth,
            uint256 latency,
            uint256 timestamp
        ) {
            // Check if metrics are recent (within last hour)
            if (block.timestamp - timestamp > 3600) return false;
            
            SLATerms memory terms = slaTerms[node];
            return bandwidth >= terms.minBandwidth && latency <= terms.maxLatency;
        } catch {
            return false;
        }
    }
    
    /// @notice Emergency function to pause SLA
    /// @param node The network node address
    function pauseSLA(address node) external onlyOwner {
        require(slaTerms[node].isActive, "SLA not active");
        
        slaTerms[node].isActive = false;
        slaStatus[node].isActive = false;
        
        // Cancel associated stream
        if (slaStatus[node].streamId > 0) {
            streamingContract.cancelStream(slaStatus[node].streamId);
        }
    }
    
    /// @notice Get current effective payment rate for a node
    /// @param node The network node address
    /// @return currentRate The current payment rate after any penalties
    function getCurrentPaymentRate(address node) external view returns (uint256 currentRate) {
        require(slaTerms[node].isActive, "SLA not active");
        return slaStatus[node].currentRate;
    }
}
