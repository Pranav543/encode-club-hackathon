import { ethers } from 'ethers';

export const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'http://127.0.0.1:8545';
export const CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '31337');

export const provider = new ethers.JsonRpcProvider(RPC_URL);

export const getContracts = () => ({
  streamingContract: process.env.NEXT_PUBLIC_STREAMING_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000',
  networkSLA: process.env.NEXT_PUBLIC_NETWORK_SLA_ADDRESS || '0x0000000000000000000000000000000000000000',
  testToken: process.env.NEXT_PUBLIC_TEST_TOKEN_ADDRESS || '0x0000000000000000000000000000000000000000',
});
