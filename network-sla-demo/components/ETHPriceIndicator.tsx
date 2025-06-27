'use client';

import { Badge } from '@/components/ui/badge';
import { useETHPrice } from '@/hooks/useETHPrice';
import { TrendingUp, Wifi, WifiOff, RefreshCw } from 'lucide-react';

export const ETHPriceIndicator = () => {
  const { ethToUsd, lastUpdated, isLoading, error, source } = useETHPrice();

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'Coinbase': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'Etherscan': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'CryptoCompare': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'CoinGecko': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);

    if (diffSecs < 60) return `${diffSecs}s ago`;
    if (diffMins < 60) return `${diffMins}m ago`;
    return date.toLocaleTimeString();
  };

  return (
    <div className="flex items-center gap-3 text-sm">
      <div className="flex items-center gap-2">
        {isLoading ? (
          <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
        ) : error ? (
          <WifiOff className="h-4 w-4 text-red-500" />
        ) : (
          <Wifi className="h-4 w-4 text-green-500" />
        )}
        <TrendingUp className="h-4 w-4 text-gray-600" />
      </div>
      
      <div className="flex items-center gap-2">
        <span className="font-medium">
          ETH: ${ethToUsd.toLocaleString()}
        </span>
        <Badge variant="outline" className={getSourceColor(source)}>
          {source}
        </Badge>
      </div>
      
      <span className="text-muted-foreground text-xs">
        {formatTime(lastUpdated)}
      </span>
    </div>
  );
};
