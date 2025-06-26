// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./PerformanceDataGenerator.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract NetworkSLAWithStreamRecreation is ReentrancyGuard, Ownable {
    struct SLA {
        address serviceProvider;
        address customer;
        uint256 guaranteedBandwidth;
        uint256 maxLatency;
        uint256 maxViolations;
        uint256 penaltyRate;
        uint256 basePaymentRate;    // ETH per second in wei
        uint256 currentPaymentRate; // ETH per second in wei  
        uint256 violationCount;
        uint256 startTime;
        uint256 duration;
        bool isActive;
        uint256 totalPaid;
        uint256 currentStreamId;
        uint256 streamRecreationCount;
        uint256 creationMetricId;
        uint256 lastCheckedMetricId;
    }

    struct Stream {
        address from;
        address to;
        uint256 paymentRate;    // ETH per second in wei
        uint256 startTime;
        uint256 totalAmount;    // Total ETH in wei
        uint256 amountPaid;     // ETH paid so far in wei
        bool isActive;
        uint256 slaId;
    }

    mapping(uint256 => SLA) public slas;
    mapping(uint256 => Stream) public streams;
    mapping(uint256 => uint256) public streamWithdrawals; // streamId => total withdrawn amount
    uint256 public slaCounter;
    uint256 public streamCounter;

    PerformanceDataGenerator public performanceContract;

    // Events
    event SLACreated(
        uint256 indexed slaId,
        address indexed serviceProvider,
        address indexed customer,
        uint256 basePaymentRate,  // ETH per second in wei
        uint256 creationMetricId
    );
    event StreamCreated(
        uint256 indexed streamId,
        uint256 indexed slaId,
        address indexed to,
        uint256 paymentRate       // ETH per second in wei
    );
    event ViolationDetected(
        uint256 indexed slaId,
        uint256 metricId,
        string violationType,
        uint256 actualValue,
        uint256 threshold,
        uint256 violationCount
    );
    event PaymentRateAdjusted(
        uint256 indexed slaId,
        uint256 oldRate,          // ETH per second in wei
        uint256 newRate,          // ETH per second in wei
        string reason
    );
    event StreamCancelled(
        uint256 indexed streamId,
        uint256 indexed slaId,
        string reason,
        uint256 finalViolationCount
    );
    event StreamRecreated(
        uint256 indexed newStreamId,
        uint256 indexed slaId,
        uint256 newPaymentRate,   // ETH per second in wei
        string reason
    );
    event SLATerminated(
        uint256 indexed slaId,
        string reason,
        uint256 totalViolations
    );
    event ComplianceChecked(
        uint256 indexed slaId,
        uint256 fromMetricId,
        uint256 toMetricId,
        uint256 violationsFound
    );
    event WithdrawalExecuted(
        uint256 indexed streamId,
        address indexed provider,
        uint256 amount           // ETH amount in wei
    );
    event StreamBalanceUpdated(uint256 indexed streamId, uint256 newBalance);

    constructor(address _performanceContract) Ownable(msg.sender) {
        performanceContract = PerformanceDataGenerator(_performanceContract);
    }

    function createSLA(
        address _serviceProvider,
        uint256 _guaranteedBandwidth,
        uint256 _maxLatency,
        uint256 _maxViolations,
        uint256 _penaltyRate,
        uint256 _duration,
        uint256 _basePaymentRatePerSecond    // ETH per second in wei
    ) external payable {
        require(_serviceProvider != address(0), "Invalid service provider");
        require(_guaranteedBandwidth > 0, "Bandwidth must be positive");
        require(_maxLatency > 0, "Latency must be positive");
        require(_basePaymentRatePerSecond > 0, "Payment rate must be positive");
        
        // Calculate total required payment: rate per second * duration
        uint256 totalRequired = _basePaymentRatePerSecond * _duration;
        require(msg.value >= totalRequired, "Insufficient payment");

        slaCounter++;
        streamCounter++;

        // Get current metric count BEFORE creating SLA
        uint256 currentMetricCount = performanceContract.getTotalMetricsCount();

        slas[slaCounter] = SLA({
            serviceProvider: _serviceProvider,
            customer: msg.sender,
            guaranteedBandwidth: _guaranteedBandwidth,
            maxLatency: _maxLatency,
            maxViolations: _maxViolations,
            penaltyRate: _penaltyRate,
            basePaymentRate: _basePaymentRatePerSecond,        // Store ETH/sec in wei
            currentPaymentRate: _basePaymentRatePerSecond,     // Start with full rate
            violationCount: 0,
            startTime: block.timestamp,
            duration: _duration,
            isActive: true,
            totalPaid: 0,
            currentStreamId: streamCounter,
            streamRecreationCount: 0,
            creationMetricId: currentMetricCount,
            lastCheckedMetricId: currentMetricCount
        });

        streams[streamCounter] = Stream({
            from: msg.sender,
            to: _serviceProvider,
            paymentRate: _basePaymentRatePerSecond,           // ETH/sec in wei
            startTime: block.timestamp,
            totalAmount: msg.value,                           // Total ETH sent
            amountPaid: 0,
            isActive: true,
            slaId: slaCounter
        });

        emit SLACreated(
            slaCounter,
            _serviceProvider,
            msg.sender,
            _basePaymentRatePerSecond,
            currentMetricCount
        );
        emit StreamCreated(
            streamCounter,
            slaCounter,
            _serviceProvider,
            _basePaymentRatePerSecond
        );
    }

    function withdrawFromStream(uint256 streamId, uint256 amount) public nonReentrant {
        require(streamId > 0 && streamId <= streamCounter, "Invalid stream ID");

        Stream storage stream = streams[streamId];
        require(stream.isActive, "Stream is not active");
        require(msg.sender == stream.to, "Only stream recipient can withdraw");
        require(amount > 0, "Withdrawal amount must be positive");

        uint256 availableBalance = calculateAvailableBalance(streamId);
        require(amount <= availableBalance, "Insufficient available balance");

        // Update withdrawal tracking
        streamWithdrawals[streamId] += amount;
        stream.amountPaid += amount;

        // Transfer ETH to service provider
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Transfer failed");

        emit WithdrawalExecuted(streamId, msg.sender, amount);
        emit StreamBalanceUpdated(streamId, availableBalance - amount);
    }

    function calculateAvailableBalance(uint256 streamId) public view returns (uint256) {
        require(streamId > 0 && streamId <= streamCounter, "Invalid stream ID");

        Stream storage stream = streams[streamId];
        if (!stream.isActive) return 0;

        SLA storage sla = slas[stream.slaId];
        if (!sla.isActive) return 0;

        // Calculate time-based payment accumulation
        uint256 timeElapsed = block.timestamp - stream.startTime;
        uint256 totalStreamDuration = sla.duration;

        uint256 accumulatedPayment;
        if (timeElapsed >= totalStreamDuration) {
            // Stream period is complete, full amount available
            accumulatedPayment = stream.totalAmount;
        } else {
            // Calculate pro-rata payment based on time elapsed and current rate
            // stream.paymentRate is already in wei per second
            accumulatedPayment = stream.paymentRate * timeElapsed;
            
            // Ensure we don't exceed total stream amount
            if (accumulatedPayment > stream.totalAmount) {
                accumulatedPayment = stream.totalAmount;
            }
        }

        return accumulatedPayment > stream.amountPaid ? accumulatedPayment - stream.amountPaid : 0;
    }

    function withdrawAllFromStream(uint256 streamId) external {
        uint256 availableBalance = calculateAvailableBalance(streamId);
        require(availableBalance > 0, "No funds available for withdrawal");
        withdrawFromStream(streamId, availableBalance);
    }

    function getWithdrawalInfo(uint256 streamId) external view returns (
        uint256 totalWithdrawn,
        uint256 availableBalance, 
        uint256 totalStreamAmount
    ) {
        require(streamId > 0 && streamId <= streamCounter, "Invalid stream ID");
        
        Stream storage stream = streams[streamId];
        return (
            stream.amountPaid,
            calculateAvailableBalance(streamId),
            stream.totalAmount
        );
    }

    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }

    function checkSLACompliance(uint256 _slaId) external {
        require(_slaId <= slaCounter && _slaId > 0, "SLA does not exist");
        SLA storage sla = slas[_slaId];
        require(sla.isActive, "SLA is not active");

        uint256 currentMetricCount = performanceContract.getTotalMetricsCount();

        uint256 startCheckingFrom = sla.lastCheckedMetricId + 1;
        uint256 endCheckingAt = currentMetricCount;

        if (startCheckingFrom <= sla.creationMetricId) {
            startCheckingFrom = sla.creationMetricId + 1;
        }

        if (endCheckingAt < startCheckingFrom) {
            emit ComplianceChecked(_slaId, startCheckingFrom, endCheckingAt, 0);
            return;
        }

        bool violationOccurred = false;
        uint256 newViolations = 0;

        for (uint256 metricId = startCheckingFrom; metricId <= endCheckingAt; metricId++) {
            PerformanceDataGenerator.PerformanceMetric memory metric = performanceContract.getPerformanceMetric(metricId);

            if (keccak256(abi.encodePacked(metric.dataType)) == keccak256(abi.encodePacked("violation"))) {
                bool currentViolation = false;

                if (metric.latency > sla.maxLatency) {
                    newViolations++;
                    currentViolation = true;
                    emit ViolationDetected(_slaId, metricId, "Latency", metric.latency, sla.maxLatency, sla.violationCount + newViolations);
                }

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

        sla.lastCheckedMetricId = currentMetricCount;
        emit ComplianceChecked(_slaId, startCheckingFrom, endCheckingAt, newViolations);

        if (violationOccurred && newViolations > 0) {
            sla.violationCount += newViolations;

            uint256 oldRate = sla.currentPaymentRate;

            // Apply penalty for each violation: reduce by penaltyRate%
            for (uint256 i = 0; i < newViolations; i++) {
                sla.currentPaymentRate = (sla.currentPaymentRate * (100 - sla.penaltyRate)) / 100;
            }

            emit PaymentRateAdjusted(_slaId, oldRate, sla.currentPaymentRate, 
                string(abi.encodePacked("Applied ", uintToString(newViolations), " violation penalties of ", uintToString(sla.penaltyRate), "% each")));

            if (sla.violationCount >= sla.maxViolations) {
                Stream storage currentStream = streams[sla.currentStreamId];
                currentStream.isActive = false;

                emit StreamCancelled(sla.currentStreamId, _slaId, "Maximum violations exceeded", sla.violationCount);

                if (sla.currentPaymentRate > 0) {
                    streamCounter++;
                    sla.currentStreamId = streamCounter;
                    sla.streamRecreationCount++;
                    sla.violationCount = 0;

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

    function uintToString(uint256 value) internal pure returns (string memory) {
        if (value == 0) return "0";
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
            if (slas[i].isActive) count++;
        }
        return count;
    }
}
