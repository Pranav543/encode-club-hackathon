"use client";

// Add global type for window.ethereum
declare global {
  interface Window {
    ethereum?: any;
  }
}

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useWallet } from "@/hooks/useWallet";
import { useETHPrice } from "@/hooks/useETHPrice";
import { convertUSDPerSecondToWeiPerSecond, parseUSDInput } from "@/lib/currencyUtils";
import { AlertTriangle, DollarSign } from "lucide-react";
import { ethers } from "ethers";
import { NetworkSLAWithStreamRecreationABI } from "@/lib/contracts/NetworkSLAWithStreamRecreationABI";

export const CreateSLA = () => {
  const [formData, setFormData] = useState({
    serviceProvider: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    guaranteedBandwidth: 100,
    maxLatency: 50,
    maxViolations: 3,
    penaltyRate: 20,
    duration: 3600,
    basePaymentRateUSD: 10.0,
  });

  const [isCreating, setIsCreating] = useState(false);
  const [calculationError, setCalculationError] = useState<string | null>(null);
  const { isConnected, chainId } = useWallet();
  const { ethToUsd, isLoading: priceLoading } = useETHPrice();

  const isOnCorrectNetwork = chainId === 31337;

  // ✅ FIXED: Proper payment calculation with detailed logging
  const calculateTotalCost = useMemo(() => {
    try {
      setCalculationError(null);
      
      const usdPerSecond = parseUSDInput(formData.basePaymentRateUSD.toString());
      
      if (usdPerSecond <= 0) {
        setCalculationError("Payment rate must be positive");
        return { eth: "0", usd: "$0.00", weiPerSecond: "0", totalWei: "0", ethPerSecond: 0 };
      }
      
      if (ethToUsd <= 0) {
        setCalculationError("Invalid ETH price");
        return { eth: "0", usd: "$0.00", weiPerSecond: "0", totalWei: "0", ethPerSecond: 0 };
      }

      const conversion = convertUSDPerSecondToWeiPerSecond(usdPerSecond, ethToUsd);
      const totalETH = conversion.totalETHForDuration(formData.duration);
      const totalWei = conversion.totalWeiForDuration(formData.duration);
      const totalUSD = usdPerSecond * formData.duration;

      console.log('💰 DETAILED SLA Cost Calculation:', {
        inputs: {
          usdPerSecond,
          duration: formData.duration,
          ethPrice: ethToUsd
        },
        calculations: {
          ethPerSecond: conversion.ethPerSecond,
          weiPerSecond: conversion.weiPerSecond,
          totalETH,
          totalWei,
          totalUSD
        },
        contractRequirement: {
          weiPerSecond: conversion.weiPerSecond,
          totalPayment: totalWei
        }
      });

      return {
        eth: totalETH.toFixed(6),
        usd: totalUSD.toLocaleString("en-US", { style: "currency", currency: "USD" }),
        weiPerSecond: conversion.weiPerSecond,
        totalWei: totalWei,
        ethPerSecond: conversion.ethPerSecond
      };
    } catch (error: any) {
      console.error('❌ Error calculating SLA cost:', error);
      setCalculationError(`Calculation error: ${error.message}`);
      return { eth: "0", usd: "$0.00", weiPerSecond: "0", totalWei: "0", ethPerSecond: 0 };
    }
  }, [formData.basePaymentRateUSD, formData.duration, ethToUsd]);

  const canCreateSLA = isConnected && isOnCorrectNetwork && !priceLoading && !calculationError;

  const handleCreateSLA = async () => {
    if (!canCreateSLA) return;

    setIsCreating(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const contract = new ethers.Contract(
        process.env.NEXT_PUBLIC_NETWORK_SLA_ADDRESS!,
        NetworkSLAWithStreamRecreationABI,
        signer
      );

      if (calculateTotalCost.weiPerSecond === "0" || calculateTotalCost.totalWei === "0") {
        throw new Error("Invalid payment rate calculation");
      }
      
      // ✅ FIXED: Use the exact wei amount calculated
      const totalPayment = calculateTotalCost.totalWei;

      console.log("🚀 Creating SLA with EXACT values:");
      console.log("📊 Contract Parameters:", {
        serviceProvider: formData.serviceProvider,
        guaranteedBandwidth: formData.guaranteedBandwidth,
        maxLatency: formData.maxLatency,
        maxViolations: formData.maxViolations,
        penaltyRate: formData.penaltyRate,
        duration: formData.duration,
        basePaymentRateWeiPerSecond: calculateTotalCost.weiPerSecond
      });
      console.log("💰 Payment Details:", {
        totalPaymentWei: totalPayment,
        totalPaymentETH: calculateTotalCost.eth,
        expectedUSDPerSecond: formData.basePaymentRateUSD,
        ethPrice: ethToUsd
      });

      // ✅ VERIFICATION: Calculate what contract expects
      const contractExpectedTotal = BigInt(calculateTotalCost.weiPerSecond) * BigInt(formData.duration);
      console.log("🔍 Contract Calculation Verification:", {
        ourCalculation: totalPayment,
        contractExpectation: contractExpectedTotal.toString(),
        match: totalPayment === contractExpectedTotal.toString()
      });

      const tx = await contract.createSLA(
        formData.serviceProvider,
        formData.guaranteedBandwidth,
        formData.maxLatency,
        formData.maxViolations,
        formData.penaltyRate,
        formData.duration,
        calculateTotalCost.weiPerSecond, // Wei per second
        { value: totalPayment } // Total wei for entire duration
      );

      toast.loading("SLA Creation Initiated", { id: tx.hash });

      const receipt = await tx.wait();
      console.log("✅ SLA Creation confirmed:", receipt);

      toast.success("SLA Created Successfully", {
        id: tx.hash,
        description: `Rate: $${formData.basePaymentRateUSD}/sec. Block: ${receipt.blockNumber}`,
      });
    } catch (error: any) {
      console.error("❌ Error creating SLA:", error);
      
      let errorMessage = error.message || 'Failed to create SLA';
      
      if (error.message.includes('Insufficient payment')) {
        errorMessage = `Payment amount insufficient. Check calculation: ${calculateTotalCost.eth} ETH required.`;
      } else if (error.message.includes('too many decimals')) {
        errorMessage = 'Decimal precision error. Please try a different USD amount.';
      } else if (error.message.includes('underflow')) {
        errorMessage = 'Amount too small. Please increase the payment rate.';
      }
      
      toast.error("Error Creating SLA", {
        description: errorMessage
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Create New SLA
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {(!canCreateSLA || calculationError) && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <span className="text-sm text-orange-700 dark:text-orange-400">
              {calculationError || 
               (!isConnected ? "Connect wallet to create SLA" :
                !isOnCorrectNetwork ? "Switch to Anvil Local network" :
                priceLoading ? "Loading ETH price..." : "Unknown error")}
            </span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="serviceProvider">Service Provider Address</Label>
            <Input
              id="serviceProvider"
              value={formData.serviceProvider}
              onChange={(e) => setFormData(prev => ({...prev, serviceProvider: e.target.value}))}
              placeholder="0x..."
            />
          </div>
          <div>
            <Label htmlFor="guaranteedBandwidth">Guaranteed Bandwidth (Mbps)</Label>
            <Input
              id="guaranteedBandwidth"
              type="number"
              value={formData.guaranteedBandwidth}
              onChange={(e) => setFormData(prev => ({...prev, guaranteedBandwidth: Number(e.target.value)}))}
            />
          </div>
          <div>
            <Label htmlFor="maxLatency">Max Latency (ms)</Label>
            <Input
              id="maxLatency"
              type="number"
              value={formData.maxLatency}
              onChange={(e) => setFormData(prev => ({...prev, maxLatency: Number(e.target.value)}))}
            />
          </div>
          <div>
            <Label htmlFor="maxViolations">Max Violations</Label>
            <Input
              id="maxViolations"
              type="number"
              value={formData.maxViolations}
              onChange={(e) => setFormData(prev => ({...prev, maxViolations: Number(e.target.value)}))}
            />
          </div>
          <div>
            <Label htmlFor="penaltyRate">Penalty Rate (%)</Label>
            <Input
              id="penaltyRate"
              type="number"
              value={formData.penaltyRate}
              onChange={(e) => setFormData(prev => ({...prev, penaltyRate: Number(e.target.value)}))}
            />
          </div>
          <div>
            <Label htmlFor="basePaymentRateUSD">Payment Rate (USD/second)</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="basePaymentRateUSD"
                type="number"
                step="0.01"
                min="0.01"
                value={formData.basePaymentRateUSD}
                onChange={(e) => setFormData(prev => ({...prev, basePaymentRateUSD: Number(e.target.value)}))}
                className="pl-10"
              />
            </div>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
          <div className="text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-blue-700 dark:text-blue-400">Total Cost:</span>
              <div className="text-right">
                <div className="font-medium text-blue-700 dark:text-blue-400">{calculateTotalCost.usd}</div>
                <div className="text-xs text-blue-600 dark:text-blue-500">{calculateTotalCost.eth} ETH</div>
              </div>
            </div>
            <div className="text-xs text-blue-600 dark:text-blue-500">
              Duration: {formData.duration} seconds ({(formData.duration / 3600).toFixed(1)} hours)
            </div>
            <div className="text-xs text-blue-600 dark:text-blue-500">
              ETH Price: ${ethToUsd.toLocaleString()}
            </div>
            <div className="text-xs text-blue-600 dark:text-blue-500">
              Payment/sec: {calculateTotalCost.weiPerSecond} wei
            </div>
          </div>
        </div>

        <Button
          onClick={handleCreateSLA}
          disabled={isCreating || !canCreateSLA}
          className="w-full"
        >
          {isCreating ? "Creating SLA..." : "Create SLA"}
        </Button>
      </CardContent>
    </Card>
  );
};
