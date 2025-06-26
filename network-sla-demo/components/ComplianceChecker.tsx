'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ethers } from 'ethers';
import { useWallet } from '@/hooks/useWallet';
import { NetworkSLAWithStreamRecreationABI } from '@/lib/contracts/NetworkSLAWithStreamRecreationABI';
import { Shield, AlertTriangle, Info } from 'lucide-react';
import { toast } from 'sonner';

interface ComplianceCheckerProps {
  slaId: number | null;
  isActive: boolean;
}

export const ComplianceChecker = ({ slaId, isActive }: ComplianceCheckerProps) => {
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheckTime, setLastCheckTime] = useState<Date | null>(null);
  const [lastCheckResult, setLastCheckResult] = useState<string | null>(null);
  const { isConnected, chainId } = useWallet();
  
  const isOnCorrectNetwork = chainId === 31337;
  const canCheck = isConnected && isOnCorrectNetwork && slaId && isActive;

  const checkCompliance = async () => {
  if (!canCheck) return;
  
  setIsChecking(true);
  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    
    const contract = new ethers.Contract(
      process.env.NEXT_PUBLIC_NETWORK_SLA_ADDRESS!,
      NetworkSLAWithStreamRecreationABI,
      signer
    );

    console.log('🔍 Starting compliance check for SLA:', slaId);
    
    // Get SLA info before checking
    const sla = await contract.getSLA(slaId);
    console.log('📋 SLA Info before compliance check:', {
      violationCount: Number(sla.violationCount),
      basePaymentRate: Number(sla.basePaymentRate),
      currentPaymentRate: Number(sla.currentPaymentRate),
      penaltyRate: Number(sla.penaltyRate),
      creationMetricId: Number(sla.creationMetricId),
      lastCheckedMetricId: Number(sla.lastCheckedMetricId)
    });

    const tx = await contract.checkSLACompliance(slaId);
    
    toast.loading("Compliance Check Started", {
      id: tx.hash,
      description: `Checking SLA compliance. Tx: ${tx.hash}`,
    });

    const receipt = await tx.wait();
    
    // Get SLA info after checking
    const slaAfter = await contract.getSLA(slaId);
    console.log('📋 SLA Info after compliance check:', {
      violationCount: Number(slaAfter.violationCount),
      basePaymentRate: Number(slaAfter.basePaymentRate),
      currentPaymentRate: Number(slaAfter.currentPaymentRate),
      penaltyRate: Number(slaAfter.penaltyRate),
      creationMetricId: Number(slaAfter.creationMetricId),
      lastCheckedMetricId: Number(slaAfter.lastCheckedMetricId)
    });
    
    // Analyze events to determine what happened
    const events = receipt.logs;
    let resultMessage = "No new violations found";
    let violationCount = 0;
    
    events.forEach((log: any) => {
      try {
        const parsed = contract.interface.parseLog(log);
        console.log('📝 Event detected:', parsed?.name, parsed?.args);
        
        if (parsed?.name === 'ViolationDetected') {
          violationCount++;
        } else if (parsed?.name === 'PaymentRateAdjusted') {
          const oldRate = Number(parsed.args?.[1] || 0);
          const newRate = Number(parsed.args?.[2] || 0);
          const reduction = oldRate > 0 ? ((oldRate - newRate) / oldRate * 100).toFixed(1) : '0';
          resultMessage = `${violationCount} violation(s) detected. Payment rate reduced by ${reduction}%`;
        } else if (parsed?.name === 'StreamCancelled') {
          resultMessage = `Stream cancelled due to max violations`;
        } else if (parsed?.name === 'ComplianceChecked') {
          const violationsFound = Number(parsed.args?.[3] || 0);
          if (violationsFound === 0) {
            resultMessage = "Compliance check completed - no violations found";
          }
        }
      } catch (e) {
        // Ignore parsing errors for logs from other contracts
      }
    });
    
    setLastCheckTime(new Date());
    setLastCheckResult(resultMessage);
    
    toast.success("Compliance Check Complete", {
      id: tx.hash,
      description: resultMessage,
    });
    
  } catch (error: any) {
    console.error('❌ Error checking compliance:', error);
    
    let errorMessage = 'Failed to check compliance';
    if (error.message.includes('No new performance data to check')) {
      errorMessage = 'No new data since last check. Generate more data points.';
    } else if (error.message.includes('No performance data available')) {
      errorMessage = 'No performance data available. Generate some data points first.';
    }
    
    toast.error("Compliance Check Failed", {
      description: errorMessage,
    });
    
    setLastCheckResult(`Error: ${errorMessage}`);
  } finally {
    setIsChecking(false);
  }
};

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          SLA Compliance Checker
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!canCheck && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <span className="text-sm text-orange-700 dark:text-orange-400">
              {!slaId ? 'No active SLA found' : 
               !isActive ? 'SLA is terminated' :
               !isConnected ? 'Connect wallet to check compliance' : 
               'Switch to Anvil Local network'}
            </span>
          </div>
        )}
        
        <Button
          onClick={checkCompliance}
          disabled={isChecking || !canCheck}
          className="w-full"
          size="lg"
        >
          {isChecking ? (
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
              Checking Compliance...
            </div>
          ) : (
            'Check SLA Compliance'
          )}
        </Button>
        
        {lastCheckTime && (
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground text-center">
              Last check: {lastCheckTime.toLocaleTimeString()}
            </div>
            {lastCheckResult && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                <Info className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-blue-700 dark:text-blue-400">
                  {lastCheckResult}
                </span>
              </div>
            )}
          </div>
        )}
        
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• Only processes new data points since last check</p>
          <p>• Only counts "violation" data points as actual violations</p>
          <p>• Applies penalties only when violations are found</p>
          <p>• Tracks cumulative violations across multiple checks</p>
        </div>
      </CardContent>
    </Card>
  );
};
