import { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { provider } from '@/lib/blockchain';

interface PerformanceData {
  timestamp: number;
  latency: number;
  bandwidth: number;
  blockNumber: number;
}

export const useBlockchainPerformanceData = (performanceContractAddress: string) => {
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const performanceABI = [
    "function generatePerformanceData() external",
    "function getLatestPerformance() external view returns (tuple(uint256 timestamp, uint256 latency, uint256 bandwidth, uint256 blockNumber))",
    "function getPerformanceHistory(uint256 count) external view returns (tuple(uint256 timestamp, uint256 latency, uint256 bandwidth, uint256 blockNumber)[])",
    "function currentMetricId() external view returns (uint256)",
    "event PerformanceUpdated(uint256 indexed metricId, uint256 latency, uint256 bandwidth, uint256 timestamp)"
  ];

  useEffect(() => {
    if (!performanceContractAddress) return;

    const contract = new ethers.Contract(performanceContractAddress, performanceABI, provider);

    const fetchInitialData = async () => {
      try {
        const currentId = await contract.currentMetricId();
        const count = Math.min(Number(currentId), 20); // Get last 20 data points
        
        if (count > 0) {
          const history = await contract.getPerformanceHistory(count);
          const formattedData = history.map((item: any) => ({
            timestamp: Number(item.timestamp),
            latency: Number(item.latency),
            bandwidth: Number(item.bandwidth),
            blockNumber: Number(item.blockNumber)
          }));
          setPerformanceData(formattedData.reverse()); // Show chronological order
        }
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching initial performance data:', error);
        setIsLoading(false);
      }
    };

    // Listen for new performance updates
    const handlePerformanceUpdate = async (metricId: any, latency: any, bandwidth: any, timestamp: any) => {
      const blockNumber = await provider.getBlockNumber();
      const newData = {
        timestamp: Number(timestamp),
        latency: Number(latency),
        bandwidth: Number(bandwidth),
        blockNumber
      };
      
      setPerformanceData(prev => [...prev.slice(-19), newData]); // Keep last 20 points
    };

    contract.on('PerformanceUpdated', handlePerformanceUpdate);
    fetchInitialData();

    return () => {
      contract.removeAllListeners();
    };
  }, [performanceContractAddress]);

  return { performanceData, isLoading };
};
