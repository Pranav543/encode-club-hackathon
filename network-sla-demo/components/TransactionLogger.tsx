"use client";

import { useContractEvents } from "@/hooks/useContractEvents";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { NetworkSLAWithStreamRecreationABI } from "@/lib/contracts/NetworkSLAWithStreamRecreationABI";
import { ExternalLink } from "lucide-react";
import { ethers } from "ethers";

export const TransactionLogger = () => {
  const { events, isListening } = useContractEvents(
    process.env.NEXT_PUBLIC_NETWORK_SLA_ADDRESS!,
    [...NetworkSLAWithStreamRecreationABI]
  );

  const getEventColor = (eventName: string) => {
    switch (eventName) {
      case "SLACreated":
        return "bg-blue-500";
      case "StreamCreated":
        return "bg-green-500";
      case "ViolationDetected":
        return "bg-red-500";
      case "PaymentRateAdjusted":
        return "bg-orange-500";
      case "StreamCancelled":
        return "bg-purple-500";
      case "SLATerminated":
        return "bg-gray-500";
      case "PerformanceUpdated":
        return "bg-cyan-500";
      case "StreamRecreated":
        return "bg-indigo-500";
      case "PerformanceUpdated":
        return "bg-cyan-500";
      case "ComplianceChecked":
        return "bg-blue-500";
      case "WithdrawalExecuted":
        return "bg-green-600";
      case "StreamBalanceUpdated":
        return "bg-teal-500";
      default:
        return "bg-gray-500";
    }
  };

  const formatEventDetails = (event: any) => {
    const details: string[] = [];

    switch (event.eventName) {
      case "SLACreated":
        details.push(`SLA ID: ${event.args?.[0]?.toString() || "N/A"}`);
        details.push(`Provider: ${event.args?.[1]?.slice(0, 8) || "N/A"}...`);
        details.push(
          `Rate: ${event.args?.[3]?.toString() || "N/A"} tokens/sec (≈$${(
            Number(event.args?.[3] || 0) *
            0.001 *
            3400
          ).toFixed(2)}/sec)`
        );
        details.push(
          `Created at Metric: #${event.args?.[4]?.toString() || "N/A"}`
        );
        break;
      case "StreamCreated":
        details.push(`Stream ID: ${event.args?.[0]?.toString() || "N/A"}`);
        details.push(`SLA ID: ${event.args?.[1]?.toString() || "N/A"}`);
        details.push(
          `Rate: ${event.args?.[3]?.toString() || "N/A"} tokens/sec`
        );
        break;
      case "ViolationDetected":
        details.push(`SLA ID: ${event.args?.[0]?.toString() || "N/A"}`);
        details.push(`Metric ID: #${event.args?.[1]?.toString() || "N/A"}`);
        details.push(`Type: ${event.args?.[2] || "N/A"}`);
        details.push(`Value: ${event.args?.[3]?.toString() || "N/A"}`);
        details.push(`Threshold: ${event.args?.[4]?.toString() || "N/A"}`);
        details.push(
          `Total Violations: ${event.args?.[5]?.toString() || "N/A"}`
        );
        break;
      case "PaymentRateAdjusted":
        details.push(`SLA ID: ${event.args?.[0]?.toString() || "N/A"}`);
        details.push(`Old Rate: ${event.args?.[1]?.toString() || "N/A"}`);
        details.push(`New Rate: ${event.args?.[2]?.toString() || "N/A"}`);
        details.push(`Reason: ${event.args?.[3] || "N/A"}`);
        break;
      case "StreamCancelled":
        details.push(`Stream ID: ${event.args?.[0]?.toString() || "N/A"}`);
        details.push(`SLA ID: ${event.args?.[1]?.toString() || "N/A"}`);
        details.push(`Reason: ${event.args?.[2] || "N/A"}`);
        details.push(
          `Final Violations: ${event.args?.[3]?.toString() || "N/A"}`
        );
        break;
      case "SLATerminated":
        details.push(`SLA ID: ${event.args?.[0]?.toString() || "N/A"}`);
        details.push(`Reason: ${event.args?.[1] || "N/A"}`);
        details.push(
          `Total Violations: ${event.args?.[2]?.toString() || "N/A"}`
        );
        break;

      case "StreamRecreated":
        details.push(`New Stream ID: ${event.args?.[0]?.toString() || "N/A"}`);
        details.push(`SLA ID: ${event.args?.[1]?.toString() || "N/A"}`);
        details.push(
          `New Rate: ${event.args?.[2]?.toString() || "N/A"} tokens/sec`
        );
        details.push(`Reason: ${event.args?.[3] || "N/A"}`);
        break;
      case "PerformanceUpdated":
        details.push(`Metric ID: ${event.args?.[0]?.toString() || "N/A"}`);
        details.push(`Latency: ${event.args?.[1]?.toString() || "N/A"}ms`);
        details.push(`Bandwidth: ${event.args?.[2]?.toString() || "N/A"} Mbps`);
        details.push(`Type: ${event.args?.[4] || "N/A"}`);
        break;
      case "ComplianceChecked":
        details.push(`SLA ID: ${event.args?.[0]?.toString() || "N/A"}`);
        details.push(
          `Checked Metrics: #${event.args?.[1]?.toString() || "N/A"} to #${
            event.args?.[2]?.toString() || "N/A"
          }`
        );
        details.push(
          `Violations Found: ${event.args?.[3]?.toString() || "N/A"}`
        );
        break;
      // Add to the formatEventDetails function:
      case "WithdrawalExecuted":
        details.push(`Stream ID: ${event.args?.[0]?.toString() || "N/A"}`);
        details.push(`Provider: ${event.args?.[1]?.slice(0, 8) || "N/A"}...`);
        details.push(`Amount: ${ethers.formatEther(event.args?.[2] || 0)} ETH`);
        break;

      case "StreamBalanceUpdated":
        details.push(`Stream ID: ${event.args?.[0]?.toString() || "N/A"}`);
        details.push(
          `New Balance: ${ethers.formatEther(event.args?.[1] || 0)} ETH`
        );
        break;
    }

    return details;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Transaction Log</span>
          <Badge variant={isListening ? "default" : "secondary"}>
            {isListening ? "Live" : "Disconnected"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-96">
          <div className="space-y-2">
            {events.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No events yet. Create an SLA or generate data to see activity.
              </div>
            ) : (
              events.map((event, index) => (
                <div key={index} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <Badge className={getEventColor(event.eventName)}>
                      {event.eventName}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {event.timestamp.toLocaleTimeString()}
                    </span>
                  </div>

                  <div className="space-y-1">
                    {formatEventDetails(event).map((detail, i) => (
                      <div key={i} className="text-xs text-muted-foreground">
                        {detail}
                      </div>
                    ))}

                    <div className="flex items-center justify-between pt-2 mt-2 border-t">
                      <div className="text-xs text-muted-foreground">
                        Block: {event.blockNumber}
                      </div>
                      <a
                        href={`http://localhost:8545`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                      >
                        <span className="font-mono">
                          {event.transactionHash?.slice(0, 10)}...
                        </span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
