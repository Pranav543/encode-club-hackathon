'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useWallet } from '@/hooks/useWallet';
import { Wallet, AlertTriangle, CheckCircle, ExternalLink } from 'lucide-react';

export const WalletConnector = () => {
  const { 
    isConnected, 
    account, 
    chainId, 
    networkName, 
    isConnecting, 
    error, 
    connectWallet, 
    disconnectWallet, 
    switchToAnvil 
  } = useWallet();

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const isOnCorrectNetwork = chainId === 31337;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Wallet Connection
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Connection Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Status:</span>
          <Badge variant={isConnected ? "default" : "secondary"}>
            {isConnected ? "Connected" : "Disconnected"}
          </Badge>
        </div>

        {/* Account Information */}
        {isConnected && account && (
          <>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Account:</span>
              <div className="flex items-center gap-2">
                <code className="text-xs bg-muted px-2 py-1 rounded">
                  {formatAddress(account)}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigator.clipboard.writeText(account)}
                  className="h-6 w-6 p-0"
                >
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Network:</span>
              <div className="flex items-center gap-2">
                <Badge variant={isOnCorrectNetwork ? "default" : "destructive"}>
                  {networkName || 'Unknown'}
                </Badge>
                {isOnCorrectNetwork ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                )}
              </div>
            </div>
          </>
        )}

        {/* Error Display */}
        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          </div>
        )}

        {/* Network Warning */}
        {isConnected && !isOnCorrectNetwork && (
          <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800">
            <div className="flex items-center gap-2 text-orange-700 dark:text-orange-400">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">Please switch to Anvil Local network</span>
            </div>
            <Button
              onClick={switchToAnvil}
              size="sm"
              variant="outline"
              className="mt-2 w-full"
            >
              Switch to Anvil Local
            </Button>
          </div>
        )}

        {/* Connection Controls */}
        <div className="flex gap-2">
          {!isConnected ? (
            <Button
              onClick={connectWallet}
              disabled={isConnecting}
              className="flex-1"
            >
              {isConnecting ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                  Connecting...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4" />
                  Connect Wallet
                </div>
              )}
            </Button>
          ) : (
            <Button
              onClick={disconnectWallet}
              variant="outline"
              className="flex-1"
            >
              Disconnect
            </Button>
          )}
        </div>

        {/* Instructions */}
        {!isConnected && (
          <div className="text-xs text-muted-foreground space-y-1">
            <p>• Install MetaMask browser extension</p>
            <p>• Connect to Anvil Local network (Chain ID: 31337)</p>
            <p>• Use test accounts from Anvil for transactions</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
