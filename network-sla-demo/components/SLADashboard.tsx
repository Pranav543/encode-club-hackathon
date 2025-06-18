'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle, Activity, RefreshCw } from 'lucide-react';
import { ethers } from 'ethers';
import { provider } from '@/lib/blockchain';
import { NetworkSLAWithStreamRecreationABI } from '@/lib/contracts/NetworkSLAWithStreamRecreationABI';
import { useWallet } from '@/hooks/useWallet';

interface SLAData {
  slaId: number;
  serviceProvider: string;
  customer: string;
  guaranteedBandwidth: number;
  maxLatency: number;
  maxViolations: number;
  penaltyRate: number;
  basePaymentRate: number;
  currentPaymentRate: number;
  violationCount: number;
  startTime: number;
  duration: number;
  isActive: boolean;
  totalPaid: number;
  streamId: number;
  streamRecreationCount: number;
  creationMetricId: number;
  lastCheckedMetricId: number;
}

export const SLADashboard = () => {
  const [slaData, setSlaData] = useState<SLAData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0); // Force refresh trigger
  const { isConnected, chainId } = useWallet();
  
  const isOnCorrectNetwork = chainId === 31337;
  const canInteract = isConnected && isOnCorrectNetwork;

  const fetchLatestSLA = async () => {
    if (!canInteract) return;
    
    setIsLoading(true);
    try {
      const contract = new ethers.Contract(
        process.env.NEXT_PUBLIC_NETWORK_SLA_ADDRESS!,
        NetworkSLAWithStreamRecreationABI,
        provider
      );

      const slaCounter = await contract.slaCounter();
      
      if (Number(slaCounter) > 0) {
        const sla = await contract.getSLA(Number(slaCounter));
        
        setSlaData({
          slaId: Number(slaCounter),
          serviceProvider: sla.serviceProvider || '',
          customer: sla.customer || '',
          guaranteedBandwidth: Number(sla.guaranteedBandwidth) || 0,
          maxLatency: Number(sla.maxLatency) || 0,
          maxViolations: Number(sla.maxViolations) || 0,
          penaltyRate: Number(sla.penaltyRate) || 0,
          basePaymentRate: Number(sla.basePaymentRate) || 0,
          currentPaymentRate: Number(sla.currentPaymentRate) || 0,
          violationCount: Number(sla.violationCount) || 0,
          startTime: Number(sla.startTime) || 0,
          duration: Number(sla.duration) || 0,
          isActive: Boolean(sla.isActive),
          totalPaid: Number(sla.totalPaid) || 0,
          streamId: Number(sla.currentStreamId) || 0,
          streamRecreationCount: Number(sla.streamRecreationCount) || 0,
          creationMetricId: Number(sla.creationMetricId) || 0,
          lastCheckedMetricId: Number(sla.lastCheckedMetricId) || 0
        });
      }
    } catch (error) {
      console.error('Error fetching SLA data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Listen for blockchain events to trigger refresh
  useEffect(() => {
    if (!canInteract) return;

    const contract = new ethers.Contract(
      process.env.NEXT_PUBLIC_NETWORK_SLA_ADDRESS!,
      NetworkSLAWithStreamRecreationABI,
      provider
    );

    const handleStreamRecreated = () => {
      console.log('Stream recreated event detected, refreshing dashboard...');
      setRefreshKey(prev => prev + 1); // Trigger refresh
    };

    const handlePaymentRateAdjusted = () => {
      console.log('Payment rate adjusted event detected, refreshing dashboard...');
      setRefreshKey(prev => prev + 1); // Trigger refresh
    };

    const handleStreamCancelled = () => {
      console.log('Stream cancelled event detected, refreshing dashboard...');
      setRefreshKey(prev => prev + 1); // Trigger refresh
    };

    contract.on('StreamRecreated', handleStreamRecreated);
    contract.on('PaymentRateAdjusted', handlePaymentRateAdjusted);
    contract.on('StreamCancelled', handleStreamCancelled);

    return () => {
      contract.removeAllListeners();
    };
  }, [canInteract]);

  // Fetch data when component mounts or refresh is triggered
  useEffect(() => {
    fetchLatestSLA();
  }, [canInteract, refreshKey]);

  // Auto-refresh every 3 seconds
  useEffect(() => {
    const interval = setInterval(fetchLatestSLA, 3000);
    return () => clearInterval(interval);
  }, [canInteract]);

  if (!canInteract) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <div className="text-center text-muted-foreground">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
            Connect wallet to view SLA data
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <div className="text-muted-foreground">Loading SLA data...</div>
        </CardContent>
      </Card>
    );
  }

  if (!slaData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            SLA Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center text-muted-foreground">
          <div className="py-8">
            No SLA found. Create one to get started.
          </div>
        </CardContent>
      </Card>
    );
  }

  // Safe calculation to avoid NaN
  const paymentRateReduction = slaData.basePaymentRate > 0 
    ? ((slaData.basePaymentRate - slaData.currentPaymentRate) / slaData.basePaymentRate * 100).toFixed(1)
    : '0.0';

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              SLA Status (ID: {String(slaData.slaId)})
            </div>
            <Button
              onClick={() => setRefreshKey(prev => prev + 1)}
              variant="outline"
              size="sm"
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Status:</span>
                <Badge variant={slaData.isActive ? 'default' : 'destructive'}>
                  {slaData.isActive ? 'Active' : 'Terminated'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Violations:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm">
                    {String(slaData.violationCount)}/{String(slaData.maxViolations)}
                  </span>
                  {slaData.violationCount >= slaData.maxViolations ? (
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                  ) : (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  )}
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Current Stream:</span>
                <span className="font-mono text-sm">#{String(slaData.streamId)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Recreations:</span>
                <span className="font-mono text-sm">{String(slaData.streamRecreationCount)}</span>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Base Rate:</span>
                <span className="font-mono text-sm">{String(slaData.basePaymentRate)} tokens/sec</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Current Rate:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm">{String(slaData.currentPaymentRate)} tokens/sec</span>
                  {slaData.currentPaymentRate < slaData.basePaymentRate && (
                    <Badge variant="destructive" className="text-xs">
                      -{paymentRateReduction}%
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Provider:</span>
                <code className="text-xs bg-muted px-1 rounded">
                  {slaData.serviceProvider.slice(0, 8)}...
                </code>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">SLA Thresholds & Tracking</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Max Latency:</span>
                <span className="font-mono">{String(slaData.maxLatency)}ms</span>
              </div>
              <div className="flex justify-between">
                <span>Min Bandwidth:</span>
                <span className="font-mono">{String(slaData.guaranteedBandwidth)} Mbps</span>
              </div>
              <div className="flex justify-between">
                <span>Penalty Rate:</span>
                <span className="font-mono">{String(slaData.penaltyRate)}%</span>
              </div>
              <div className="flex justify-between">
                <span>Max Violations:</span>
                <span className="font-mono">{String(slaData.maxViolations)}</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Created at Metric:</span>
                <span className="font-mono">#{String(slaData.creationMetricId)}</span>
              </div>
              <div className="flex justify-between">
                <span>Last Checked:</span>
                <span className="font-mono">#{String(slaData.lastCheckedMetricId)}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                Only checks data generated after creation
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
