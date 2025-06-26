import { ethers } from 'ethers';

export interface CurrencyDisplay {
  eth: string;
  usd: string;
  ethRaw: string;
}

export const SECONDS_IN_HOUR = 3600;
export const SECONDS_IN_DAY = 86400;

const truncateDecimals = (value: number, maxDecimals: number = 18): string => {
  const valueStr = value.toString();
  
  if (!valueStr.includes('.')) {
    return valueStr;
  }
  
  const [whole, decimal] = valueStr.split('.');
  const truncatedDecimal = decimal.slice(0, maxDecimals);
  const cleanDecimal = truncatedDecimal.replace(/0+$/, '');
  
  if (cleanDecimal === '') {
    return whole;
  }
  
  return `${whole}.${cleanDecimal}`;
};

const safeParseEther = (ethAmount: number): string => {
  try {
    const truncatedAmount = truncateDecimals(ethAmount, 18);
    return ethers.parseEther(truncatedAmount).toString();
  } catch (error) {
    console.error('Error parsing ETH amount:', ethAmount, error);
    const truncatedAmount = truncateDecimals(ethAmount, 18);
    const weiAmount = parseFloat(truncatedAmount) * 1e18;
    return Math.floor(weiAmount).toString();
  }
};

export const convertETHToUSD = (ethAmount: string | number, ethPrice: number): CurrencyDisplay => {
  const ethValue = typeof ethAmount === 'string' ? parseFloat(ethAmount) : ethAmount;
  const usdValue = ethValue * ethPrice;
  
  return {
    eth: ethValue.toFixed(6),
    usd: usdValue.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
    ethRaw: ethValue.toString(),
  };
};

// FIXED: Convert USD per second to wei per second for contract
export const convertUSDPerSecondToWeiPerSecond = (usdPerSecond: number, ethPrice: number): {
  ethPerSecond: number;
  weiPerSecond: string;
  totalETHForDuration: (duration: number) => number;
  totalWeiForDuration: (duration: number) => string;
} => {
  console.log('🔄 Converting USD to ETH/Wei:', {
    usdPerSecond,
    ethPrice
  });

  const ethPerSecond = usdPerSecond / ethPrice;
  const weiPerSecond = safeParseEther(ethPerSecond);
  
  console.log('✅ Conversion result:', {
    ethPerSecond: truncateDecimals(ethPerSecond, 18),
    weiPerSecond
  });
  
  return {
    ethPerSecond,
    weiPerSecond,
    totalETHForDuration: (duration: number) => ethPerSecond * duration,
    totalWeiForDuration: (duration: number) => {
      const totalETH = ethPerSecond * duration;
      return safeParseEther(totalETH);
    }
  };
};

export const convertETHPerSecondToUSD = (weiPerSecond: string | number, ethPrice: number): {
  usdPerSecond: number;
  usdPerHour: number;
  usdPerDay: number;
  formattedUsdPerSecond: string;
  formattedUsdPerHour: string;
  formattedUsdPerDay: string;
  ethPerSecond: number;
} => {
  try {
    const weiPerSecondBN = typeof weiPerSecond === 'string' ? 
      BigInt(weiPerSecond) : BigInt(weiPerSecond.toString());
    const ethPerSecond = parseFloat(ethers.formatEther(weiPerSecondBN));
    
    const usdPerSecond = ethPerSecond * ethPrice;
    const usdPerHour = usdPerSecond * SECONDS_IN_HOUR;
    const usdPerDay = usdPerSecond * SECONDS_IN_DAY;
    
    return {
      usdPerSecond,
      usdPerHour,
      usdPerDay,
      ethPerSecond,
      formattedUsdPerSecond: usdPerSecond.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 4,
      }),
      formattedUsdPerHour: usdPerHour.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
      formattedUsdPerDay: usdPerDay.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    };
  } catch (error) {
    console.error('Error converting ETH per second to USD:', error);
    return {
      usdPerSecond: 0,
      usdPerHour: 0,
      usdPerDay: 0,
      ethPerSecond: 0,
      formattedUsdPerSecond: '$0.00',
      formattedUsdPerHour: '$0.00',
      formattedUsdPerDay: '$0.00',
    };
  }
};

export const parseUSDInput = (usdInput: string): number => {
  const cleaned = usdInput.replace(/[$,]/g, '');
  return parseFloat(cleaned) || 0;
};
