'use client';

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useBlockchainPerformanceData } from '@/hooks/useBlockchainData';
import { useETHPrice } from '@/hooks/useETHPrice';
import { convertETHPerSecondToUSD } from '@/lib/currencyUtils';
import { AlertTriangle, TrendingUp, Activity } from 'lucide-react';

interface CombinedDataPoint {
  index: number;
  time: string;
  latency: number;
  bandwidth: number;
  block: number;
  dataType: string;
  isViolation: boolean;
  currentPaymentRate?: number; // Scaled for display
  currentPaymentRateRaw?: number; // Actual USD value
}

interface CombinedPerformancePaymentChartProps {
  slaData?: {
    basePaymentRate: number;
    currentPaymentRate: number;
    violationCount: number;
    isActive: boolean;
  } | null;
}

export const CombinedPerformancePaymentChart = ({ slaData }: CombinedPerformancePaymentChartProps) => {
  const { performanceData, isLoading: perfLoading, error: perfError } = useBlockchainPerformanceData(
    process.env.NEXT_PUBLIC_PERFORMANCE_CONTRACT_ADDRESS || ""
  );
  const { ethToUsd } = useETHPrice();
  const [combinedData, setCombinedData] = useState<CombinedDataPoint[]>([]);

  useEffect(() => {
    if (!performanceData.length) {
      setCombinedData([]);
      return;
    }

    console.log('🔄 Processing combined chart data:', { 
      performanceDataLength: performanceData.length, 
      hasSlaData: !!slaData,
      ethToUsd 
    });

    const formattedData: CombinedDataPoint[] = performanceData.map((item, index) => {
      const baseData = {
        index: index + 1,
        time: new Date(item.timestamp * 1000).toLocaleTimeString(),
        latency: item.latency,
        bandwidth: item.bandwidth,
        block: item.blockNumber,
        dataType: item.dataType,
        isViolation: item.dataType === 'violation'
      };

      // Add payment rate data if SLA exists and ETH price is available
      if (slaData && ethToUsd) {
        const currentRateUSD = convertETHPerSecondToUSD(slaData.currentPaymentRate.toString(), ethToUsd);
        
        // Scale payment rate to make it visible alongside performance metrics
        // Use multiplier of 20 to make it more visible
        const currentPaymentRateScaled = currentRateUSD.usdPerSecond * 20;

        console.log(`📊 Data point ${index + 1}:`, {
          currentPaymentRateWei: slaData.currentPaymentRate,
          currentPaymentRateUSD: currentRateUSD.usdPerSecond,
          currentPaymentRateScaled,
          latency: item.latency,
          bandwidth: item.bandwidth
        });

        return {
          ...baseData,
          currentPaymentRate: currentPaymentRateScaled,
          currentPaymentRateRaw: currentRateUSD.usdPerSecond
        };
      }

      return baseData;
    });

    console.log('✅ Final combined data:', formattedData.slice(0, 2)); // Log first 2 items for debugging
    setCombinedData(formattedData);
  }, [performanceData, slaData, ethToUsd]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-gray-900 dark:text-gray-100">{`Time: ${data.time}`}</p>
          <p className="text-purple-600 dark:text-purple-400">{`Latency: ${data.latency}ms`}</p>
          <p className="text-blue-600 dark:text-blue-400">{`Bandwidth: ${data.bandwidth} Mbps`}</p>
          <p className="text-gray-600 dark:text-gray-400">{`Block: ${data.block}`}</p>
          
          {/* Payment Rate Info */}
          {data.currentPaymentRateRaw !== undefined && (
            <>
              <hr className="my-2" />
              <p className="text-orange-600 dark:text-orange-400">
                {`Payment Rate: ${data.currentPaymentRateRaw.toLocaleString("en-US", {
                  style: "currency",
                  currency: "USD",
                })}/sec`}
              </p>
            </>
          )}
          
          <Badge variant={data.isViolation ? "destructive" : "default"} className="mt-1">
            {data.dataType}
          </Badge>
        </div>
      );
    }
    return null;
  };

  if (perfLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading performance data...</div>
        </CardContent>
      </Card>
    );
  }

  if (perfError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Performance Data Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">
            <p className="mb-2">Failed to load performance data</p>
            <p className="text-sm">{perfError}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (combinedData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Real-time Performance & Payment Monitor</span>
            <Badge variant="secondary">No Data</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center text-center">
            <div className="space-y-4">
              <div className="text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-4" />
                <div className="text-lg font-medium">No Data Available</div>
                <div className="text-sm mt-2">Generate performance data to see the combined chart</div>
              </div>
              <div className="flex gap-2 justify-center flex-wrap">
                <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  Good Data
                </Badge>
                <Badge variant="destructive" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                  Violation Data
                </Badge>
                <Badge variant="outline" className="bg-purple-50 text-purple-700 dark:bg-purple-900 dark:text-purple-200">
                  Latency
                </Badge>
                <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-200">
                  Bandwidth
                </Badge>
                {slaData && (
                  <Badge variant="outline" className="bg-orange-50 text-orange-700 dark:bg-orange-900 dark:text-orange-200">
                    Payment Rate
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            <span>Real-time Performance & Payment Monitor</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
              Good Data
            </Badge>
            <Badge variant="destructive" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
              Violation Data
            </Badge>
            <Badge variant="outline" className="bg-purple-50 text-purple-700 dark:bg-purple-900 dark:text-purple-200">
              Latency
            </Badge>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-200">
              Bandwidth
            </Badge>
            {slaData && (
              <Badge variant="outline" className="bg-orange-50 text-orange-700 dark:bg-orange-900 dark:text-orange-200">
                Payment Rate
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={combinedData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              
              <XAxis 
                dataKey="index" 
                tick={{ fontSize: 12, fill: '#64748b' }}
                axisLine={{ stroke: '#cbd5e1' }}
                label={{ 
                  value: 'Data Point #', 
                  position: 'insideBottom', 
                  offset: -5, 
                  style: { fill: '#64748b' } 
                }}
              />
              
              <YAxis 
                tick={{ fontSize: 12, fill: '#64748b' }}
                axisLine={{ stroke: '#cbd5e1' }}
                label={{ 
                  value: 'Performance Metrics', 
                  angle: -90, 
                  position: 'insideLeft', 
                  style: { fill: '#64748b' } 
                }}
              />
              
              <Tooltip content={<CustomTooltip />} />
              
              {/* Reference lines for SLA thresholds */}
              <ReferenceLine 
                y={50} 
                stroke="#94a3b8" 
                strokeDasharray="2 2" 
                label={{ 
                  value: "Max Latency (50ms)", 
                  position: "top", 
                  style: { fill: '#64748b', fontSize: 12 } 
                }}
              />
              <ReferenceLine 
                y={100} 
                stroke="#94a3b8" 
                strokeDasharray="2 2" 
                label={{ 
                  value: "Min Bandwidth (100 Mbps)", 
                  position: "top", 
                  style: { fill: '#64748b', fontSize: 12 } 
                }}
              />
              
              {/* Line 1: Latency - Vibrant Purple */}
              <Line 
                type="monotone" 
                dataKey="latency" 
                stroke="#8b5cf6" 
                strokeWidth={3}
                name="Latency (ms)"
                dot={(props: any) => {
                  const { cx, cy, payload, key } = props;
                  return (
                    <circle 
                      key={key}
                      cx={cx} 
                      cy={cy} 
                      r={4} 
                      fill={payload.dataType === 'good' ? '#22c55e' : '#ef4444'}
                      stroke={payload.dataType === 'good' ? '#16a34a' : '#dc2626'}
                      strokeWidth={2}
                    />
                  );
                }}
              />
              
              {/* Line 2: Bandwidth - Vibrant Blue */}
              <Line 
                type="monotone" 
                dataKey="bandwidth" 
                stroke="#3b82f6" 
                strokeWidth={3}
                name="Bandwidth (Mbps)"
                dot={(props: any) => {
                  const { cx, cy, payload, key } = props;
                  return (
                    <circle 
                      key={key}
                      cx={cx} 
                      cy={cy} 
                      r={4} 
                      fill={payload.dataType === 'good' ? '#22c55e' : '#ef4444'}
                      stroke={payload.dataType === 'good' ? '#16a34a' : '#dc2626'}
                      strokeWidth={2}
                    />
                  );
                }}
              />
              
              {/* Line 3: Current Payment Rate - Vibrant Orange (only if SLA data exists) */}
              {slaData && (
                <Line 
                  type="monotone" 
                  dataKey="currentPaymentRate" 
                  stroke="#ea580c" 
                  strokeWidth={4}
                  name="Payment Rate (×20 USD/sec)"
                  dot={{ fill: '#ea580c', r: 4 }}
                  activeDot={{ r: 6, fill: '#ea580c', stroke: '#c2410c', strokeWidth: 2 }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        {/* Enhanced Summary Stats */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
          <div className="text-center">
            <div className="text-muted-foreground">Data Points</div>
            <div className="font-medium">{combinedData.length}</div>
          </div>
          <div className="text-center">
            <div className="text-muted-foreground">Latest Block</div>
            <div className="font-medium">{combinedData[combinedData.length - 1]?.block || 'N/A'}</div>
          </div>
          <div className="text-center">
            <div className="text-muted-foreground">Latest Latency</div>
            <div className="font-medium">{combinedData[combinedData.length - 1]?.latency || 'N/A'}ms</div>
          </div>
          <div className="text-center">
            <div className="text-muted-foreground">Latest Bandwidth</div>
            <div className="font-medium">{combinedData[combinedData.length - 1]?.bandwidth || 'N/A'} Mbps</div>
          </div>
          {slaData && (
            <div className="text-center">
              <div className="text-muted-foreground">Payment Rate</div>
              <div className="font-medium">
                {combinedData[combinedData.length - 1]?.currentPaymentRateRaw?.toLocaleString('en-US', { 
                  style: 'currency', 
                  currency: 'USD' 
                }) + '/sec' || 'N/A'}
              </div>
            </div>
          )}
        </div>

        {/* Enhanced Legend */}
        <div className="mt-4 flex flex-wrap gap-4 text-sm justify-center">
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-purple-500"></div>
            <span>Latency (ms)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-blue-500"></div>
            <span>Bandwidth (Mbps)</span>
          </div>
          {slaData && (
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-orange-600"></div>
              <span>Payment Rate (×20 USD/sec)</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span>Good Data</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span>Violation Data</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
