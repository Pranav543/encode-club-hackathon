'use client';

import { useState, useEffect } from 'react';

interface PriceData {
  ethToUsd: number;
  lastUpdated: Date;
  isLoading: boolean;
  error: string | null;
}

export const useETHPrice = () => {
  const [priceData, setPriceData] = useState<PriceData>({
    ethToUsd: 3400, // Fallback price for demo
    lastUpdated: new Date(),
    isLoading: false, // Start with fallback immediately for demo
    error: null,
  });

  useEffect(() => {
    const fetchETHPrice = async () => {
      try {
        // Use a more reliable API or implement a local mock for demo
        const response = await fetch(
          'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd&include_last_updated_at=true',
          {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
            },
            // Add timeout
            signal: AbortSignal.timeout(5000)
          }
        );
        
        if (!response.ok) {
          throw new Error('Failed to fetch ETH price');
        }
        
        const data = await response.json();
        const ethPrice = data.ethereum.usd;
        
        setPriceData({
          ethToUsd: ethPrice,
          lastUpdated: new Date(data.ethereum.last_updated_at * 1000),
          isLoading: false,
          error: null,
        });
      } catch (error: any) {
        console.log('Using fallback ETH price for demo');
        // Keep using fallback price for demo - don't show as error
        setPriceData(prev => ({
          ...prev,
          isLoading: false,
          error: null, // Don't show error in demo
        }));
      }
    };

    // Try to fetch real price but don't block demo if it fails
    fetchETHPrice();
    
    // Update every 2 minutes
    const interval = setInterval(fetchETHPrice, 120000);
    
    return () => clearInterval(interval);
  }, []);

  return priceData;
};
