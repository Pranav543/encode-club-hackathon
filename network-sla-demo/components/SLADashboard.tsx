'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle, Activity, RefreshCw } from 'lucide-react';
import { ethers } from 'ethers';
import { provider } from '@/lib/blockchain';
import { NetworkSLACleanABI } from '@/lib/contracts/NetworkSLACleanABI';
import { useWallet } from '@/hooks/useWallet';
import { useETHPrice } from '@/hooks/useETHPrice';
import { convertETHPerSecondToUSD } from '@/lib/currencyUtils';
import { CurrentPaymentRateChart } from './CurrentPaymentRateChart';

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
  // ✅ ALL HOOKS MUST BE CALLED FIRST - NO CONDITIONAL LOGIC BEFORE HOOKS
  const [slaData, setSlaData] = useState<SLAData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const { isConnected, chainId } = useWallet();
  const { ethToUsd, isLoading: priceLoading } = useETHPrice();
  
  // ✅ DERIVED STATE - CALCULATED AFTER ALL HOOKS
  const isOnCorrectNetwork = chainId === 31337;
  const canInteract = isConnected && isOnCorrectNetwork && !priceLoading;

  // ✅ MEMOIZED VALUES - ALL HOOKS CALLED CONSISTENTLY
  const baseRateUSD = useMemo(() => {
    if (!slaData || !ethToUsd) return null;
    return convertETHPerSecondToUSD(slaData.basePaymentRate.toString(), ethToUsd);
  }, [slaData?.basePaymentRate, ethToUsd]);

  const currentRateUSD = useMemo(() => {
    if (!slaData || !ethToUsd) return null;
    return convertETHPerSecondToUSD(slaData.currentPaymentRate.toString(), ethToUsd);
  }, [slaData?.currentPaymentRate, ethToUsd]);

  const penaltyPercentage = useMemo(() => {
    if (!slaData || slaData.basePaymentRate === 0) return '0.0';
    return ((Number(slaData.basePaymentRate) - Number(slaData.currentPaymentRate)) / Number(slaData.basePaymentRate) * 100).toFixed(1);
  }, [slaData?.basePaymentRate, slaData?.currentPaymentRate]);

  // ✅ FUNCTIONS DEFINED AFTER HOOKS
  const fetchLatestSLA = async () => {
    if (!canInteract) return;
    
    const contractAddress = process.env.NEXT_PUBLIC_NETWORK_SLA_ADDRESS;
    if (!contractAddress) {
      setError('SLA contract address not configured');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('📋 Fetching SLA data...');
      const contract = new ethers.Contract(
        contractAddress,
        NetworkSLACleanABI,
        provider
      );

      const slaCounter = await contract.slaCounter();
      console.log('SLA Counter:', slaCounter.toString());
      
      if (Number(slaCounter) > 0) {
        const sla = await contract.getSLA(Number(slaCounter));
        
        const slaData: SLAData = {
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
        };
        
        setSlaData(slaData);
        console.log('✅ SLA data loaded:', slaData);
      } else {
        console.log('📭 No SLAs found');
        setSlaData(null);
      }
    } catch (error: any) {
      console.error('❌ Error fetching SLA data:', error);
      setError(`Failed to fetch SLA: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ ALL EFFECTS AFTER ALL OTHER HOOKS
  // Listen for blockchain events
  useEffect(() => {
    if (!canInteract) return;

    const contractAddress = process.env.NEXT_PUBLIC_NETWORK_SLA_ADDRESS;
    if (!contractAddress) return;

    const contract = new ethers.Contract(
      contractAddress,
      NetworkSLACleanABI,
      provider
    );

    const handleSLACreated = () => {
      console.log('🎉 SLA created event detected');
      setTimeout(() => setRefreshKey(prev => prev + 1), 2000);
    };

    const handleStreamRecreated = () => {
      console.log('🔄 Stream recreated event detected');
      setTimeout(() => setRefreshKey(prev => prev + 1), 1000);
    };

    const handlePaymentRateAdjusted = () => {
      console.log('💰 Payment rate adjusted event detected');
      setTimeout(() => setRefreshKey(prev => prev + 1), 1000);
    };

    try {
      contract.on(contract.filters.SLACreated(), handleSLACreated);
      contract.on(contract.filters.StreamRecreated(), handleStreamRecreated);
      contract.on(contract.filters.PaymentRateAdjusted(), handlePaymentRateAdjusted);
    } catch (error) {
      console.log('Event listening error (non-critical):', error);
    }

    return () => {
      try {
        contract.removeAllListeners();
      } catch (error) {
        console.log('Error removing listeners (non-critical):', error);
      }
    };
  }, [canInteract]);

  // Fetch data when component mounts or refresh is triggered
  useEffect(() => {
    fetchLatestSLA();
  }, [canInteract, refreshKey]);

  // Auto-refresh every 10 seconds
  useEffect(() => {
    if (!canInteract) return;
    
    const interval = setInterval(fetchLatestSLA, 10000);
    return () => clearInterval(interval);
  }, [canInteract]);

  // ✅ CONDITIONAL RENDERING AFTER ALL HOOKS
  if (!canInteract) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <div className="text-center text-muted-foreground">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
            {priceLoading ? 'Loading...' : 'Connect wallet to view SLA data'}
          </div>
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
            SLA Dashboard Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <div className="text-sm text-destructive">{error}</div>
            </div>
            <Button onClick={() => setRefreshKey(prev => prev + 1)} variant="outline" size="sm">
              Retry
            </Button>
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
            <div className="mb-4">No SLA found.</div>
            <div className="text-sm">Create an SLA to get started.</div>
          </div>
        </CardContent>
      </Card>
    );
  }

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
                <div className="text-right">
                  <div className="font-medium">
                    {baseRateUSD?.formattedUsdPerSecond || '$0.00'}/sec
                  </div>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Current Rate:</span>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <div className="font-medium">
                      {currentRateUSD?.formattedUsdPerSecond || '$0.00'}/sec
                    </div>
                  </div>
                  {slaData.currentPaymentRate < slaData.basePaymentRate && (
                    <Badge variant="destructive" className="text-xs">
                      -{penaltyPercentage}%
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

          {/* Payment Rate Comparison - Only show if there are actual violations */}
          {slaData.violationCount > 0 && slaData.currentPaymentRate < slaData.basePaymentRate && baseRateUSD && currentRateUSD && (
            <div className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
              <div className="text-sm space-y-1">
                <div className="flex justify-between font-medium text-red-700 dark:text-red-400">
                  <span>Payment Reduction:</span>
                  <span>-{penaltyPercentage}%</span>
                </div>
                <div className="flex justify-between text-red-600 dark:text-red-500">
                  <span>Hourly Loss:</span>
                  <span>-{(baseRateUSD.usdPerHour - currentRateUSD.usdPerHour).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}/hour</span>
                </div>
                <div className="flex justify-between text-red-600 dark:text-red-500">
                  <span>Daily Loss:</span>
                  <span>-{(baseRateUSD.usdPerDay - currentRateUSD.usdPerDay).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}/day</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <CurrentPaymentRateChart slaData={slaData} />

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
