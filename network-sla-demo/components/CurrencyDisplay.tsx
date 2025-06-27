'use client';

import { useETHPrice } from '@/hooks/useETHPrice';
import { convertETHPerSecondToUSD, convertETHToUSD } from '@/lib/currencyUtils';
import { Badge } from '@/components/ui/badge';
import { TrendingUp } from 'lucide-react';

interface CurrencyDisplayProps {
  ethAmount?: string | number;
  ethPerSecond?: string | number; // Changed from tokensPerSecond
  showETHPrice?: boolean;
  className?: string;
}

export const CurrencyDisplay = ({ 
  ethAmount, 
  ethPerSecond, // Changed from tokensPerSecond
  showETHPrice = false,
  className = "" 
}: CurrencyDisplayProps) => {
  const { ethToUsd, isLoading, error } = useETHPrice();

  if (isLoading) {
    return <span className={className}>Loading...</span>;
  }

  if (error) {
    return <span className={className}>Price unavailable</span>;
  }

  if (ethAmount !== undefined) {
    const converted = convertETHToUSD(ethAmount, ethToUsd);
    return (
      <div className={`${className}`}>
        <span className="font-medium">{converted.usd}</span>
        {showETHPrice && (
          <Badge variant="outline" className="text-xs mt-1">
            ETH: ${ethToUsd.toLocaleString()}
          </Badge>
        )}
      </div>
    );
  }

  if (ethPerSecond !== undefined) {
    const rates = convertETHPerSecondToUSD(ethPerSecond.toString(), ethToUsd);
    return (
      <div className={`${className}`}>
        <span className="font-medium">{rates.formattedUsdPerSecond}/sec</span>
      </div>
    );
  }

  return null;
};

export const ETHPriceIndicator = () => {
  const { ethToUsd, lastUpdated, isLoading, error } = useETHPrice();

  if (isLoading || error) return null;

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <TrendingUp className="h-4 w-4" />
      <span>ETH: ${ethToUsd.toLocaleString()}</span>
      <span className="text-xs">
        Updated: {lastUpdated.toLocaleTimeString()}
      </span>
    </div>
  );
};
