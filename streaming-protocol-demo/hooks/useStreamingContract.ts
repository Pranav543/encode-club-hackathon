// hooks/useStreamingContract.ts
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseEther, formatEther } from 'viem'
import { STREAMING_CONTRACT_ADDRESS, STREAMING_CONTRACT_ABI, TEST_TOKEN_ADDRESS } from '@/lib/contracts'

export function useStreamingContract() {
  const { writeContract, data: hash, error, isPending } = useWriteContract()
  
  const { isLoading: isConfirming, isSuccess: isConfirmed } = 
    useWaitForTransactionReceipt({ hash })

  // Create Linear Stream
  const createLinearStream = async (
    recipient: string,
    amount: string,
    duration: number
  ) => {
    const deposit = parseEther(amount)
    const startTime = BigInt(Math.floor(Date.now() / 1000))
    const stopTime = startTime + BigInt(duration)

    return writeContract({
      address: STREAMING_CONTRACT_ADDRESS,
      abi: STREAMING_CONTRACT_ABI,
      functionName: 'createLinearStream',
      args: [recipient, deposit, TEST_TOKEN_ADDRESS, startTime, stopTime, true]
    })
  }

  // Create Logarithmic Stream  
  const createLogarithmicStream = async (
    recipient: string,
    amount: string,
    duration: number,
    offset: number
  ) => {
    const deposit = parseEther(amount)
    const startTime = BigInt(Math.floor(Date.now() / 1000))
    const stopTime = startTime + BigInt(duration)

    return writeContract({
      address: STREAMING_CONTRACT_ADDRESS,
      abi: STREAMING_CONTRACT_ABI,
      functionName: 'createLogarithmicStream',
      args: [recipient, deposit, TEST_TOKEN_ADDRESS, startTime, stopTime, true, BigInt(offset)]
    })
  }

  // Withdraw from Stream
  const withdrawFromStream = async (streamId: number, amount: string) => {
    return writeContract({
      address: STREAMING_CONTRACT_ADDRESS,
      abi: STREAMING_CONTRACT_ABI,
      functionName: 'withdrawFromStream',
      args: [BigInt(streamId), parseEther(amount)]
    })
  }

  // Cancel Stream
  const cancelStream = async (streamId: number) => {
    return writeContract({
      address: STREAMING_CONTRACT_ADDRESS,
      abi: STREAMING_CONTRACT_ABI,
      functionName: 'cancelStream',
      args: [BigInt(streamId)]
    })
  }

  return {
    createLinearStream,
    createLogarithmicStream,
    withdrawFromStream,
    cancelStream,
    isPending,
    isConfirming,
    isConfirmed,
    error,
    hash
  }
}

// Read-only hooks
export function useStreamBalance(streamId: number | undefined) {
  return useReadContract({
    address: STREAMING_CONTRACT_ADDRESS,
    abi: STREAMING_CONTRACT_ABI,
    functionName: 'balanceOf',
    args: streamId ? [BigInt(streamId)] : undefined,
    query: {
      enabled: !!streamId,
      refetchInterval: 5000 // Refresh every 5 seconds
    }
  })
}

export function useStreamData(streamId: number | undefined) {
  return useReadContract({
    address: STREAMING_CONTRACT_ADDRESS,
    abi: STREAMING_CONTRACT_ABI,
    functionName: 'getStream',
    args: streamId ? [BigInt(streamId)] : undefined,
    query: {
      enabled: !!streamId
    }
  })
}

export function useNextStreamId() {
  return useReadContract({
    address: STREAMING_CONTRACT_ADDRESS,
    abi: STREAMING_CONTRACT_ABI,
    functionName: 'nextStreamId',
    query: {
      refetchInterval: 10000
    }
  })
}
