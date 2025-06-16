// hooks/useTestToken.ts
import { useReadContract, useWriteContract, useAccount } from 'wagmi'
import { parseEther } from 'viem'
import { TEST_TOKEN_ADDRESS, TEST_TOKEN_ABI, STREAMING_CONTRACT_ADDRESS } from '@/lib/contracts'

export function useTestToken() {
  const { address } = useAccount()
  const { writeContract, data: hash, error, isPending } = useWriteContract()

  // Get token balance
  const { data: balance, refetch: refetchBalance } = useReadContract({
    address: TEST_TOKEN_ADDRESS,
    abi: TEST_TOKEN_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
      refetchInterval: 10000
    }
  })

  // Get token symbol
  const { data: symbol } = useReadContract({
    address: TEST_TOKEN_ADDRESS,
    abi: TEST_TOKEN_ABI,
    functionName: 'symbol'
  })

  // Check allowance
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: TEST_TOKEN_ADDRESS,
    abi: TEST_TOKEN_ABI,
    functionName: 'allowance',
    args: address ? [address, STREAMING_CONTRACT_ADDRESS] : undefined,
    query: {
      enabled: !!address
    }
  })

  // Approve tokens
  const approveTokens = async (amount: string) => {
    return writeContract({
      address: TEST_TOKEN_ADDRESS,
      abi: TEST_TOKEN_ABI,
      functionName: 'approve',
      args: [STREAMING_CONTRACT_ADDRESS, parseEther(amount)]
    })
  }

  // Mint tokens (if you're the owner)
  const mintTokens = async (to: string, amount: string) => {
    return writeContract({
      address: TEST_TOKEN_ADDRESS,
      abi: TEST_TOKEN_ABI,
      functionName: 'mint',
      args: [to, parseEther(amount)]
    })
  }

  return {
    balance,
    symbol,
    allowance,
    approveTokens,
    mintTokens,
    refetchBalance,
    refetchAllowance,
    isPending,
    error,
    hash
  }
}
