"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useWallet } from "@/hooks/useWallet";
import { AlertTriangle } from "lucide-react";
import { ethers } from "ethers";
import { NetworkSLACompleteABI } from "@/lib/contracts/NetworkSLACompleteABI";

// Add ethereum to the Window type
declare global {
  interface Window {
    ethereum?: any;
  }
}

export const CreateSLA = () => {
  const [formData, setFormData] = useState({
    serviceProvider: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", // Default to Anvil account #1
    guaranteedBandwidth: 100,
    maxLatency: 50,
    maxViolations: 3,
    penaltyRate: 20,
    duration: 3600,
    basePaymentRate: 1000,
  });

  const [isCreating, setIsCreating] = useState(false);
  const { isConnected, chainId } = useWallet();

  const isOnCorrectNetwork = chainId === 31337;
  const canCreateSLA = isConnected && isOnCorrectNetwork;

  const handleCreateSLA = async () => {
    if (!canCreateSLA) return;

    setIsCreating(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const contract = new ethers.Contract(
        process.env.NEXT_PUBLIC_NETWORK_SLA_ADDRESS!,
        NetworkSLACompleteABI,
        signer
      );

      const totalPayment = ethers.parseEther(
        ((formData.basePaymentRate * formData.duration) / 1000000).toString()
      );

      console.log("Creating SLA with params:", {
        serviceProvider: formData.serviceProvider,
        guaranteedBandwidth: formData.guaranteedBandwidth,
        maxLatency: formData.maxLatency,
        maxViolations: formData.maxViolations,
        penaltyRate: formData.penaltyRate,
        duration: formData.duration,
        basePaymentRate: formData.basePaymentRate,
        totalPayment: totalPayment.toString(),
      });

      const tx = await contract.createSLA(
        formData.serviceProvider,
        formData.guaranteedBandwidth,
        formData.maxLatency,
        formData.maxViolations,
        formData.penaltyRate,
        formData.duration,
        formData.basePaymentRate,
        { value: totalPayment }
      );

      // single evolving toast
      toast.loading("Creating SLA…", { id: tx.hash });

      const receipt = await tx.wait();

      toast.success("SLA created!", {
        id: tx.hash,
        description: `Block ${receipt.blockNumber}`,
      });
    } catch (err: any) {
      toast.error(err.message ?? "Failed to create SLA");
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create New SLA</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!canCreateSLA && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <span className="text-sm text-orange-700 dark:text-orange-400">
              {!isConnected
                ? "Connect wallet to create SLA"
                : "Switch to Anvil Local network"}
            </span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="serviceProvider">Service Provider Address</Label>
            <Input
              id="serviceProvider"
              value={formData.serviceProvider}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  serviceProvider: e.target.value,
                }))
              }
              placeholder="0x..."
            />
          </div>
          <div>
            <Label htmlFor="guaranteedBandwidth">
              Guaranteed Bandwidth (Mbps)
            </Label>
            <Input
              id="guaranteedBandwidth"
              type="number"
              value={formData.guaranteedBandwidth}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  guaranteedBandwidth: Number(e.target.value),
                }))
              }
            />
          </div>
          <div>
            <Label htmlFor="maxLatency">Max Latency (ms)</Label>
            <Input
              id="maxLatency"
              type="number"
              value={formData.maxLatency}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  maxLatency: Number(e.target.value),
                }))
              }
            />
          </div>
          <div>
            <Label htmlFor="maxViolations">Max Violations</Label>
            <Input
              id="maxViolations"
              type="number"
              value={formData.maxViolations}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  maxViolations: Number(e.target.value),
                }))
              }
            />
          </div>
          <div>
            <Label htmlFor="penaltyRate">Penalty Rate (%)</Label>
            <Input
              id="penaltyRate"
              type="number"
              value={formData.penaltyRate}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  penaltyRate: Number(e.target.value),
                }))
              }
            />
          </div>
          <div>
            <Label htmlFor="basePaymentRate">
              Base Payment Rate (tokens/sec)
            </Label>
            <Input
              id="basePaymentRate"
              type="number"
              value={formData.basePaymentRate}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  basePaymentRate: Number(e.target.value),
                }))
              }
            />
          </div>
        </div>

        <div className="text-sm text-muted-foreground">
          Total payment required:{" "}
          {((formData.basePaymentRate * formData.duration) / 1000000).toFixed(
            4
          )}{" "}
          ETH
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
