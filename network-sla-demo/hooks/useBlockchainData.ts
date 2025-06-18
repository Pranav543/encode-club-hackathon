import { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { provider } from '@/lib/blockchain';

interface PerformanceData {
  timestamp: number;
  latency: number;
  bandwidth: number;
  blockNumber: number;
  dataType: string;
}

export const useBlockchainPerformanceData = (performanceContractAddress: string) => {
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const performanceABI = [
    "function generateGoodPerformanceData() external",
    "function generateViolationPerformanceData() external",
    "function getLatestPerformance() external view returns (tuple(uint256 timestamp, uint256 latency, uint256 bandwidth, uint256 blockNumber, string dataType))",
    "function getPerformanceHistory(uint256 count) external view returns (tuple(uint256 timestamp, uint256 latency, uint256 bandwidth, uint256 blockNumber, string dataType)[])",
    "function currentMetricId() external view returns (uint256)",
    "function getTotalMetricsCount() external view returns (uint256)",
    "event PerformanceUpdated(uint256 indexed metricId, uint256 latency, uint256 bandwidth, uint256 timestamp, string dataType)"
  ];

  useEffect(() => {
    if (!performanceContractAddress) return;

    const contract = new ethers.Contract(performanceContractAddress, performanceABI, provider);

    const fetchInitialData = async () => {
      try {
        const totalCount = await contract.getTotalMetricsCount();
        const count = Math.min(Number(totalCount), 20); // Get last 20 data points
        
        if (count > 0) {
          const history = await contract.getPerformanceHistory(count);
          const formattedData = history.map((item: any) => ({
            timestamp: Number(item.timestamp),
            latency: Number(item.latency),
            bandwidth: Number(item.bandwidth),
            blockNumber: Number(item.blockNumber),
            dataType: item.dataType || 'unknown'
          }));
          setPerformanceData(formattedData.reverse()); // Show chronological order
        }
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching initial performance data:', error);
        setIsLoading(false);
      }
    };

    // Listen for new performance updates with updated event signature
    const handlePerformanceUpdate = async (
      metricId: any, 
      latency: any, 
      bandwidth: any, 
      timestamp: any, 
      dataType: any
    ) => {
      try {
        const blockNumber = await provider.getBlockNumber();
        const newData = {
          timestamp: Number(timestamp),
          latency: Number(latency),
          bandwidth: Number(bandwidth),
          blockNumber,
          dataType: dataType || 'unknown'
        };
        
        console.log('New performance data received:', newData);
        setPerformanceData(prev => [...prev.slice(-19), newData]); // Keep last 20 points
      } catch (error) {
        console.error('Error handling performance update:', error);
      }
    };

    contract.on('PerformanceUpdated', handlePerformanceUpdate);
    fetchInitialData();

    return () => {
      contract.removeAllListeners();
    };
  }, [performanceContractAddress]);

  return { performanceData, isLoading };
};
