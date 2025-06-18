"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle, Activity, RefreshCw } from "lucide-react";
import { ethers } from "ethers";
import { provider } from "@/lib/blockchain";
import { NetworkSLACompleteABI } from "@/lib/contracts/NetworkSLACompleteABI";
import { useWallet } from "@/hooks/useWallet";

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
}

export const SLADashboard = () => {
  const [slaData, setSlaData] = useState<SLAData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingCompliance, setIsCheckingCompliance] = useState(false);
  const { isConnected, chainId } = useWallet();

  const isOnCorrectNetwork = chainId === 31337;
  const canInteract = isConnected && isOnCorrectNetwork;

  const fetchLatestSLA = async () => {
    if (!canInteract) return;

    setIsLoading(true);
    try {
      const contract = new ethers.Contract(
        process.env.NEXT_PUBLIC_NETWORK_SLA_ADDRESS!,
        NetworkSLACompleteABI,
        provider
      );

      const slaCounter = await contract.slaCounter();

      if (Number(slaCounter) > 0) {
        const sla = await contract.getSLA(Number(slaCounter));

        setSlaData({
          slaId: Number(slaCounter),
          serviceProvider: sla.serviceProvider,
          customer: sla.customer,
          guaranteedBandwidth: Number(sla.guaranteedBandwidth),
          maxLatency: Number(sla.maxLatency),
          maxViolations: Number(sla.maxViolations),
          penaltyRate: Number(sla.penaltyRate),
          basePaymentRate: Number(sla.basePaymentRate),
          currentPaymentRate: Number(sla.currentPaymentRate),
          violationCount: Number(sla.violationCount),
          startTime: Number(sla.startTime),
          duration: Number(sla.duration),
          isActive: sla.isActive,
          totalPaid: Number(sla.totalPaid),
          streamId: Number(sla.streamId),
          streamRecreationCount: Number(sla.streamRecreationCount),
        });
      }
    } catch (error) {
      console.error("Error fetching SLA data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkSLACompliance = async () => {
    if (!canInteract || !slaData) return;

    setIsCheckingCompliance(true);
    try {
      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      const signer = await browserProvider.getSigner();

      const contract = new ethers.Contract(
        process.env.NEXT_PUBLIC_NETWORK_SLA_ADDRESS!,
        NetworkSLACompleteABI,
        signer
      );

      const tx = await contract.checkSLACompliance(slaData.slaId);
      await tx.wait();

      // Refresh SLA data after compliance check
      setTimeout(fetchLatestSLA, 1000);
    } catch (error) {
      console.error("Error checking SLA compliance:", error);
    } finally {
      setIsCheckingCompliance(false);
    }
  };

  useEffect(() => {
    fetchLatestSLA();

    // Set up periodic refresh
    const interval = setInterval(fetchLatestSLA, 5000);
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
          <div className="py-8">No SLA found. Create one to get started.</div>
        </CardContent>
      </Card>
    );
  }

  const paymentRateReduction = (
    ((slaData.basePaymentRate - slaData.currentPaymentRate) /
      slaData.basePaymentRate) *
    100
  ).toFixed(1);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              SLA Status (ID: {slaData.slaId})
            </div>
            <Button
              onClick={fetchLatestSLA}
              variant="outline"
              size="sm"
              disabled={isLoading}
            >
              <RefreshCw
                className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
              />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Status:</span>
                <Badge variant={slaData.isActive ? "default" : "destructive"}>
                  {slaData.isActive ? "Active" : "Terminated"}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Violations:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm">
                    {slaData.violationCount}/{slaData.maxViolations}
                  </span>
                  {slaData.violationCount >= slaData.maxViolations ? (
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                  ) : (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  )}
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Stream ID:</span>
                <span className="font-mono text-sm">{slaData.streamId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Stream Recreations:</span>
                <span className="font-mono text-sm">
                  {slaData.streamRecreationCount}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Base Rate:</span>
                <span className="font-mono text-sm">
                  {slaData.basePaymentRate} tokens/sec
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Current Rate:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm">
                    {slaData.currentPaymentRate} tokens/sec
                  </span>
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
          <CardTitle className="text-sm">SLA Thresholds</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex justify-between">
              <span>Max Latency:</span>
              <span className="font-mono">{slaData.maxLatency}ms</span>
            </div>
            <div className="flex justify-between">
              <span>Min Bandwidth:</span>
              <span className="font-mono">
                {slaData.guaranteedBandwidth} Mbps
              </span>
            </div>
            <div className="flex justify-between">
              <span>Penalty Rate:</span>
              <span className="font-mono">{slaData.penaltyRate}%</span>
            </div>
            <div className="flex justify-between">
              <span>Max Violations:</span>
              <span className="font-mono">{slaData.maxViolations}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {slaData.isActive && (
        <Button
          onClick={checkSLACompliance}
          disabled={isCheckingCompliance}
          className="w-full"
          variant="outline"
        >
          {isCheckingCompliance ? "Checking..." : "Check SLA Compliance Now"}
        </Button>
      )}
    </div>
  );
};
