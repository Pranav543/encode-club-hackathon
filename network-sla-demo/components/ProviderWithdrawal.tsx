'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useWallet } from '@/hooks/useWallet';
import { useETHPrice } from '@/hooks/useETHPrice';
import { CurrencyDisplay } from '@/components/CurrencyDisplay';
import { toast } from 'sonner'; // Updated import
import { ethers } from 'ethers';
import { provider } from '@/lib/blockchain';
import { NetworkSLACleanABI } from '@/lib/contracts/NetworkSLACleanABI';
import { Wallet, Download, AlertTriangle, DollarSign, RefreshCw } from 'lucide-react';

interface StreamInfo {
  streamId: number;
  slaId: number;
  totalWithdrawn: string;
  availableBalance: string;
  totalStreamAmount: string;
  isActive: boolean;
}

export const ProviderWithdrawal = () => {
  const [availableStreams, setAvailableStreams] = useState<StreamInfo[]>([]);
  const [isWithdrawing, setIsWithdrawing] = useState<{ [key: number]: boolean }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [customAmounts, setCustomAmounts] = useState<{ [key: number]: string }>({});
  const { isConnected, account, accountIndex, chainId } = useWallet();
  const { ethToUsd } = useETHPrice();

  const isServiceProvider = accountIndex === 1;
  const isOnCorrectNetwork = chainId === 31337;
  const canWithdraw = isConnected && isServiceProvider && isOnCorrectNetwork;

  const fetchProviderStreams = async () => {
    if (!canWithdraw || !account) return;

    setIsLoading(true);
    try {
      const contract = new ethers.Contract(
        process.env.NEXT_PUBLIC_NETWORK_SLA_ADDRESS!,
        NetworkSLACleanABI,
        provider
      );

      console.log('🔍 Fetching streams for provider:', account);

      const slaCounter = await contract.slaCounter();
      console.log('Total SLAs found:', slaCounter.toString());
      
      const streams: StreamInfo[] = [];

      for (let slaId = 1; slaId <= Number(slaCounter); slaId++) {
        try {
          const sla = await contract.getSLA(slaId);
          
          if (sla.serviceProvider.toLowerCase() === account.toLowerCase() && sla.isActive) {
            const streamId = Number(sla.currentStreamId);
            if (streamId > 0) {
              try {
                const stream = await contract.getStream(streamId);
                
                if (stream.isActive) {
                  const withdrawalInfo = await contract.getWithdrawalInfo(streamId);
                  
                  streams.push({
                    streamId: streamId,
                    slaId: slaId,
                    totalWithdrawn: ethers.formatEther(withdrawalInfo.totalWithdrawn),
                    availableBalance: ethers.formatEther(withdrawalInfo.availableBalance),
                    totalStreamAmount: ethers.formatEther(withdrawalInfo.totalStreamAmount),
                    isActive: stream.isActive
                  });
                }
              } catch (streamError) {
                console.error(`Error fetching stream ${streamId}:`, streamError);
              }
            }
          }
        } catch (error) {
          console.error(`Error fetching SLA ${slaId}:`, error);
        }
      }

      console.log('✅ Found streams with real balances:', streams);
      setAvailableStreams(streams);
    } catch (error) {
      console.error('❌ Error fetching provider streams:', error);
      toast.error("Error Fetching Streams", {
        description: "Failed to load payment streams. Check console for details.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const withdrawFromStream = async (streamId: number, amount: string) => {
    if (!canWithdraw || !amount || parseFloat(amount) <= 0) return;

    setIsWithdrawing(prev => ({ ...prev, [streamId]: true }));
    try {
      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      const signer = await browserProvider.getSigner();
      
      const contract = new ethers.Contract(
        process.env.NEXT_PUBLIC_NETWORK_SLA_ADDRESS!,
        NetworkSLACleanABI,
        signer
      );

      const amountWei = ethers.parseEther(amount);
      
      console.log(`Withdrawing ${amount} ETH from stream ${streamId}`);
      
      const tx = await contract.withdrawFromStream(streamId, amountWei);
      
      // Updated toast syntax
      toast.loading("Withdrawal Initiated", {
        id: tx.hash,
        description: `Withdrawing ${amount} ETH from stream ${streamId}. Tx: ${tx.hash}`,
      });

      const receipt = await tx.wait();
      console.log('Withdrawal confirmed:', receipt);

      // Updated toast syntax for success
      toast.success("Withdrawal Successful", {
        id: tx.hash, // This will replace the loading toast
        description: `Successfully withdrew ${amount} ETH to your account.`,
      });

      // Clear custom amount
      setCustomAmounts(prev => ({ ...prev, [streamId]: '' }));
      
      // Refresh data
      setTimeout(fetchProviderStreams, 2000);

    } catch (error: any) {
      console.error('Error withdrawing from stream:', error);
      
      let errorMessage = 'Failed to withdraw from stream';
      if (error.message.includes('Insufficient available balance')) {
        errorMessage = 'Insufficient available balance for withdrawal';
      } else if (error.message.includes('Only stream recipient')) {
        errorMessage = 'You are not authorized to withdraw from this stream';
      }
      
      // Updated toast syntax for error
      toast.error("Withdrawal Failed", {
        description: errorMessage,
      });
    } finally {
      setIsWithdrawing(prev => ({ ...prev, [streamId]: false }));
    }
  };

  const withdrawAllFromStream = async (streamId: number) => {
    if (!canWithdraw) return;

    const stream = availableStreams.find(s => s.streamId === streamId);
    if (!stream || parseFloat(stream.availableBalance) <= 0) return;

    setIsWithdrawing(prev => ({ ...prev, [streamId]: true }));
    try {
      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      const signer = await browserProvider.getSigner();
      
      const contract = new ethers.Contract(
        process.env.NEXT_PUBLIC_NETWORK_SLA_ADDRESS!,
        NetworkSLACleanABI,
        signer
      );

      console.log(`Withdrawing all available funds from stream ${streamId}`);
      
      const tx = await contract.withdrawAllFromStream(streamId);
      
      // Updated toast syntax
      toast.loading("Full Withdrawal Initiated", {
        id: tx.hash,
        description: `Withdrawing all available funds from stream ${streamId}. Tx: ${tx.hash}`,
      });

      const receipt = await tx.wait();
      console.log('Full withdrawal confirmed:', receipt);

      // Updated toast syntax for success
      toast.success("Full Withdrawal Successful", {
        id: tx.hash, // This will replace the loading toast
        description: `Successfully withdrew all available funds from stream ${streamId}.`,
      });

      // Refresh data
      setTimeout(fetchProviderStreams, 2000);

    } catch (error: any) {
      console.error('Error withdrawing all from stream:', error);
      
      // Updated toast syntax for error
      toast.error("Full Withdrawal Failed", {
        description: error.message || 'Failed to withdraw all funds from stream',
      });
    } finally {
      setIsWithdrawing(prev => ({ ...prev, [streamId]: false }));
    }
  };

  useEffect(() => {
    fetchProviderStreams();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchProviderStreams, 30000);
    return () => clearInterval(interval);
  }, [canWithdraw, account]);

  if (!isConnected) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <div className="text-center text-muted-foreground">
            <Wallet className="h-8 w-8 mx-auto mb-2" />
            Connect wallet to view withdrawals
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isServiceProvider) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Provider Withdrawals
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center text-muted-foreground">
          <div className="py-8">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-orange-500" />
            <p>Switch to Service Provider account (Account 1) to withdraw funds</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalAvailableBalance = availableStreams.reduce((sum, stream) => {
    return sum + parseFloat(stream.availableBalance);
  }, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Provider Withdrawals
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={availableStreams.length > 0 ? "default" : "secondary"}>
              {availableStreams.length} Active Stream{availableStreams.length !== 1 ? 's' : ''}
            </Badge>
            <Button
              onClick={fetchProviderStreams}
              variant="outline"
              size="sm"
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="text-center py-4">
            <div className="text-muted-foreground">Loading streams...</div>
          </div>
        ) : availableStreams.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <div className="mb-4">No active payment streams found</div>
            <div className="text-sm">
              Create an SLA as a customer to generate payment streams
            </div>
          </div>
        ) : (
          <>
            {/* Summary */}
            <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-green-700 dark:text-green-400">
                  Total Available to Withdraw:
                </span>
                <CurrencyDisplay ethAmount={totalAvailableBalance.toFixed(6)} />
              </div>
            </div>

            {/* Stream Details */}
            <div className="space-y-4">
              {availableStreams.map((stream) => {
                const streamWithdrawing = isWithdrawing[stream.streamId] || false;
                const customAmount = customAmounts[stream.streamId] || '';
                
                return (
                  <div key={stream.streamId} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="font-medium">Stream #{stream.streamId}</div>
                        <div className="text-sm text-muted-foreground">SLA #{stream.slaId}</div>
                      </div>
                      <Badge variant="outline">Active</Badge>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 text-sm mb-4">
                      <div>
                        <span className="text-muted-foreground">Total Amount:</span>
                        <CurrencyDisplay ethAmount={stream.totalStreamAmount} className="font-mono" />
                      </div>
                      <div>
                        <span className="text-muted-foreground">Total Withdrawn:</span>
                        <CurrencyDisplay ethAmount={stream.totalWithdrawn} className="font-mono" />
                      </div>
                      <div>
                        <span className="text-muted-foreground">Available Now:</span>
                        <CurrencyDisplay ethAmount={stream.availableBalance} className="font-mono font-bold text-green-600" />
                      </div>
                    </div>
                    
                    {/* Withdrawal Controls */}
                    {parseFloat(stream.availableBalance) > 0 && (
                      <div className="space-y-3 pt-3 border-t">
                        {/* Custom Amount Withdrawal */}
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <Label htmlFor={`amount-${stream.streamId}`} className="text-xs">
                              Custom Amount (ETH)
                            </Label>
                            <Input
                              id={`amount-${stream.streamId}`}
                              type="number"
                              step="0.000001"
                              max={stream.availableBalance}
                              value={customAmount}
                              onChange={(e) => setCustomAmounts(prev => ({ 
                                ...prev, 
                                [stream.streamId]: e.target.value 
                              }))}
                              placeholder="0.000000"
                              disabled={streamWithdrawing}
                            />
                          </div>
                          <div className="flex items-end">
                            <Button
                              onClick={() => withdrawFromStream(stream.streamId, customAmount)}
                              disabled={streamWithdrawing || !customAmount || parseFloat(customAmount) <= 0}
                              size="sm"
                            >
                              {streamWithdrawing ? 'Processing...' : 'Withdraw'}
                            </Button>
                          </div>
                        </div>

                        {/* Withdraw All Button */}
                        <Button
                          onClick={() => withdrawAllFromStream(stream.streamId)}
                          disabled={streamWithdrawing}
                          className="w-full"
                          variant="outline"
                        >
                          <DollarSign className="h-4 w-4 mr-2" />
                          {streamWithdrawing ? 'Processing...' : `Withdraw All Available (${stream.availableBalance} ETH)`}
                        </Button>
                      </div>
                    )}

                    {parseFloat(stream.availableBalance) === 0 && (
                      <div className="pt-3 border-t text-center text-sm text-muted-foreground">
                        No funds currently available for withdrawal
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        <div className="text-xs text-muted-foreground space-y-1">
          <p>• Withdrawals are processed immediately on the blockchain</p>
          <p>• Available balance updates in real-time based on stream payment rates</p>
          <p>• All transactions require gas fees in ETH</p>
        </div>
      </CardContent>
    </Card>
  );
};



