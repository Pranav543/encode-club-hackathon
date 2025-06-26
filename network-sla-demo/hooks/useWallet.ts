'use client';

import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';

interface WalletState {
  isConnected: boolean;
  account: string | null;
  chainId: number | null;
  networkName: string | null;
  accountBalance: string | null;
  isConnecting: boolean;
  error: string | null;
  accountIndex: number | null; // Track which demo account is connected
}

export const useWallet = () => {
  const [walletState, setWalletState] = useState<WalletState>({
    isConnected: false,
    account: null,
    chainId: null,
    networkName: null,
    accountBalance: null,
    isConnecting: false,
    error: null,
    accountIndex: null,
  });

  // Anvil default accounts
  const DEMO_ACCOUNTS = [
    '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', // Account 0
    '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', // Account 1
  ];

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

  const fetchAccountBalance = async (account: string): Promise<string> => {
    try {
      const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
      const balance = await provider.getBalance(account);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error('Error fetching balance:', error);
      return '0.0';
    }
  };

  const updateWalletState = useCallback(async () => {
    if (!window.ethereum) return;

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.listAccounts();
      const network = await provider.getNetwork();
      
      if (accounts.length > 0) {
        const currentAccount = accounts[0].address.toLowerCase();
        const accountIndex = DEMO_ACCOUNTS.findIndex(
          addr => addr.toLowerCase() === currentAccount
        );
        
        const balance = await fetchAccountBalance(accounts[0].address);

        setWalletState(prev => ({
          ...prev,
          isConnected: true,
          account: accounts[0].address,
          accountBalance: balance,
          chainId: Number(network.chainId),
          networkName: getNetworkName(Number(network.chainId)),
          accountIndex: accountIndex >= 0 ? accountIndex : null,
          error: null,
        }));
      } else {
        setWalletState(prev => ({
          ...prev,
          isConnected: false,
          account: null,
          accountBalance: null,
          chainId: null,
          networkName: null,
          accountIndex: null,
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

  const connectToAccount = async (accountIndex: 0 | 1) => {
    if (!window.ethereum) {
      setWalletState(prev => ({
        ...prev,
        error: 'MetaMask is not installed',
      }));
      return;
    }

    setWalletState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      const targetAccount = DEMO_ACCOUNTS[accountIndex];
      
      // First ensure we're on the correct network
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      const currentChainId = parseInt(chainId, 16);
      
      if (currentChainId !== ANVIL_CHAIN_ID) {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: ANVIL_NETWORK.chainId }],
          });
        } catch (switchError: any) {
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

      // Request account access
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      // Try to switch to the specific account
      try {
        await window.ethereum.request({
          method: 'wallet_requestPermissions',
          params: [{ eth_accounts: {} }],
        });
        
        // Request to switch to specific account
        await window.ethereum.request({
          method: 'eth_requestAccounts',
          params: [{ account: targetAccount }],
        });
      } catch (switchAccountError) {
        // If direct account switching fails, just connect and let user manually switch
        console.log('Direct account switching not supported, user must manually switch in MetaMask');
      }

      await updateWalletState();
      
      // Check if we got the right account
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.listAccounts();
      const currentAccount = accounts[0]?.address.toLowerCase();
      
      if (currentAccount !== targetAccount.toLowerCase()) {
        setWalletState(prev => ({
          ...prev,
          error: `Please manually switch to Account ${accountIndex} (${targetAccount}) in MetaMask`,
        }));
      }

    } catch (error: any) {
      console.error('Error connecting to account:', error);
      setWalletState(prev => ({
        ...prev,
        error: error.message || 'Failed to connect to account',
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
      accountBalance: null,
      isConnecting: false,
      error: null,
      accountIndex: null,
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

  // Auto-refresh balance every 10 seconds
  useEffect(() => {
    if (walletState.account) {
      const interval = setInterval(async () => {
        const balance = await fetchAccountBalance(walletState.account!);
        setWalletState(prev => ({ ...prev, accountBalance: balance }));
      }, 10000);
      
      return () => clearInterval(interval);
    }
  }, [walletState.account]);

  return {
    ...walletState,
    connectToAccount,
    disconnectWallet,
    switchToAnvil,
    demoAccounts: DEMO_ACCOUNTS,
  };
};
