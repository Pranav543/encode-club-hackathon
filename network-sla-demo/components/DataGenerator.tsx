'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ethers } from 'ethers';
import { useWallet } from '@/hooks/useWallet';
import { AlertTriangle } from 'lucide-react';

export const DataGenerator = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [autoGenerate, setAutoGenerate] = useState(false);
  const { isConnected, chainId } = useWallet();

  const isOnCorrectNetwork = chainId === 31337;
  const canGenerate = isConnected && isOnCorrectNetwork;

  const generateData = async () => {
    if (!canGenerate) return;
    
    setIsGenerating(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const performanceABI = [
        "function generatePerformanceData() external"
      ];

      const contract = new ethers.Contract(
        process.env.NEXT_PUBLIC_PERFORMANCE_CONTRACT_ADDRESS!,
        performanceABI,
        signer
      );

      const tx = await contract.generatePerformanceData();
      await tx.wait();
      
    } catch (error) {
      console.error('Error generating data:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleAutoGenerate = () => {
    if (!canGenerate) return;
    
    setAutoGenerate(!autoGenerate);
    
    if (!autoGenerate) {
      const interval = setInterval(generateData, 5000);
      (window as any).dataGenerationInterval = interval;
    } else {
      if ((window as any).dataGenerationInterval) {
        clearInterval((window as any).dataGenerationInterval);
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Blockchain Data Generator</span>
          <Badge variant={autoGenerate ? "default" : "secondary"}>
            {autoGenerate ? "Auto" : "Manual"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!canGenerate && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <span className="text-sm text-orange-700 dark:text-orange-400">
              {!isConnected ? 'Connect wallet to generate data' : 'Switch to Anvil Local network'}
            </span>
          </div>
        )}
        
        <div className="flex gap-2">
          <Button 
            onClick={generateData} 
            disabled={isGenerating || !canGenerate}
            variant="outline"
          >
            {isGenerating ? 'Generating...' : 'Generate Data Point'}
          </Button>
          <Button 
            onClick={toggleAutoGenerate}
            variant={autoGenerate ? "destructive" : "default"}
            disabled={!canGenerate}
          >
            {autoGenerate ? 'Stop Auto' : 'Start Auto'}
          </Button>
        </div>
        <div className="text-sm text-muted-foreground">
          Generate performance data directly on the blockchain. 
          Auto mode creates a new data point every 5 seconds.
        </div>
      </CardContent>
    </Card>
  );
};
