// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../StreamingContract.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// Import or define the MockPerformanceOracle contract
import "./MockPerformanceOracle.sol";

contract NetworkSLA is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    struct SLATerms {
        uint256 guaranteedBandwidth;    // In Mbps
        uint256 maxLatency;             // In milliseconds
        uint256 maxViolations;          // Max violations before penalty
        uint256 penaltyRate;            // Percentage reduction (e.g., 20 = 20%)
        uint256 duration;               // SLA duration in seconds
        uint256 basePaymentRate;        // Base payment per second
        bool isActive;
    }

    struct SLAPerformance {
        uint256 violationCount;
        uint256 currentPaymentRate;     // Current rate after penalties
        uint256 lastMeasurementTime;
        uint256 totalMeasurements;
        uint256 averageLatency;
        uint256 averageBandwidth;
    }

    struct SLAContract {
        address serviceRequester;       // Node requesting service
        address serviceProvider;       // Node providing service
        uint256 streamId;              // Associated stream ID
        SLATerms terms;
        SLAPerformance performance;
        uint256 createdAt;
        uint256 expiresAt;
        bool isCompleted;
    }

    StreamingContract public immutable streamingContract;
    IERC20 public immutable paymentToken;
    
    mapping(uint256 => SLAContract) public slaContracts;
    mapping(address => uint256[]) public providerSLAs;
    mapping(address => uint256[]) public requesterSLAs;
    
    uint256 private _slaIdCounter;
    
    // Mock Oracle for performance data
    MockPerformanceOracle public performanceOracle;

    event SLACreated(
        uint256 indexed slaId,
        address indexed serviceRequester,
        address indexed serviceProvider,
        uint256 streamId,
        uint256 guaranteedBandwidth,
        uint256 maxLatency
    );

    event SLAViolation(
        uint256 indexed slaId,
        uint256 currentLatency,
        uint256 currentBandwidth,
        uint256 violationCount,
        uint256 newPaymentRate
    );

    event SLACompleted(
        uint256 indexed slaId,
        uint256 totalViolations,
        uint256 finalPaymentRate
    );

    event StreamRateAdjusted(
        uint256 indexed slaId,
        uint256 indexed streamId,
        uint256 oldRate,
        uint256 newRate
    );

    constructor(
        address _streamingContract,
        address _paymentToken,
        address initialOwner
    ) Ownable(initialOwner) {
        streamingContract = StreamingContract(_streamingContract);
        paymentToken = IERC20(_paymentToken);
        performanceOracle = new MockPerformanceOracle();
    }

    function createSLA(
        address serviceProvider,
        uint256 guaranteedBandwidth,
        uint256 maxLatency,
        uint256 maxViolations,
        uint256 penaltyRate,
        uint256 duration,
        uint256 basePaymentRate,
        uint256 totalPayment
    ) external nonReentrant returns (uint256 slaId, uint256 streamId) {
        require(serviceProvider != address(0), "Invalid service provider");
        require(serviceProvider != msg.sender, "Cannot create SLA with self");
        require(guaranteedBandwidth > 0, "Bandwidth must be positive");
        require(maxLatency > 0, "Max latency must be positive");
        require(duration > 0, "Duration must be positive");
        require(basePaymentRate > 0, "Payment rate must be positive");
        require(penaltyRate <= 100, "Penalty rate cannot exceed 100%");

        slaId = ++_slaIdCounter;

        // Create associated payment stream
        paymentToken.safeTransferFrom(msg.sender, address(this), totalPayment);
        paymentToken.approve(address(streamingContract), totalPayment);
        
        streamId = streamingContract.createLinearStream(
            serviceProvider,
            totalPayment,
            address(paymentToken),
            block.timestamp,
            block.timestamp + duration,
            true // Cancelable for rate adjustments
        );

        // Initialize SLA contract
        slaContracts[slaId] = SLAContract({
            serviceRequester: msg.sender,
            serviceProvider: serviceProvider,
            streamId: streamId,
            terms: SLATerms({
                guaranteedBandwidth: guaranteedBandwidth,
                maxLatency: maxLatency,
                maxViolations: maxViolations,
                penaltyRate: penaltyRate,
                duration: duration,
                basePaymentRate: basePaymentRate,
                isActive: true
            }),
            performance: SLAPerformance({
                violationCount: 0,
                currentPaymentRate: basePaymentRate,
                lastMeasurementTime: block.timestamp,
                totalMeasurements: 0,
                averageLatency: 0,
                averageBandwidth: 0
            }),
            createdAt: block.timestamp,
            expiresAt: block.timestamp + duration,
            isCompleted: false
        });

        // Track SLAs for both parties
        providerSLAs[serviceProvider].push(slaId);
        requesterSLAs[msg.sender].push(slaId);

        emit SLACreated(
            slaId,
            msg.sender,
            serviceProvider,
            streamId,
            guaranteedBandwidth,
            maxLatency
        );

        return (slaId, streamId);
    }

    function measurePerformance(uint256 slaId) external {
        SLAContract storage sla = slaContracts[slaId];
        require(sla.terms.isActive, "SLA not active");
        require(block.timestamp <= sla.expiresAt, "SLA expired");
        require(
            msg.sender == sla.serviceRequester || 
            msg.sender == sla.serviceProvider || 
            msg.sender == owner(),
            "Unauthorized"
        );

        // Get performance data from mock oracle
        (uint256 currentLatency, uint256 currentBandwidth) = 
            performanceOracle.getPerformanceData(slaId);

        // Update performance metrics
        _updatePerformanceMetrics(slaId, currentLatency, currentBandwidth);

        // Check for SLA violations
        bool isViolation = currentLatency > sla.terms.maxLatency || 
                          currentBandwidth < sla.terms.guaranteedBandwidth;

        if (isViolation) {
            _handleSLAViolation(slaId, currentLatency, currentBandwidth);
        }
    }

    function _updatePerformanceMetrics(
        uint256 slaId,
        uint256 currentLatency,
        uint256 currentBandwidth
    ) internal {
        SLAContract storage sla = slaContracts[slaId];
        SLAPerformance storage perf = sla.performance;

        // Update running averages
        perf.totalMeasurements++;
        perf.averageLatency = (perf.averageLatency * (perf.totalMeasurements - 1) + currentLatency) / perf.totalMeasurements;
        perf.averageBandwidth = (perf.averageBandwidth * (perf.totalMeasurements - 1) + currentBandwidth) / perf.totalMeasurements;
        perf.lastMeasurementTime = block.timestamp;
    }

    function _handleSLAViolation(
        uint256 slaId,
        uint256 currentLatency,
        uint256 currentBandwidth
    ) internal {
        SLAContract storage sla = slaContracts[slaId];
        sla.performance.violationCount++;

        uint256 newPaymentRate = sla.performance.currentPaymentRate;

        // Apply penalty if violation threshold exceeded
        if (sla.performance.violationCount > sla.terms.maxViolations) {
            uint256 penaltyReduction = (sla.terms.basePaymentRate * sla.terms.penaltyRate) / 100;
            newPaymentRate = sla.terms.basePaymentRate - penaltyReduction;
            
            // Ensure rate doesn't go below 10% of base rate
            uint256 minRate = sla.terms.basePaymentRate / 10;
            if (newPaymentRate < minRate) {
                newPaymentRate = minRate;
            }

            if (newPaymentRate != sla.performance.currentPaymentRate) {
                _adjustStreamRate(slaId, newPaymentRate);
                sla.performance.currentPaymentRate = newPaymentRate;
            }
        }

        emit SLAViolation(
            slaId,
            currentLatency,
            currentBandwidth,
            sla.performance.violationCount,
            newPaymentRate
        );
    }

    function _adjustStreamRate(uint256 slaId, uint256 newRate) internal {
        SLAContract storage sla = slaContracts[slaId];
        uint256 oldStreamId = sla.streamId;
        
        // Calculate remaining time and new total payment
        uint256 remainingTime = sla.expiresAt - block.timestamp;
        uint256 newTotalPayment = newRate * remainingTime;
        
        // Cancel current stream
        streamingContract.cancelStream(oldStreamId);
        
        // Create new stream with adjusted rate
        paymentToken.approve(address(streamingContract), newTotalPayment);
        
        uint256 newStreamId = streamingContract.createLinearStream(
            sla.serviceProvider,
            newTotalPayment,
            address(paymentToken),
            block.timestamp,
            sla.expiresAt,
            true
        );
        
        // Update SLA with new stream ID
        sla.streamId = newStreamId;
        
        emit StreamRateAdjusted(slaId, oldStreamId, sla.performance.currentPaymentRate, newRate);
    }

    function completeSLA(uint256 slaId) external {
        SLAContract storage sla = slaContracts[slaId];
        require(sla.terms.isActive, "SLA not active");
        require(
            block.timestamp >= sla.expiresAt || 
            msg.sender == sla.serviceRequester || 
            msg.sender == sla.serviceProvider,
            "Cannot complete SLA yet"
        );

        sla.terms.isActive = false;
        sla.isCompleted = true;

        emit SLACompleted(
            slaId,
            sla.performance.violationCount,
            sla.performance.currentPaymentRate
        );
    }

    // View functions
    function getSLA(uint256 slaId) external view returns (SLAContract memory) {
        return slaContracts[slaId];
    }

    function getProviderSLAs(address provider) external view returns (uint256[] memory) {
        return providerSLAs[provider];
    }

    function getRequesterSLAs(address requester) external view returns (uint256[] memory) {
        return requesterSLAs[requester];
    }

    function getSLAPerformanceMetrics(uint256 slaId) external view returns (
        uint256 violationCount,
        uint256 currentPaymentRate,
        uint256 averageLatency,
        uint256 averageBandwidth,
        uint256 totalMeasurements
    ) {
        SLAPerformance storage perf = slaContracts[slaId].performance;
        return (
            perf.violationCount,
            perf.currentPaymentRate,
            perf.averageLatency,
            perf.averageBandwidth,
            perf.totalMeasurements
        );
    }
}
