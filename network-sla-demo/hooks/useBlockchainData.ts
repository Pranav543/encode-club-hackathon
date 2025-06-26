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
  const [error, setError] = useState<string | null>(null);
  const [lastContractAddress, setLastContractAddress] = useState<string>('');

  const performanceABI = [
    "function generateGoodPerformanceData() external",
    "function generateViolationPerformanceData() external",
    "function getLatestPerformance() external view returns (tuple(uint256 timestamp, uint256 latency, uint256 bandwidth, uint256 blockNumber, string dataType))",
    "function getPerformanceHistory(uint256 count) external view returns (tuple(uint256 timestamp, uint256 latency, uint256 bandwidth, uint256 blockNumber, string dataType)[])",
    "function currentMetricId() external view returns (uint256)",
    "function getTotalMetricsCount() external view returns (uint256)",
    "function getPerformanceMetric(uint256 metricId) external view returns (tuple(uint256 timestamp, uint256 latency, uint256 bandwidth, uint256 blockNumber, string dataType))",
    "event PerformanceUpdated(uint256 indexed metricId, uint256 latency, uint256 bandwidth, uint256 timestamp, string dataType)"
  ];

  useEffect(() => {
    if (!performanceContractAddress) return;

    // Check if contract address changed (new deployment)
    if (lastContractAddress && lastContractAddress !== performanceContractAddress) {
      console.log('📍 New contract detected, clearing old performance data');
      setPerformanceData([]);
      setError(null);
    }
    setLastContractAddress(performanceContractAddress);

    const contract = new ethers.Contract(performanceContractAddress, performanceABI, provider);

    const fetchInitialData = async () => {
      try {
        console.log('📊 Fetching fresh performance data from new contract...');
        
        const totalCount = await contract.getTotalMetricsCount();
        console.log('Total metrics in new contract:', totalCount.toString());
        
        if (Number(totalCount) > 0) {
          const count = Math.min(Number(totalCount), 20);
          const history = await contract.getPerformanceHistory(count);
          const formattedData = history.map((item: any) => ({
            timestamp: Number(item.timestamp),
            latency: Number(item.latency),
            bandwidth: Number(item.bandwidth),
            blockNumber: Number(item.blockNumber),
            dataType: item.dataType || 'unknown'
          }));
          setPerformanceData(formattedData.reverse());
          console.log('✅ Loaded', formattedData.length, 'data points from new contract');
        } else {
          console.log('📭 No performance data in new contract - starting fresh');
          setPerformanceData([]);
        }
        
        setError(null);
        setIsLoading(false);
      } catch (error: any) {
        console.error('❌ Error fetching performance data from new contract:', error);
        setError(`Failed to fetch data from new contract: ${error.message}`);
        setPerformanceData([]); // Clear old data on error
        setIsLoading(false);
      }
    };

    // Listen for new performance updates
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
        
        console.log('🔄 New performance data from current contract:', newData);
        setPerformanceData(prev => [...prev.slice(-19), newData]);
      } catch (error) {
        console.error('Error handling performance update:', error);
      }
    };

    // Remove old listeners before adding new ones
    contract.removeAllListeners('PerformanceUpdated');
    contract.on('PerformanceUpdated', handlePerformanceUpdate);
    
    fetchInitialData();

    return () => {
      contract.removeAllListeners();
    };
  }, [performanceContractAddress]); // React to contract address changes

  return { performanceData, isLoading, error };
};
