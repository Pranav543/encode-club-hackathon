"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { useBlockchainPerformanceData } from "@/hooks/useBlockchainData";

export const BlockchainPerformanceChart = () => {
  const { performanceData, isLoading } = useBlockchainPerformanceData(
    process.env.NEXT_PUBLIC_PERFORMANCE_CONTRACT_ADDRESS || ""
  );

  const formatData = performanceData.map((item, index) => ({
    index: index + 1,
    time: new Date(item.timestamp * 1000).toLocaleTimeString(),
    latency: item.latency,
    bandwidth: item.bandwidth,
    block: item.blockNumber,
    dataType: item.dataType,
    isViolation: item.dataType === "violation",
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{`Time: ${data.time}`}</p>
          <p className="text-red-600">{`Latency: ${data.latency}ms`}</p>
          <p className="text-green-600">{`Bandwidth: ${data.bandwidth} Mbps`}</p>
          <p className="text-blue-600">{`Block: ${data.block}`}</p>
          <Badge
            variant={data.isViolation ? "destructive" : "default"}
            className="mt-1"
          >
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
          <div className="text-muted-foreground">
            Loading blockchain data...
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
            <Badge variant="default">Good Data</Badge>
            <Badge variant="destructive">Violation Data</Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={formatData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="index"
                tick={{ fontSize: 12 }}
                label={{
                  value: "Data Point #",
                  position: "insideBottom",
                  offset: -5,
                }}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />

              {/* Reference lines for typical SLA thresholds */}
              <ReferenceLine
                y={50}
                stroke="#ef4444"
                strokeDasharray="2 2"
                label="Max Latency (50ms)"
              />
              <ReferenceLine
                y={100}
                stroke="#22c55e"
                strokeDasharray="2 2"
                label="Min Bandwidth (100 Mbps)"
              />

              <Line
                type="monotone"
                dataKey="latency"
                stroke="#ef4444"
                strokeWidth={2}
                name="latency"
                dot={(props: any) => {
                  const { cx, cy, payload, index } = props;
                  return (
                    <circle
                      key={`latency-dot-${index}`}
                      cx={cx}
                      cy={cy}
                      r={4}
                      fill={payload.isViolation ? "#dc2626" : "#ef4444"}
                      stroke={payload.isViolation ? "#7f1d1d" : "#dc2626"}
                      strokeWidth={2}
                    />
                  );
                }}
              />
              <Line
                type="monotone"
                dataKey="bandwidth"
                stroke="#22c55e"
                strokeWidth={2}
                name="bandwidth"
                dot={(props: any) => {
                  const { cx, cy, payload, index } = props;
                  return (
                    <circle
                      key={`bandwidth-dot-${index}`}
                      cx={cx}
                      cy={cy}
                      r={4}
                      fill={payload.isViolation ? "#dc2626" : "#22c55e"}
                      stroke={payload.isViolation ? "#7f1d1d" : "#16a34a"}
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
          <span>
            Latest block: {formatData[formatData.length - 1]?.block || "N/A"}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};
