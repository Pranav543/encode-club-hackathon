export const NetworkSLAABI = [
  {
    "inputs": [
      { "name": "serviceProvider", "type": "address" },
      { "name": "guaranteedBandwidth", "type": "uint256" },
      { "name": "maxLatency", "type": "uint256" },
      { "name": "maxViolations", "type": "uint256" },
      { "name": "penaltyRate", "type": "uint256" },
      { "name": "duration", "type": "uint256" },
      { "name": "basePaymentRate", "type": "uint256" },
      { "name": "totalPayment", "type": "uint256" }
    ],
    "name": "createSLA",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "name": "slaId", "type": "uint256" },
      { "indexed": true, "name": "serviceProvider", "type": "address" }
    ],
    "name": "SLACreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "name": "slaId", "type": "uint256" },
      { "indexed": false, "name": "violationType", "type": "string" }
    ],
    "name": "ViolationDetected",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "name": "slaId", "type": "uint256" },
      { "indexed": false, "name": "oldRate", "type": "uint256" },
      { "indexed": false, "name": "newRate", "type": "uint256" }
    ],
    "name": "PaymentRateAdjusted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "name": "streamId", "type": "uint256" },
      { "indexed": true, "name": "to", "type": "address" }
    ],
    "name": "StreamCreated",
    "type": "event"
  }
] as const;
