import { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { provider } from '@/lib/blockchain';

export const useContractEvents = (contractAddress: string, abi: any[]) => {
  const [events, setEvents] = useState<any[]>([]);
  const [isListening, setIsListening] = useState(false);

  useEffect(() => {
    if (!contractAddress || !abi.length) return;

    const contract = new ethers.Contract(contractAddress, abi, provider);
    
    const startListening = async () => {
      setIsListening(true);
      
      // Listen to all contract events
      contract.on('*', (event) => {
        const eventData = {
          timestamp: new Date(),
          blockNumber: event.blockNumber,
          transactionHash: event.transactionHash,
          eventName: event.fragment?.name || 'Unknown',
          args: event.args,
        };
        
        setEvents(prev => [eventData, ...prev].slice(0, 100)); // Keep last 100 events
      });
    };

    startListening();

    return () => {
      contract.removeAllListeners();
      setIsListening(false);
    };
  }, [contractAddress, abi]);

  return { events, isListening };
};
