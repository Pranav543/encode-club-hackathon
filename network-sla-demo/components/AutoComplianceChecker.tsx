'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ethers } from 'ethers';
import { NetworkSLACompleteABI } from '@/lib/contracts/NetworkSLACompleteABI';
import { useWallet } from '@/hooks/useWallet';
import { Activity, Play, Pause } from 'lucide-react';

export const AutoComplianceChecker = () => {
  const [isAutoChecking, setIsAutoChecking] = useState(false);
  const [lastCheckTime, setLastCheckTime] = useState<Date | null>(null);
  const { isConnected, chainId } = useWallet();
  
  const isOnCorrectNetwork = chainId === 31337;
  const canAutoCheck = isConnected && isOnCorrectNetwork;

  const checkAllSLAs = async () => {
    if (!canAutoCheck) return;
    
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      const contract = new ethers.Contract(
        process.env.NEXT_PUBLIC_NETWORK_SLA_ADDRESS!,
        NetworkSLACompleteABI,
        signer
      );

      const tx = await contract.checkAllActiveSLAs();
      await tx.wait();
      
      setLastCheckTime(new Date());
      
    } catch (error) {
      console.error('Error checking SLAs:', error);
    }
  };

  const toggleAutoCheck = () => {
    setIsAutoChecking(!isAutoChecking);
    
    if (!isAutoChecking) {
      // Start auto-checking every 10 seconds
      const interval = setInterval(checkAllSLAs, 10000);
      (window as any).complianceCheckInterval = interval;
      
      // Do initial check
      checkAllSLAs();
    } else {
      // Stop auto-checking
      if ((window as any).complianceCheckInterval) {
        clearInterval((window as any).complianceCheckInterval);
      }
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if ((window as any).complianceCheckInterval) {
        clearInterval((window as any).complianceCheckInterval);
      }
    };
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Auto Compliance Checker
          </div>
          <Badge variant={isAutoChecking ? "default" : "secondary"}>
            {isAutoChecking ? "Running" : "Stopped"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button
            onClick={checkAllSLAs}
            disabled={!canAutoCheck}
            variant="outline"
            className="flex-1"
          >
            Check Now
          </Button>
          <Button
            onClick={toggleAutoCheck}
            disabled={!canAutoCheck}
            variant={isAutoChecking ? "destructive" : "default"}
            className="flex-1"
          >
            {isAutoChecking ? (
              <>
                <Pause className="h-4 w-4 mr-2" />
                Stop Auto
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Start Auto
              </>
            )}
          </Button>
        </div>
        
        {lastCheckTime && (
          <div className="text-sm text-muted-foreground">
            Last check: {lastCheckTime.toLocaleTimeString()}
          </div>
        )}
        
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• Automatically checks all SLAs for violations every 10 seconds</p>
          <p>• Compares latest performance data against SLA thresholds</p>
          <p>• Triggers automatic stream cancellation when max violations reached</p>
        </div>
      </CardContent>
    </Card>
  );
};
