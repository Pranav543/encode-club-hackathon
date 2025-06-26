'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { provider } from '@/lib/blockchain';
import { NetworkSLACleanABI } from '@/lib/contracts/NetworkSLACleanABI';

export const useContractBalance = (contractAddress: string) => {
  const [balance, setBalance] = useState<string>('0.0');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchBalance = async () => {
      if (!contractAddress) return;
      
      try {
        // Get balance directly from contract
        const contractBalance = await provider.getBalance(contractAddress);
        setBalance(ethers.formatEther(contractBalance));
        
        // Also try to get from contract function if available
        try {
          const contract = new ethers.Contract(contractAddress, NetworkSLACleanABI, provider);
          const contractReportedBalance = await contract.getContractBalance();
          
          // Use contract reported balance if it differs (more accurate)
          if (contractReportedBalance !== contractBalance) {
            setBalance(ethers.formatEther(contractReportedBalance));
          }
        } catch (error) {
          // If contract function fails, use direct balance query
          console.log('Using direct balance query');
        }
        
      } catch (error) {
        console.error('Error fetching contract balance:', error);
        setBalance('0.0');
      } finally {
        setIsLoading(false);
      }
    };

    fetchBalance();
    
    // Refresh balance every 10 seconds
    const interval = setInterval(fetchBalance, 10000);
    return () => clearInterval(interval);
  }, [contractAddress]);

  return { balance, isLoading };
};
