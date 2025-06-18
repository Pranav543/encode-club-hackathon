'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useBlockchainPerformanceData } from '@/hooks/useBlockchainData';

export const BlockchainPerformanceChart = () => {
  const { performanceData, isLoading } = useBlockchainPerformanceData(
    process.env.NEXT_PUBLIC_PERFORMANCE_CONTRACT_ADDRESS || ""
  );

  const formatData = performanceData.map(item => ({
    time: new Date(item.timestamp * 1000).toLocaleTimeString(),
    latency: item.latency,
    bandwidth: item.bandwidth,
    block: item.blockNumber
  }));

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading blockchain data...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Real-time Blockchain Performance Data</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={formatData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="time" 
                tick={{ fontSize: 12 }}
                interval="preserveStartEnd"
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip 
                labelFormatter={(label) => `Time: ${label}`}
                formatter={(value, name) => [
                  value, 
                  name === 'latency' ? 'Latency (ms)' : 'Bandwidth (Mbps)'
                ]}
              />
              <Line 
                type="monotone" 
                dataKey="latency" 
                stroke="#ef4444" 
                strokeWidth={2}
                name="latency"
                dot={{ r: 3 }}
              />
              <Line 
                type="monotone" 
                dataKey="bandwidth" 
                stroke="#22c55e" 
                strokeWidth={2}
                name="bandwidth"
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 text-sm text-muted-foreground">
          Data points: {formatData.length} | Latest block: {formatData[formatData.length - 1]?.block || 'N/A'}
        </div>
      </CardContent>
    </Card>
  );
};
