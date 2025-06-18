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

      const tx = await contract.checkSLACompliance(slaId);
      
      toast.loading(
        "Compliance Check Started",
        {id: tx.hash}
      );

      const receipt = await tx.wait();
      
      // Analyze events to determine what happened
      const events = receipt.logs;
      let resultMessage = "No new violations found";
      let violationCount = 0;
      
      events.forEach((log: any) => {
        try {
          const parsed = contract.interface.parseLog(log);
          if (parsed?.name === 'ViolationDetected') {
            violationCount++;
          } else if (parsed?.name === 'PaymentRateAdjusted') {
            resultMessage = `${violationCount} violation(s) detected, penalties applied`;
          } else if (parsed?.name === 'StreamCancelled') {
            resultMessage = `Stream cancelled due to max violations`;
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
      console.error('Error checking compliance:', error);
      
      let errorMessage = 'Failed to check compliance';
      if (error.message.includes('No performance data available')) {
        errorMessage = 'No performance data available. Generate some data points first.';
      } else if (error.message.includes('No new performance data to check')) {
        errorMessage = 'No new data since last check. Generate more data points.';
      }
      
      toast.error(errorMessage ?? "Compliance Check Failed");
      
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
