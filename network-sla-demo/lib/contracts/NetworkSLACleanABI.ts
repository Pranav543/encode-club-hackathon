export const NetworkSLACleanABI = [
  // Constructor
  {
    "inputs": [{ "name": "_performanceContract", "type": "address" }],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  
  // Main Functions
  {
    "inputs": [
      { "name": "_serviceProvider", "type": "address" },
      { "name": "_guaranteedBandwidth", "type": "uint256" },
      { "name": "_maxLatency", "type": "uint256" },
      { "name": "_maxViolations", "type": "uint256" },
      { "name": "_penaltyRate", "type": "uint256" },
      { "name": "_duration", "type": "uint256" },
      { "name": "_basePaymentRate", "type": "uint256" }
    ],
    "name": "createSLA",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  
  {
    "inputs": [{ "name": "_slaId", "type": "uint256" }],
    "name": "checkSLACompliance",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  
  {
    "inputs": [{ "name": "_slaId", "type": "uint256" }],
    "name": "getSLA",
    "outputs": [
      {
        "components": [
          { "name": "serviceProvider", "type": "address" },
          { "name": "customer", "type": "address" },
          { "name": "guaranteedBandwidth", "type": "uint256" },
          { "name": "maxLatency", "type": "uint256" },
          { "name": "maxViolations", "type": "uint256" },
          { "name": "penaltyRate", "type": "uint256" },
          { "name": "basePaymentRate", "type": "uint256" },
          { "name": "currentPaymentRate", "type": "uint256" },
          { "name": "violationCount", "type": "uint256" },
          { "name": "startTime", "type": "uint256" },
          { "name": "duration", "type": "uint256" },
          { "name": "isActive", "type": "bool" },
          { "name": "totalPaid", "type": "uint256" },
          { "name": "currentStreamId", "type": "uint256" },
          { "name": "streamRecreationCount", "type": "uint256" },
          { "name": "creationMetricId", "type": "uint256" },
          { "name": "lastCheckedMetricId", "type": "uint256" }
        ],
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },

  {
    "inputs": [{ "name": "_streamId", "type": "uint256" }],
    "name": "getStream",
    "outputs": [
      {
        "components": [
          { "name": "from", "type": "address" },
          { "name": "to", "type": "address" },
          { "name": "paymentRate", "type": "uint256" },
          { "name": "startTime", "type": "uint256" },
          { "name": "totalAmount", "type": "uint256" },
          { "name": "amountPaid", "type": "uint256" },
          { "name": "isActive", "type": "bool" },
          { "name": "slaId", "type": "uint256" }
        ],
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },

  {
    "inputs": [],
    "name": "slaCounter",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },

  // Events - ONLY ONE VERSION OF EACH
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "name": "slaId", "type": "uint256" },
      { "indexed": true, "name": "serviceProvider", "type": "address" },
      { "indexed": true, "name": "customer", "type": "address" },
      { "indexed": false, "name": "basePaymentRate", "type": "uint256" },
      { "indexed": false, "name": "creationMetricId", "type": "uint256" }
    ],
    "name": "SLACreated",
    "type": "event"
  },
  
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "name": "streamId", "type": "uint256" },
      { "indexed": true, "name": "slaId", "type": "uint256" },
      { "indexed": true, "name": "to", "type": "address" },
      { "indexed": false, "name": "paymentRate", "type": "uint256" }
    ],
    "name": "StreamCreated",
    "type": "event"
  },
  
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "name": "slaId", "type": "uint256" },
      { "indexed": false, "name": "metricId", "type": "uint256" },
      { "indexed": false, "name": "violationType", "type": "string" },
      { "indexed": false, "name": "actualValue", "type": "uint256" },
      { "indexed": false, "name": "threshold", "type": "uint256" },
      { "indexed": false, "name": "violationCount", "type": "uint256" }
    ],
    "name": "ViolationDetected",
    "type": "event"
  },
  
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "name": "slaId", "type": "uint256" },
      { "indexed": false, "name": "oldRate", "type": "uint256" },
      { "indexed": false, "name": "newRate", "type": "uint256" },
      { "indexed": false, "name": "reason", "type": "string" }
    ],
    "name": "PaymentRateAdjusted",
    "type": "event"
  },
  
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "name": "streamId", "type": "uint256" },
      { "indexed": true, "name": "slaId", "type": "uint256" },
      { "indexed": false, "name": "reason", "type": "string" },
      { "indexed": false, "name": "finalViolationCount", "type": "uint256" }
    ],
    "name": "StreamCancelled",
    "type": "event"
  },
  
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "name": "newStreamId", "type": "uint256" },
      { "indexed": true, "name": "slaId", "type": "uint256" },
      { "indexed": false, "name": "newPaymentRate", "type": "uint256" },
      { "indexed": false, "name": "reason", "type": "string" }
    ],
    "name": "StreamRecreated",
    "type": "event"
  },

  {
    "inputs": [
      { "name": "streamId", "type": "uint256" },
      { "name": "amount", "type": "uint256" }
    ],
    "name": "withdrawFromStream",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },

  {
    "inputs": [
      { "name": "streamId", "type": "uint256" }
    ],
    "name": "withdrawAllFromStream",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },

  {
    "inputs": [
      { "name": "streamId", "type": "uint256" }
    ],
    "name": "calculateAvailableBalance",
    "outputs": [
      { "name": "", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },

  {
    "inputs": [
      { "name": "streamId", "type": "uint256" }
    ],
    "name": "getWithdrawalInfo",
    "outputs": [
      { "name": "totalWithdrawn", "type": "uint256" },
      { "name": "availableBalance", "type": "uint256" },
      { "name": "totalStreamAmount", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },

  {
    "inputs": [],
    "name": "getContractBalance",
    "outputs": [
      { "name": "", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },

  // Withdrawal events
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "name": "streamId", "type": "uint256" },
      { "indexed": true, "name": "provider", "type": "address" },
      { "indexed": false, "name": "amount", "type": "uint256" }
    ],
    "name": "WithdrawalExecuted",
    "type": "event"
  },

  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "name": "streamId", "type": "uint256" },
      { "indexed": false, "name": "newBalance", "type": "uint256" }
    ],
    "name": "StreamBalanceUpdated",
    "type": "event"
  }

] as const;
