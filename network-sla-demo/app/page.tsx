'use client';

import { SLADashboard } from '@/components/SLADashboard';
import { TransactionLogger } from '@/components/TransactionLogger';
import { CreateSLA } from '@/components/CreateSLA';
import { BlockchainPerformanceChart } from '@/components/BlockchainPerformanceChart';
import { DataGenerator } from '@/components/DataGenerator';
import { WalletConnector } from '@/components/WalletConnector';
import { NetworkGuard } from '@/components/NetworkGuard';
import { AutoComplianceChecker } from '@/components/AutoComplianceChecker';

export default function HomePage() {
  return (
    <NetworkGuard>
      <div className="container mx-auto p-6 space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">Network SLA Blockchain Demo</h1>
          <p className="text-muted-foreground">
            Real-time monitoring of decentralized network SLAs with automatic violation detection
          </p>
        </div>

        {/* Wallet Connection Section */}
        <div className="max-w-md mx-auto mb-6">
          <WalletConnector />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="space-y-6">
            <CreateSLA />
            <DataGenerator />
            <AutoComplianceChecker />
          </div>
          
          <div className="space-y-6">
            <SLADashboard />
            <BlockchainPerformanceChart />
          </div>
        </div>

        {/* Full width transaction log */}
        <div className="mt-6">
          <TransactionLogger />
        </div>
      </div>
    </NetworkGuard>
  );
}
