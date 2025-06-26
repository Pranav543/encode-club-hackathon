'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { useBlockchainPerformanceData } from '@/hooks/useBlockchainData';
import { AlertTriangle } from 'lucide-react';

export const BlockchainPerformanceChart = () => {
  const { performanceData, isLoading, error } = useBlockchainPerformanceData(
    process.env.NEXT_PUBLIC_PERFORMANCE_CONTRACT_ADDRESS || ""
  );

  const formatData = performanceData.map((item, index) => ({
    index: index + 1,
    time: new Date(item.timestamp * 1000).toLocaleTimeString(),
    latency: item.latency,
    bandwidth: item.bandwidth,
    block: item.blockNumber,
    dataType: item.dataType,
    isViolation: item.dataType === 'violation'
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{`Time: ${data.time}`}</p>
          <p className="text-slate-600 dark:text-slate-400">{`Latency: ${data.latency}ms`}</p>
          <p className="text-blue-600 dark:text-blue-400">{`Bandwidth: ${data.bandwidth} Mbps`}</p>
          <p className="text-gray-600 dark:text-gray-400">{`Block: ${data.block}`}</p>
          <Badge variant={data.isViolation ? "destructive" : "default"} className="mt-1">
            {data.dataType}
          </Badge>
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading blockchain data...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
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
            <p className="text-sm">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (performanceData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Real-time Blockchain Performance Data</span>
            <Badge variant="secondary">No Data</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-center">
            <div className="space-y-4">
              <div className="text-muted-foreground">
                <div className="text-lg font-medium">No Performance Data Available</div>
                <div className="text-sm mt-2">Generate some data points to see the chart</div>
              </div>
              <div className="flex gap-2 justify-center">
                <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  Good Data
                </Badge>
                <Badge variant="destructive" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                  Violation Data
                </Badge>
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
          <span>Real-time Blockchain Performance Data</span>
          <div className="flex gap-2">
            <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
              Good Data
            </Badge>
            <Badge variant="destructive" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
              Violation Data
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={formatData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis 
                dataKey="index" 
                tick={{ fontSize: 12, fill: '#64748b' }}
                axisLine={{ stroke: '#cbd5e1' }}
                label={{ value: 'Data Point #', position: 'insideBottom', offset: -5, style: { fill: '#64748b' } }}
              />
              <YAxis 
                tick={{ fontSize: 12, fill: '#64748b' }}
                axisLine={{ stroke: '#cbd5e1' }}
              />
              <Tooltip content={<CustomTooltip />} />
              
              {/* Reference lines for typical SLA thresholds */}
              <ReferenceLine 
                y={50} 
                stroke="#94a3b8" 
                strokeDasharray="2 2" 
                label={{ value: "Max Latency (50ms)", position: "top", style: { fill: '#64748b' } }}
              />
              <ReferenceLine 
                y={100} 
                stroke="#3b82f6" 
                strokeDasharray="2 2" 
                label={{ value: "Min Bandwidth (100 Mbps)", position: "top", style: { fill: '#3b82f6' } }}
              />
              
              {/* ✅ UPDATED: Latency Line - Neutral line color with green/red dots */}
              <Line 
                type="monotone" 
                dataKey="latency" 
                stroke="#64748b" 
                strokeWidth={2}
                name="latency"
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
              
              {/* ✅ UPDATED: Bandwidth Line - Neutral line color with green/red dots */}
              <Line 
                type="monotone" 
                dataKey="bandwidth" 
                stroke="#3b82f6" 
                strokeWidth={2}
                name="bandwidth"
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
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 text-sm text-muted-foreground flex justify-between">
          <span>Data points: {formatData.length}</span>
          <span>Latest block: {formatData[formatData.length - 1]?.block || 'N/A'}</span>
        </div>
      </CardContent>
    </Card>
  );
};
