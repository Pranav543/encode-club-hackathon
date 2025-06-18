'use client';

import { useWallet } from '@/hooks/useWallet';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface NetworkGuardProps {
  children: React.ReactNode;
}

export const NetworkGuard = ({ children }: NetworkGuardProps) => {
  const { isConnected, chainId, switchToAnvil } = useWallet();

  const isOnCorrectNetwork = chainId === 31337;

  if (isConnected && !isOnCorrectNetwork) {
    return (
      <div className="container mx-auto p-6">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-6 text-center space-y-4">
            <AlertTriangle className="h-12 w-12 text-orange-500 mx-auto" />
            <h2 className="text-xl font-semibold">Wrong Network</h2>
            <p className="text-muted-foreground">
              Please switch to Anvil Local network to use this application.
            </p>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Current network: <strong>{chainId ? `Chain ${chainId}` : 'Unknown'}</strong>
              </p>
              <p className="text-sm text-muted-foreground">
                Required network: <strong>Anvil Local (Chain ID: 31337)</strong>
              </p>
            </div>
            <Button onClick={switchToAnvil} className="w-full">
              Switch to Anvil Local
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};
