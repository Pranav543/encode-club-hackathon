// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./PerformanceDataGenerator.sol";

contract NetworkSLAWithData {
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
    }
    
    mapping(uint256 => SLA) public slas;
    uint256 public slaCounter;
    
    PerformanceDataGenerator public performanceContract;
    
    event SLACreated(uint256 indexed slaId, address indexed serviceProvider, address indexed customer);
    event ViolationDetected(uint256 indexed slaId, string violationType, uint256 actualValue, uint256 threshold);
    event PaymentRateAdjusted(uint256 indexed slaId, uint256 oldRate, uint256 newRate);
    
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
    ) external {
        slaCounter++;
        
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
            isActive: true
        });
        
        emit SLACreated(slaCounter, _serviceProvider, msg.sender);
    }
    
    function checkSLACompliance(uint256 _slaId) external {
        require(_slaId <= slaCounter, "SLA does not exist");
        SLA storage sla = slas[_slaId];
        require(sla.isActive, "SLA is not active");
        
        // Get latest performance data from blockchain
        PerformanceDataGenerator.PerformanceMetric memory latest = performanceContract.getLatestPerformance();
        
        bool violationOccurred = false;
        
        // Check latency violation
        if (latest.latency > sla.maxLatency) {
            sla.violationCount++;
            violationOccurred = true;
            emit ViolationDetected(_slaId, "Latency", latest.latency, sla.maxLatency);
        }
        
        // Check bandwidth violation
        if (latest.bandwidth < sla.guaranteedBandwidth) {
            sla.violationCount++;
            violationOccurred = true;
            emit ViolationDetected(_slaId, "Bandwidth", latest.bandwidth, sla.guaranteedBandwidth);
        }
        
        // Adjust payment rate based on violations
        if (violationOccurred) {
            uint256 newRate = sla.currentPaymentRate * (100 - sla.penaltyRate) / 100;
            emit PaymentRateAdjusted(_slaId, sla.currentPaymentRate, newRate);
            sla.currentPaymentRate = newRate;
            
            // Deactivate SLA if max violations reached
            if (sla.violationCount >= sla.maxViolations) {
                sla.isActive = false;
            }
        }
    }
    
    function getSLA(uint256 _slaId) external view returns (SLA memory) {
        return slas[_slaId];
    }
}
