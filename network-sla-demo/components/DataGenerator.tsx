"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ethers } from "ethers";
import { useWallet } from "@/hooks/useWallet";
import { AlertTriangle, TrendingUp, TrendingDown } from "lucide-react";
import { toast } from "sonner";

export const DataGenerator = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastGeneratedType, setLastGeneratedType] = useState<string | null>(
    null
  );
  const { isConnected, chainId } = useWallet();

  const isOnCorrectNetwork = chainId === 31337;
  const canGenerate = isConnected && isOnCorrectNetwork;

  const generateData = async (type: "good" | "violation") => {
    if (!canGenerate) return;

    setIsGenerating(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const performanceABI = [
        "function generateGoodPerformanceData() external",
        "function generateViolationPerformanceData() external",
        "function getTotalMetricsCount() external view returns (uint256)",
      ];

      const contract = new ethers.Contract(
        process.env.NEXT_PUBLIC_PERFORMANCE_CONTRACT_ADDRESS!,
        performanceABI,
        signer
      );

      // Check contract state first
      try {
        await contract.getTotalMetricsCount();
      } catch (error) {
        throw new Error(
          "Performance contract is not accessible. Please check deployment."
        );
      }

      const fn =
        type === "good"
          ? contract.generateGoodPerformanceData
          : contract.generateViolationPerformanceData;

      // Estimate gas first
      const gasEstimate = await fn.estimateGas();
      console.log(`Gas estimate for ${type} data: ${gasEstimate.toString()}`);

      const tx = await fn({
        gasLimit: (gasEstimate * BigInt(120)) / BigInt(100), // Add 20% buffer
      });

      // Show a loading toast and capture its ID
      const toastId = toast.loading(
        `${
          type.charAt(0).toUpperCase() + type.slice(1)
        } Data Generation Started`
      );

      // Send transaction
      console.log(`${type} data generation transaction:`, tx.hash);

      const receipt = await tx.wait();
      console.log(`${type} data generation confirmed:`, receipt);

      setLastGeneratedType(type);

      // Update the same toast to success using the ID
      toast.success(
        `${type.charAt(0).toUpperCase() + type.slice(1)} Data Generated`,
        {
          id: toastId,
          description: `Block: ${receipt.blockNumber}`,
        }
      );
    } catch (error: any) {
      console.error("Error generating data:", error);

      let errorMessage = "Failed to generate data";
      if (error.message.includes("execution reverted")) {
        errorMessage =
          "Transaction reverted. Contract may be in invalid state.";
      } else if (error.message.includes("gas")) {
        errorMessage = "Gas estimation failed. Try again.";
      }

      toast.error("Data Generation Failed", {
        description: errorMessage,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Controlled Data Generator</span>
          {lastGeneratedType && (
            <Badge
              variant={lastGeneratedType === "good" ? "default" : "destructive"}
            >
              Last: {lastGeneratedType}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!canGenerate && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <span className="text-sm text-orange-700 dark:text-orange-400">
              {!isConnected
                ? "Connect wallet to generate data"
                : "Switch to Anvil Local network"}
            </span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={() => generateData("good")}
            disabled={isGenerating || !canGenerate}
            variant="outline"
            className="flex items-center gap-2"
          >
            <TrendingUp className="h-4 w-4 text-green-600" />
            {isGenerating ? "Generating..." : "Good Data"}
          </Button>

          <Button
            onClick={() => generateData("violation")}
            disabled={isGenerating || !canGenerate}
            variant="destructive"
            className="flex items-center gap-2"
          >
            <TrendingDown className="h-4 w-4" />
            {isGenerating ? "Generating..." : "Violation Data"}
          </Button>
        </div>

        <div className="text-sm text-muted-foreground space-y-1">
          <p>
            • <strong>Good Data:</strong> Latency 10-40ms, Bandwidth 110-150
            Mbps
          </p>
          <p>
            • <strong>Violation Data:</strong> Latency 60-110ms, Bandwidth 60-99
            Mbps
          </p>
          <p>
            • Each generation creates a blockchain transaction with improved
            error handling
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
