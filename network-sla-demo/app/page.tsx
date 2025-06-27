'use client';

import { SLADashboard } from '@/components/SLADashboard';
import { TransactionLogger } from '@/components/TransactionLogger';
import { CreateSLA } from '@/components/CreateSLA';
import { CombinedPerformancePaymentChart } from '@/components/CombinedPerformancePaymentChart';
import { DataGenerator } from '@/components/DataGenerator';
import { ComplianceChecker } from '@/components/ComplianceChecker';
import { WalletConnector } from '@/components/WalletConnector';
import { NetworkGuard } from '@/components/NetworkGuard';
import { ProviderWithdrawal } from '@/components/ProviderWithdrawal';
import { ETHPriceIndicator } from '@/components/ETHPriceIndicator';
import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { provider } from '@/lib/blockchain';
import { NetworkSLACleanABI } from '@/lib/contracts/NetworkSLACleanABI';
import { useWallet } from '@/hooks/useWallet';

export default function HomePage() {
  const [currentSlaId, setCurrentSlaId] = useState<number | null>(null);
  const [isCurrentSlaActive, setIsCurrentSlaActive] = useState(false);
  const [currentSlaData, setCurrentSlaData] = useState<any>(null);
  const { accountIndex } = useWallet();

  useEffect(() => {
    const fetchCurrentSLA = async () => {
      try {
        const contract = new ethers.Contract(
          process.env.NEXT_PUBLIC_NETWORK_SLA_ADDRESS!,
          NetworkSLACleanABI,
          provider
        );
        
        const slaCounter = await contract.slaCounter();
        if (Number(slaCounter) > 0) {
          const sla = await contract.getSLA(Number(slaCounter));
          setCurrentSlaId(Number(slaCounter));
          setIsCurrentSlaActive(sla.isActive);
          
          setCurrentSlaData({
            basePaymentRate: Number(sla.basePaymentRate),
            currentPaymentRate: Number(sla.currentPaymentRate),
            violationCount: Number(sla.violationCount),
            isActive: sla.isActive
          });
        }
      } catch (error) {
        console.error('Error fetching current SLA:', error);
      }
    };

    fetchCurrentSLA();
    const interval = setInterval(fetchCurrentSLA, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <NetworkGuard>
      <div className="container mx-auto p-6 space-y-6">
        {/* ✅ UPDATED: Header with integrated ETH price indicator */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">Network SLA Blockchain Demo</h1>
          <p className="text-muted-foreground mb-4">
            Real-time monitoring of service level agreements with payment streaming
          </p>
          
          {/* ✅ ETH Price Indicator in Header */}
          <div className="flex justify-center">
            <div className="bg-white dark:bg-gray-800 rounded-lg border px-4 py-2 shadow-sm">
              <ETHPriceIndicator />
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto mb-6">
          <WalletConnector />
        </div>

        {/* ✅ REMOVED: Separate ETH Price Indicator section */}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="space-y-6">
            {accountIndex === 0 && (
              <>
                <CreateSLA />
                <DataGenerator />
                <ComplianceChecker slaId={currentSlaId} isActive={isCurrentSlaActive} />
              </>
            )}
            
            {accountIndex === 1 && (
              <>
                <ProviderWithdrawal />
                <DataGenerator />
                <ComplianceChecker slaId={currentSlaId} isActive={isCurrentSlaActive} />
              </>
            )}

            {accountIndex === null && (
              <>
                <CreateSLA />
                <DataGenerator />
                <ComplianceChecker slaId={currentSlaId} isActive={isCurrentSlaActive} />
              </>
            )}
          </div>
          
          <div className="space-y-6">
            <SLADashboard />
            <CombinedPerformancePaymentChart slaData={currentSlaData} />
          </div>
        </div>

        <div className="mt-6">
          <TransactionLogger />
        </div>
      </div>
    </NetworkGuard>
  );
}
