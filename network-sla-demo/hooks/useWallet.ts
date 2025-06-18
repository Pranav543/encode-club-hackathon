'use client';

import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';

interface WalletState {
  isConnected: boolean;
  account: string | null;
  chainId: number | null;
  networkName: string | null;
  isConnecting: boolean;
  error: string | null;
}

export const useWallet = () => {
  const [walletState, setWalletState] = useState<WalletState>({
    isConnected: false,
    account: null,
    chainId: null,
    networkName: null,
    isConnecting: false,
    error: null,
  });

  const ANVIL_CHAIN_ID = 31337;
  const ANVIL_NETWORK = {
    chainId: `0x${ANVIL_CHAIN_ID.toString(16)}`,
    chainName: 'Anvil Local',
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18,
    },
    rpcUrls: ['http://127.0.0.1:8545'],
    blockExplorerUrls: null,
  };

  const getNetworkName = (chainId: number): string => {
    switch (chainId) {
      case 1: return 'Ethereum Mainnet';
      case 5: return 'Goerli Testnet';
      case 11155111: return 'Sepolia Testnet';
      case 137: return 'Polygon Mainnet';
      case 31337: return 'Anvil Local';
      default: return `Chain ${chainId}`;
    }
  };

  const updateWalletState = useCallback(async () => {
    if (!window.ethereum) return;

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.listAccounts();
      const network = await provider.getNetwork();
      
      if (accounts.length > 0) {
        setWalletState(prev => ({
          ...prev,
          isConnected: true,
          account: accounts[0].address,
          chainId: Number(network.chainId),
          networkName: getNetworkName(Number(network.chainId)),
          error: null,
        }));
      } else {
        setWalletState(prev => ({
          ...prev,
          isConnected: false,
          account: null,
          chainId: null,
          networkName: null,
        }));
      }
    } catch (error) {
      console.error('Error updating wallet state:', error);
      setWalletState(prev => ({
        ...prev,
        error: 'Failed to update wallet state',
      }));
    }
  }, []);

  const connectWallet = async () => {
    if (!window.ethereum) {
      setWalletState(prev => ({
        ...prev,
        error: 'MetaMask is not installed',
      }));
      return;
    }

    setWalletState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      // Request account access
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      // Check if we're on the correct network
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      const currentChainId = parseInt(chainId, 16);
      
      if (currentChainId !== ANVIL_CHAIN_ID) {
        try {
          // Try to switch to Anvil network
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: ANVIL_NETWORK.chainId }],
          });
        } catch (switchError: any) {
          // If network doesn't exist, add it
          if (switchError.code === 4902) {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [ANVIL_NETWORK],
            });
          } else {
            throw switchError;
          }
        }
      }

      await updateWalletState();
    } catch (error: any) {
      console.error('Error connecting wallet:', error);
      setWalletState(prev => ({
        ...prev,
        error: error.message || 'Failed to connect wallet',
        isConnecting: false,
      }));
    } finally {
      setWalletState(prev => ({ ...prev, isConnecting: false }));
    }
  };

  const disconnectWallet = () => {
    setWalletState({
      isConnected: false,
      account: null,
      chainId: null,
      networkName: null,
      isConnecting: false,
      error: null,
    });
  };

  const switchToAnvil = async () => {
    if (!window.ethereum) return;

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: ANVIL_NETWORK.chainId }],
      });
    } catch (error: any) {
      if (error.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [ANVIL_NETWORK],
        });
      }
    }
  };

  // Set up event listeners
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnectWallet();
      } else {
        updateWalletState();
      }
    };

    const handleChainChanged = () => {
      updateWalletState();
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    // Check if already connected
    updateWalletState();

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, [updateWalletState]);

  return {
    ...walletState,
    connectWallet,
    disconnectWallet,
    switchToAnvil,
  };
};
