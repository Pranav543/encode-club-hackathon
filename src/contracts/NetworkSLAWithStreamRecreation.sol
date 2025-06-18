// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./PerformanceDataGenerator.sol";

contract NetworkSLAWithStreamRecreation {
    struct SLA {
        address serviceProvider;
        address customer;
        uint256 guaranteedBandwidth;
        uint256 maxLatency;
        uint256 maxViolations;
        uint256 penaltyRate;
        uint256 basePaymentRate;
        uint256 currentPaymentRate;
        uint256 violationCount;
        uint256 startTime;
        uint256 duration;
        bool isActive;
        uint256 totalPaid;
        uint256 currentStreamId;
        uint256 streamRecreationCount;
        uint256 creationMetricId; // Track performance data at SLA creation
        uint256 lastCheckedMetricId; // Track last checked data point
    }
    
    struct Stream {
        address from;
        address to;
        uint256 paymentRate;
        uint256 startTime;
        uint256 totalAmount;
        uint256 amountPaid;
        bool isActive;
        uint256 slaId;
    }
    
    mapping(uint256 => SLA) public slas;
    mapping(uint256 => Stream) public streams;
    uint256 public slaCounter;
    uint256 public streamCounter;
    
    PerformanceDataGenerator public performanceContract;
    
    event SLACreated(uint256 indexed slaId, address indexed serviceProvider, address indexed customer, uint256 basePaymentRate, uint256 creationMetricId);
    event StreamCreated(uint256 indexed streamId, uint256 indexed slaId, address indexed to, uint256 paymentRate);
    event ViolationDetected(uint256 indexed slaId, uint256 metricId, string violationType, uint256 actualValue, uint256 threshold, uint256 violationCount);
    event PaymentRateAdjusted(uint256 indexed slaId, uint256 oldRate, uint256 newRate, string reason);
    event StreamCancelled(uint256 indexed streamId, uint256 indexed slaId, string reason, uint256 finalViolationCount);
    event StreamRecreated(uint256 indexed newStreamId, uint256 indexed slaId, uint256 newPaymentRate, string reason);
    event SLATerminated(uint256 indexed slaId, string reason, uint256 totalViolations);
    event ComplianceChecked(uint256 indexed slaId, uint256 fromMetricId, uint256 toMetricId, uint256 violationsFound);
    
    constructor(address _performanceContract) {
        performanceContract = PerformanceDataGenerator(_performanceContract);
    }
    
    function createSLA(
        address _serviceProvider,
        uint256 _guaranteedBandwidth,
        uint256 _maxLatency,
        uint256 _maxViolations,
        uint256 _penaltyRate,
        uint256 _duration,
        uint256 _basePaymentRate
    ) external payable {
        require(_serviceProvider != address(0), "Invalid service provider");
        require(_guaranteedBandwidth > 0, "Bandwidth must be positive");
        require(_maxLatency > 0, "Latency must be positive");
        require(_basePaymentRate > 0, "Payment rate must be positive");
        require(msg.value >= _basePaymentRate * _duration, "Insufficient payment");
        
        slaCounter++;
        streamCounter++;
        
        // Capture current metric count at SLA creation time
        uint256 currentMetricCount = performanceContract.getTotalMetricsCount();
        
        slas[slaCounter] = SLA({
            serviceProvider: _serviceProvider,
            customer: msg.sender,
            guaranteedBandwidth: _guaranteedBandwidth,
            maxLatency: _maxLatency,
            maxViolations: _maxViolations,
            penaltyRate: _penaltyRate,
            basePaymentRate: _basePaymentRate,
            currentPaymentRate: _basePaymentRate,
            violationCount: 0,
            startTime: block.timestamp,
            duration: _duration,
            isActive: true,
            totalPaid: 0,
            currentStreamId: streamCounter,
            streamRecreationCount: 0,
            creationMetricId: currentMetricCount, // Only check data after this point
            lastCheckedMetricId: currentMetricCount // Initialize to creation point
        });
        
        // Create initial payment stream
        streams[streamCounter] = Stream({
            from: msg.sender,
            to: _serviceProvider,
            paymentRate: _basePaymentRate,
            startTime: block.timestamp,
            totalAmount: msg.value,
            amountPaid: 0,
            isActive: true,
            slaId: slaCounter
        });
        
        emit SLACreated(slaCounter, _serviceProvider, msg.sender, _basePaymentRate, currentMetricCount);
        emit StreamCreated(streamCounter, slaCounter, _serviceProvider, _basePaymentRate);
    }
    
    function checkSLACompliance(uint256 _slaId) external {
        require(_slaId <= slaCounter && _slaId > 0, "SLA does not exist");
        SLA storage sla = slas[_slaId];
        require(sla.isActive, "SLA is not active");
        
        // Get current metric count from performance contract
        uint256 currentMetricCount = performanceContract.getTotalMetricsCount();
        
        // Check if there's new data to process since last check
        // Only process data generated AFTER this SLA was created
        uint256 startCheckingFrom = sla.lastCheckedMetricId + 1;
        uint256 endCheckingAt = currentMetricCount;
        
        // Ensure we don't check data from before SLA creation
        if (startCheckingFrom <= sla.creationMetricId) {
            startCheckingFrom = sla.creationMetricId + 1;
        }
        
        require(endCheckingAt >= startCheckingFrom, "No new performance data to check for this SLA");
        
        // Process all new metrics since last check
        bool violationOccurred = false;
        uint256 newViolations = 0;
        
        for (uint256 metricId = startCheckingFrom; metricId <= endCheckingAt; metricId++) {
            // Get specific performance metric
            PerformanceDataGenerator.PerformanceMetric memory metric = performanceContract.getPerformanceMetric(metricId);
            
            // Only process violation data points for compliance checking
            if (keccak256(abi.encodePacked(metric.dataType)) == keccak256(abi.encodePacked("violation"))) {
                bool currentViolation = false;
                
                // Check latency violation
                if (metric.latency > sla.maxLatency) {
                    newViolations++;
                    currentViolation = true;
                    emit ViolationDetected(_slaId, metricId, "Latency", metric.latency, sla.maxLatency, sla.violationCount + newViolations);
                }
                
                // Check bandwidth violation
                if (metric.bandwidth < sla.guaranteedBandwidth) {
                    newViolations++;
                    currentViolation = true;
                    emit ViolationDetected(_slaId, metricId, "Bandwidth", metric.bandwidth, sla.guaranteedBandwidth, sla.violationCount + newViolations);
                }
                
                if (currentViolation) {
                    violationOccurred = true;
                }
            }
        }
        
        // Update last checked metric ID
        sla.lastCheckedMetricId = currentMetricCount;
        
        emit ComplianceChecked(_slaId, startCheckingFrom, endCheckingAt, newViolations);
        
        // Apply penalties only if violations occurred
        if (violationOccurred && newViolations > 0) {
            // Update violation count
            sla.violationCount += newViolations;
            
            // Apply penalty for each violation
            uint256 oldRate = sla.currentPaymentRate;
            for (uint256 i = 0; i < newViolations; i++) {
                sla.currentPaymentRate = sla.currentPaymentRate * (100 - sla.penaltyRate) / 100;
            }
            
            emit PaymentRateAdjusted(_slaId, oldRate, sla.currentPaymentRate, 
                string(abi.encodePacked("Applied ", uintToString(newViolations), " violation penalties")));
            
            // Check if max violations reached
            if (sla.violationCount >= sla.maxViolations) {
                // Cancel current stream
                Stream storage currentStream = streams[sla.currentStreamId];
                currentStream.isActive = false;
                
                emit StreamCancelled(sla.currentStreamId, _slaId, "Maximum violations exceeded", sla.violationCount);
                
                // Create new stream with penalty rate (if payment rate > 0)
                if (sla.currentPaymentRate > 0) {
                    streamCounter++;
                    sla.currentStreamId = streamCounter; // Update stream ID in SLA
                    sla.streamRecreationCount++;
                    sla.violationCount = 0; // Reset violation count for new stream
                    
                    streams[streamCounter] = Stream({
                        from: sla.customer,
                        to: sla.serviceProvider,
                        paymentRate: sla.currentPaymentRate,
                        startTime: block.timestamp,
                        totalAmount: sla.currentPaymentRate * (sla.duration / 2),
                        amountPaid: 0,
                        isActive: true,
                        slaId: _slaId
                    });
                    
                    emit StreamRecreated(streamCounter, _slaId, sla.currentPaymentRate, "Stream recreated after max violations");
                } else {
                    // Payment rate too low, terminate SLA
                    sla.isActive = false;
                    emit SLATerminated(_slaId, "Payment rate reduced to zero", sla.violationCount);
                }
            } else {
                // Update current stream payment rate
                Stream storage stream = streams[sla.currentStreamId];
                stream.paymentRate = sla.currentPaymentRate;
            }
        }
    }
    
    // Utility function to convert uint to string
    function uintToString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
    
    function getSLA(uint256 _slaId) external view returns (SLA memory) {
        return slas[_slaId];
    }
    
    function getStream(uint256 _streamId) external view returns (Stream memory) {
        return streams[_streamId];
    }
    
    function getActiveSLACount() external view returns (uint256) {
        uint256 count = 0;
        for (uint256 i = 1; i <= slaCounter; i++) {
            if (slas[i].isActive) {
                count++;
            }
        }
        return count;
    }
}
