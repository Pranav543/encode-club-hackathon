'use client';

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useETHPrice } from '@/hooks/useETHPrice';
import { convertETHPerSecondToUSD } from '@/lib/currencyUtils';
import { TrendingUp, Clock } from 'lucide-react';

interface PaymentRateData {
  timestamp: string;
  time: string;
  baseRate: number;
  currentRate: number;
  penaltyPercentage: number;
}

interface CurrentPaymentRateChartProps {
  slaData?: {
    basePaymentRate: number;
    currentPaymentRate: number;
    violationCount: number;
    isActive: boolean;
  } | null;
}

export const CurrentPaymentRateChart = ({ slaData }: CurrentPaymentRateChartProps) => {
  const [rateHistory, setRateHistory] = useState<PaymentRateData[]>([]);
  const { ethToUsd } = useETHPrice();

  useEffect(() => {
    if (!slaData || !ethToUsd) return;

    const now = new Date();
    const baseRateUSD = convertETHPerSecondToUSD(slaData.basePaymentRate.toString(), ethToUsd);
    const currentRateUSD = convertETHPerSecondToUSD(slaData.currentPaymentRate.toString(), ethToUsd);
    
    const penaltyPercentage = slaData.basePaymentRate > 0 
      ? ((slaData.basePaymentRate - slaData.currentPaymentRate) / slaData.basePaymentRate * 100)
      : 0;

    const newDataPoint: PaymentRateData = {
      timestamp: now.toISOString(),
      time: now.toLocaleTimeString(),
      baseRate: baseRateUSD.usdPerSecond,
      currentRate: currentRateUSD.usdPerSecond,
      penaltyPercentage: penaltyPercentage
    };

    setRateHistory(prev => {
      const updated = [...prev, newDataPoint];
      // Keep only last 20 data points
      return updated.slice(-20);
    });
  }, [slaData?.currentPaymentRate, slaData?.basePaymentRate, ethToUsd]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-gray-900 dark:text-gray-100">{`Time: ${data.time}`}</p>
          <p className="text-blue-600 dark:text-blue-400">
            {`Base Rate: ${data.baseRate.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}/sec`}
          </p>
          <p className="text-purple-600 dark:text-purple-400">
            {`Current Rate: ${data.currentRate.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}/sec`}
          </p>
          {data.penaltyPercentage > 0 && (
            <p className="text-orange-600 dark:text-orange-400">
              {`Penalty: -${data.penaltyPercentage.toFixed(1)}%`}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  if (!slaData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Payment Rate History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-center">
            <div className="text-muted-foreground">
              <Clock className="h-8 w-8 mx-auto mb-2" />
              <div className="text-lg font-medium">No Active SLA</div>
              <div className="text-sm mt-2">Create an SLA to monitor payment rates</div>
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
            Payment Rate History
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="text-blue-600">
              Base Rate
            </Badge>
            <Badge variant="outline" className="text-purple-600">
              Current Rate
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {rateHistory.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-center">
            <div className="text-muted-foreground">
              <Clock className="h-8 w-8 mx-auto mb-2" />
              <div className="text-lg font-medium">Building Rate History</div>
              <div className="text-sm mt-2">Data points will appear as the SLA operates</div>
            </div>
          </div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rateHistory} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
                <XAxis 
                  dataKey="time" 
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  axisLine={{ stroke: '#d1d5db' }}
                />
                <YAxis 
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  axisLine={{ stroke: '#d1d5db' }}
                  label={{ 
                    value: 'USD/sec', 
                    angle: -90, 
                    position: 'insideLeft',
                    style: { textAnchor: 'middle', fill: '#6b7280' }
                  }}
                />
                <Tooltip content={<CustomTooltip />} />
                
                {/* Base Rate Line */}
                <Line 
                  type="monotone" 
                  dataKey="baseRate" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name="Base Rate"
                  dot={false}
                  activeDot={{ r: 4, fill: '#3b82f6' }}
                />
                
                {/* Current Rate Line */}
                <Line 
                  type="monotone" 
                  dataKey="currentRate" 
                  stroke="#8b5cf6" 
                  strokeWidth={3}
                  name="Current Rate"
                  dot={{ fill: '#8b5cf6', r: 3 }}
                  activeDot={{ r: 5, fill: '#8b5cf6' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
        
        {/* Summary Stats */}
        {rateHistory.length > 0 && (
          <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="text-muted-foreground">Data Points</div>
              <div className="font-medium">{rateHistory.length}</div>
            </div>
            <div className="text-center">
              <div className="text-muted-foreground">Latest Rate</div>
              <div className="font-medium">
                {rateHistory[rateHistory.length - 1]?.currentRate.toLocaleString('en-US', { 
                  style: 'currency', 
                  currency: 'USD' 
                })}/sec
              </div>
            </div>
            <div className="text-center">
              <div className="text-muted-foreground">Status</div>
              <div className="font-medium">
                {slaData.isActive ? (
                  <Badge variant="default">Active</Badge>
                ) : (
                  <Badge variant="secondary">Inactive</Badge>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
