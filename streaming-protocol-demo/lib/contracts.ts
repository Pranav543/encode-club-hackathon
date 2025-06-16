// lib/contracts.ts
import { baseSepolia } from 'wagmi/chains'
import StreamingContractABI from './abis/StreamingContract.json'
import LendingHookABI from './abis/LendingHook.json'
import NetworkSLAABI from './abis/NetworkSLA.json'
import MockOracleABI from './abis/MockPerformanceOracle.json'

// Contract addresses from your deployment
export const STREAMING_CONTRACT_ADDRESS = '0x4ED41C943A6B58Eb55DB9410701FaebF8242fbf2' as const
export const LENDING_HOOK_ADDRESS = '0xCfd4Ed36A7455E8aEC65F2d8bf56342126362Fe3' as const
export const NETWORK_SLA_ADDRESS = '0xB2A663e9d48D2f963e6035E8DAffaE94D2b03bDA' as const
export const MOCK_ORACLE_ADDRESS = '0x6e71b436C416ea169A0efB50Af5bB805b2Ca64ef' as const

// We'll deploy this separately for demo tokens
export const TEST_TOKEN_ADDRESS = '0xf68dbFa5da95e7cd77a4693C71ff87EB7F1F2f74' as const // Update after deploying test token

// Contract ABIs
export const STREAMING_CONTRACT_ABI = StreamingContractABI as const
export const LENDING_HOOK_ABI = LendingHookABI as const
export const NETWORK_SLA_ABI = NetworkSLAABI as const
export const MOCK_ORACLE_ABI = MockOracleABI as const

// Test token ABI (standard ERC20)
export const TEST_TOKEN_ABI = [
  {
    "inputs": [
      {"internalType": "address", "name": "spender", "type": "address"},
      {"internalType": "uint256", "name": "amount", "type": "uint256"}
    ],
    "name": "approve",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "to", "type": "address"},
      {"internalType": "uint256", "name": "amount", "type": "uint256"}
    ],
    "name": "mint",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "symbol",
    "outputs": [{"internalType": "string", "name": "", "type": "string"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const

export const SUPPORTED_CHAIN = baseSepolia
