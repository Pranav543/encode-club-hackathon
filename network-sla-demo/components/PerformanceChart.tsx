'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface PerformanceData {
  timestamp: string;
  latency: number;
  bandwidth: number;
}

export const PerformanceChart = () => {
  const [data, setData] = useState<PerformanceData[]>([]);

  useEffect(() => {
    // Simulate real-time performance data
    const interval = setInterval(() => {
      const now = new Date();
      const newData = {
        timestamp: now.toLocaleTimeString(),
        latency: Math.floor(Math.random() * 50) + 10, // 10-60ms
        bandwidth: Math.floor(Math.random() * 50) + 80, // 80-130 Mbps
      };

      setData(prev => [...prev.slice(-19), newData]); // Keep last 20 points
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Real-time Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="timestamp" 
                tick={{ fontSize: 12 }}
                interval="preserveStartEnd"
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey="latency" 
                stroke="#ef4444" 
                strokeWidth={2}
                name="Latency (ms)"
              />
              <Line 
                type="monotone" 
                dataKey="bandwidth" 
                stroke="#22c55e" 
                strokeWidth={2}
                name="Bandwidth (Mbps)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
