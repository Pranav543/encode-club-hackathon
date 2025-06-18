// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./PerformanceDataGenerator.sol";

contract NetworkSLAComplete {
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
        uint256 streamId;
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
    
    event SLACreated(uint256 indexed slaId, address indexed serviceProvider, address indexed customer, uint256 basePaymentRate);
    event StreamCreated(uint256 indexed streamId, uint256 indexed slaId, address indexed to, uint256 paymentRate);
    event ViolationDetected(uint256 indexed slaId, string violationType, uint256 actualValue, uint256 threshold, uint256 violationCount);
    event PaymentRateAdjusted(uint256 indexed slaId, uint256 oldRate, uint256 newRate, string reason);
    event StreamCancelled(uint256 indexed streamId, uint256 indexed slaId, string reason, uint256 finalViolationCount);
    event SLATerminated(uint256 indexed slaId, string reason, uint256 totalViolations);
    
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
            streamId: streamCounter
        });
        
        // Create associated payment stream
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
        
        emit SLACreated(slaCounter, _serviceProvider, msg.sender, _basePaymentRate);
        emit StreamCreated(streamCounter, slaCounter, _serviceProvider, _basePaymentRate);
    }
    
    function checkSLACompliance(uint256 _slaId) external {
        require(_slaId <= slaCounter && _slaId > 0, "SLA does not exist");
        SLA storage sla = slas[_slaId];
        require(sla.isActive, "SLA is not active");
        
        // Get latest performance data from blockchain
        PerformanceDataGenerator.PerformanceMetric memory latest = performanceContract.getLatestPerformance();
        require(latest.timestamp > 0, "No performance data available");
        
        bool violationOccurred = false;
        uint256 oldViolationCount = sla.violationCount;
        
        // Check latency violation
        if (latest.latency > sla.maxLatency) {
            sla.violationCount++;
            violationOccurred = true;
            emit ViolationDetected(_slaId, "Latency", latest.latency, sla.maxLatency, sla.violationCount);
        }
        
        // Check bandwidth violation
        if (latest.bandwidth < sla.guaranteedBandwidth) {
            sla.violationCount++;
            violationOccurred = true;
            emit ViolationDetected(_slaId, "Bandwidth", latest.bandwidth, sla.guaranteedBandwidth, sla.violationCount);
        }
        
        // Handle violations
        if (violationOccurred) {
            // Reduce payment rate
            uint256 oldRate = sla.currentPaymentRate;
            sla.currentPaymentRate = sla.currentPaymentRate * (100 - sla.penaltyRate) / 100;
            
            // Update stream payment rate
            Stream storage stream = streams[sla.streamId];
            stream.paymentRate = sla.currentPaymentRate;
            
            emit PaymentRateAdjusted(_slaId, oldRate, sla.currentPaymentRate, "Violation penalty applied");
            
            // Check if max violations reached
            if (sla.violationCount >= sla.maxViolations) {
                // Cancel stream and terminate SLA
                stream.isActive = false;
                sla.isActive = false;
                
                emit StreamCancelled(sla.streamId, _slaId, "Maximum violations exceeded", sla.violationCount);
                emit SLATerminated(_slaId, "Maximum violations exceeded", sla.violationCount);
            }
        }
    }
    
    // Automatic compliance checking (can be called by anyone)
    function checkAllActiveSLAs() external {
        for (uint256 i = 1; i <= slaCounter; i++) {
            if (slas[i].isActive) {
                try this.checkSLACompliance(i) {
                    // Compliance check succeeded
                } catch {
                    // Compliance check failed, continue to next SLA
                }
            }
        }
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
