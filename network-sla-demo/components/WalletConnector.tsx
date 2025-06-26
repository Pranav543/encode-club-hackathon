'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useWallet } from '@/hooks/useWallet';
import { useContractBalance } from '@/hooks/useContractBalance';
import { useETHPrice } from '@/hooks/useETHPrice';
import { CurrencyDisplay, ETHPriceIndicator } from '@/components/CurrencyDisplay';
import { Wallet, AlertTriangle, CheckCircle, Users, Building2 } from 'lucide-react';

export const WalletConnector = () => {
  const { 
    isConnected, 
    account, 
    accountBalance,
    chainId, 
    networkName, 
    isConnecting, 
    error, 
    accountIndex,
    connectToAccount, 
    disconnectWallet, 
    switchToAnvil,
    demoAccounts
  } = useWallet();

  const { balance: contractBalance, isLoading: contractBalanceLoading } = useContractBalance(
    process.env.NEXT_PUBLIC_NETWORK_SLA_ADDRESS || ''
  );

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const isOnCorrectNetwork = chainId === 31337;

  const getAccountLabel = (index: number) => {
    return index === 0 ? 'Customer Account' : 'Service Provider Account';
  };

  const getAccountIcon = (index: number) => {
    return index === 0 ? Users : Building2;
  };

  return (
    <div className="space-y-4">
      {/* ETH Price Display */}
      <Card>
        <CardContent className="p-3">
          <ETHPriceIndicator />
        </CardContent>
      </Card>

      {/* Demo Account Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Demo Account Selection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isConnected ? (
            <div className="grid grid-cols-1 gap-3">
              {demoAccounts.map((address, index) => {
                const AccountIcon = getAccountIcon(index);
                return (
                  <Button
                    key={address}
                    onClick={() => connectToAccount(index as 0 | 1)}
                    disabled={isConnecting}
                    variant="outline"
                    className="flex items-center gap-3 h-auto p-4 justify-start"
                  >
                    <AccountIcon className="h-5 w-5" />
                    <div className="text-left">
                      <div className="font-medium">{getAccountLabel(index)}</div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {formatAddress(address)}
                      </div>
                    </div>
                    {isConnecting && (
                      <div className="ml-auto h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                    )}
                  </Button>
                );
              })}
            </div>
          ) : (
            <div className="space-y-3">
              {/* Current Connection Status */}
              <div className="p-3 rounded-lg border bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-700 dark:text-green-400">
                    Connected as {accountIndex !== null ? getAccountLabel(accountIndex) : 'Unknown Account'}
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Address:</span>
                    <code className="font-mono">{formatAddress(account!)}</code>
                  </div>
                </div>
              </div>

              {/* Switch Account Buttons */}
              <div className="grid grid-cols-2 gap-2">
                {demoAccounts.map((address, index) => {
                  const AccountIcon = getAccountIcon(index);
                  const isCurrentAccount = accountIndex === index;
                  return (
                    <Button
                      key={address}
                      onClick={() => connectToAccount(index as 0 | 1)}
                      disabled={isConnecting || isCurrentAccount}
                      variant={isCurrentAccount ? "default" : "outline"}
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <AccountIcon className="h-4 w-4" />
                      Account {index}
                      {isCurrentAccount && <CheckCircle className="h-3 w-3" />}
                    </Button>
                  );
                })}
              </div>

              <Button
                onClick={disconnectWallet}
                variant="ghost"
                size="sm"
                className="w-full"
              >
                Disconnect
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Network Status & Balances in USD */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Network & Balances</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Network:</span>
            <div className="flex items-center gap-2">
              <Badge variant={isOnCorrectNetwork ? "default" : "destructive"}>
                {networkName || 'Disconnected'}
              </Badge>
              {isConnected && (isOnCorrectNetwork ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-red-500" />
              ))}
            </div>
          </div>

          {isConnected && (
            <>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Wallet Balance:</span>
                <CurrencyDisplay ethAmount={accountBalance ?? undefined} />
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Contract Balance:</span>
                {contractBalanceLoading ? (
                  <span className="text-sm">Loading...</span>
                ) : (
                  <CurrencyDisplay ethAmount={contractBalance} />
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Network Warning */}
      {isConnected && !isOnCorrectNetwork && (
        <Card>
          <CardContent className="p-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-orange-700 dark:text-orange-400">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm">Please switch to Anvil Local network</span>
              </div>
              <Button
                onClick={switchToAnvil}
                size="sm"
                variant="outline"
                className="w-full"
              >
                Switch to Anvil Local
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Demo Instructions */}
      {!isConnected && (
        <Card>
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground space-y-1">
              <p className="font-medium">Demo Setup:</p>
              <p>• Account 0: Customer (pays for service)</p>
              <p>• Account 1: Service provider (receives payments)</p>
              <p>• All prices shown in USD, operations in ETH</p>
              <p>• Balances update automatically</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
