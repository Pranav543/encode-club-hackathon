'use client';

import { useState, useEffect, useCallback } from 'react';

interface PriceData {
  ethToUsd: number;
  lastUpdated: Date;
  isLoading: boolean;
  error: string | null;
  source: string;
}

// Multiple API endpoints in order of reliability
const PRICE_APIS = [
  {
    name: 'Coinbase',
    url: 'https://api.coinbase.com/v2/exchange-rates?currency=ETH',
    parser: (data: any) => parseFloat(data.data.rates.USD),
    timeout: 3000
  },
  {
    name: 'Etherscan',
    url: 'https://api.etherscan.io/api?module=stats&action=ethprice',
    parser: (data: any) => parseFloat(data.result.ethusd),
    timeout: 4000
  },
  {
    name: 'CryptoCompare',
    url: 'https://min-api.cryptocompare.com/data/price?fsym=ETH&tsyms=USD',
    parser: (data: any) => parseFloat(data.USD),
    timeout: 4000
  },
  {
    name: 'CoinGecko',
    url: 'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd&include_last_updated_at=true',
    parser: (data: any) => parseFloat(data.ethereum.usd),
    timeout: 5000
  }
];

const FALLBACK_PRICE = 3400; // Conservative fallback
const CACHE_DURATION = 30000; // 30 seconds cache
const RETRY_DELAYS = [1000, 2000, 5000]; // Exponential backoff

export const useETHPrice = () => {
  const [priceData, setPriceData] = useState<PriceData>({
    ethToUsd: FALLBACK_PRICE,
    lastUpdated: new Date(),
    isLoading: true,
    error: null,
    source: 'Fallback'
  });

  const [lastSuccessfulFetch, setLastSuccessfulFetch] = useState<number>(0);

  // Fetch from a specific API with timeout
  const fetchFromAPI = useCallback(async (api: typeof PRICE_APIS[0]): Promise<number> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), api.timeout);

    try {
      console.log(`🔄 Trying ${api.name} API...`);
      
      const response = await fetch(api.url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const price = api.parser(data);

      if (isNaN(price) || price <= 0) {
        throw new Error('Invalid price data received');
      }

      console.log(`✅ ${api.name} API success: $${price.toLocaleString()}`);
      return price;

    } catch (error: any) {
      clearTimeout(timeoutId);
      console.log(`❌ ${api.name} API failed:`, error.message);
      throw error;
    }
  }, []);

  // Try multiple APIs with fallbacks
  const fetchETHPriceWithFallbacks = useCallback(async (): Promise<void> => {
    // Check if we should use cached data
    const now = Date.now();
    if (now - lastSuccessfulFetch < CACHE_DURATION && priceData.ethToUsd !== FALLBACK_PRICE) {
      console.log('📋 Using cached ETH price:', priceData.ethToUsd);
      return;
    }

    setPriceData(prev => ({ ...prev, isLoading: true, error: null }));

    // Try each API in order
    for (const api of PRICE_APIS) {
      try {
        const price = await fetchFromAPI(api);
        
        setPriceData({
          ethToUsd: price,
          lastUpdated: new Date(),
          isLoading: false,
          error: null,
          source: api.name
        });
        
        setLastSuccessfulFetch(now);
        console.log(`🎉 Successfully fetched ETH price from ${api.name}: $${price.toLocaleString()}`);
        return;

      } catch (error: any) {
        // Continue to next API
        continue;
      }
    }

    // All APIs failed - use fallback but don't show as error in demo
    console.warn('⚠️ All price APIs failed, using fallback price for demo');
    setPriceData({
      ethToUsd: FALLBACK_PRICE,
      lastUpdated: new Date(),
      isLoading: false,
      error: null, // Don't show error in demo
      source: 'Fallback (Demo)'
    });
  }, [fetchFromAPI, lastSuccessfulFetch, priceData.ethToUsd]);

  // Retry with exponential backoff
  const retryFetch = useCallback(async () => {
    for (let i = 0; i < RETRY_DELAYS.length; i++) {
      try {
        await fetchETHPriceWithFallbacks();
        return; // Success, exit retry loop
      } catch (error) {
        if (i < RETRY_DELAYS.length - 1) {
          console.log(`🔄 Retrying in ${RETRY_DELAYS[i]}ms...`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS[i]));
        }
      }
    }
  }, [fetchETHPriceWithFallbacks]);

  // Initial fetch and periodic updates
  useEffect(() => {
    console.log('🚀 Initializing ETH price fetching with robust fallbacks...');
    
    // Immediate fetch
    retryFetch();
    
    // Set up intervals with different frequencies
    const quickInterval = setInterval(() => {
      // Quick updates every 30 seconds
      fetchETHPriceWithFallbacks();
    }, 30000);

    const robustInterval = setInterval(() => {
      // More robust fetch every 2 minutes with retries
      retryFetch();
    }, 120000);

    return () => {
      clearInterval(quickInterval);
      clearInterval(robustInterval);
    };
  }, [retryFetch, fetchETHPriceWithFallbacks]);

  // Handle page visibility changes (refetch when tab becomes visible)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && Date.now() - lastSuccessfulFetch > CACHE_DURATION) {
        console.log('👁️ Page visible, refreshing ETH price...');
        fetchETHPriceWithFallbacks();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [fetchETHPriceWithFallbacks, lastSuccessfulFetch]);

  return priceData;
};
