// components/RealStreamManager.tsx
'use client'

import { useState, useEffect } from 'react'
import { useAccount, useBalance } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { formatEther, parseEther } from 'viem'
import { useStreamingContract, useStreamBalance, useStreamData, useNextStreamId } from '@/hooks/useStreamingContract'
import { useTestToken } from '@/hooks/useTestToken'
import { TEST_TOKEN_ADDRESS } from '@/lib/contracts'
import { motion, AnimatePresence } from 'framer-motion'

export default function RealStreamManager() {
  const { address, isConnected } = useAccount()
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [approvalAmount, setApprovalAmount] = useState('')
  const [showApprovalForm, setShowApprovalForm] = useState(false)

  const {
    createLinearStream,
    createLogarithmicStream,
    withdrawFromStream,
    cancelStream,
    isPending,
    isConfirming,
    isConfirmed,
    error
  } = useStreamingContract()

  const {
    balance: tokenBalance,
    symbol,
    allowance,
    approveTokens,
    mintTokens,
    refetchBalance,
    refetchAllowance,
    isPending: tokenPending
  } = useTestToken()

  const { data: nextStreamId } = useNextStreamId()

  const [newStream, setNewStream] = useState({
    recipient: '',
    amount: '',
    duration: '3600',
    type: 'linear' as 'linear' | 'logarithmic',
    offset: '100'
  })

  const [activeStreams, setActiveStreams] = useState<number[]>([])

  // Track created streams
  useEffect(() => {
    if (isConfirmed && nextStreamId) {
      const newStreamId = Number(nextStreamId) - 1
      if (newStreamId > 0) {
        setActiveStreams(prev => [...prev, newStreamId])
      }
    }
  }, [isConfirmed, nextStreamId])

  const handleCreateStream = async () => {
    if (!newStream.recipient || !newStream.amount || !newStream.duration) return

    try {
      if (newStream.type === 'linear') {
        await createLinearStream(
          newStream.recipient,
          newStream.amount,
          parseInt(newStream.duration)
        )
      } else {
        await createLogarithmicStream(
          newStream.recipient,
          newStream.amount,
          parseInt(newStream.duration),
          parseInt(newStream.offset)
        )
      }
    } catch (err) {
      console.error('Error creating stream:', err)
    }
  }

  const handleApproveTokens = async () => {
    if (!approvalAmount) return
    try {
      await approveTokens(approvalAmount)
      await refetchAllowance()
    } catch (err) {
      console.error('Error approving tokens:', err)
    }
  }

  const handleMintTokens = async () => {
    if (!address) return
    try {
      await mintTokens(address, "1000") // Mint 1000 tokens
      await refetchBalance()
    } catch (err) {
      console.error('Error minting tokens:', err)
    }
  }

  const needsApproval = newStream.amount && allowance !== undefined && 
    parseEther(newStream.amount) > allowance

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Connect Your Wallet</h2>
          <p className="text-gray-600 mb-6">Connect your wallet to interact with the streaming protocol</p>
          <ConnectButton />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Real Stream Management</h2>
          <p className="text-gray-600">Connected: {address?.slice(0, 6)}...{address?.slice(-4)}</p>
          <p className="text-sm text-gray-500">
            Token Balance: {tokenBalance ? formatEther(tokenBalance) : '0'} {symbol || 'DEMO'}
          </p>
          <p className="text-sm text-gray-500">
            Allowance: {allowance ? formatEther(allowance) : '0'} {symbol || 'DEMO'}
          </p>
        </div>
        <div className="flex gap-2">
          <ConnectButton />
          <button
            onClick={() => setShowApprovalForm(!showApprovalForm)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Approve Tokens
          </button>
          <button
            onClick={handleMintTokens}
            disabled={tokenPending}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
          >
            {tokenPending ? 'Minting...' : 'Mint 1000 Tokens'}
          </button>
          <button
            onClick={() => setShowCreateForm(true)}
            disabled={isPending || isConfirming}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isPending || isConfirming ? 'Creating...' : 'Create Stream'}
          </button>
        </div>
      </div>

      {/* Transaction Status */}
      {isPending && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">Transaction pending... Please confirm in your wallet.</p>
        </div>
      )}

      {isConfirming && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-blue-800">Transaction submitted! Waiting for confirmation...</p>
        </div>
      )}

      {isConfirmed && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-800">Transaction confirmed successfully!</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Error: {error.message}</p>
        </div>
      )}

      {/* Approval Form */}
      <AnimatePresence>
        {showApprovalForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="card"
          >
            <h3 className="text-lg font-bold mb-4">Approve Tokens</h3>
            <div className="flex gap-4">
              <input
                type="number"
                value={approvalAmount}
                onChange={(e) => setApprovalAmount(e.target.value)}
                placeholder="Amount to approve"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleApproveTokens}
                disabled={tokenPending || !approvalAmount}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {tokenPending ? 'Approving...' : 'Approve'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Stream Form */}
      <AnimatePresence>
        {showCreateForm && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="card"
          >
            <h3 className="text-xl font-bold mb-4">Create New Stream</h3>
            
            {needsApproval && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <p className="text-yellow-800">
                  You need to approve {newStream.amount} tokens before creating this stream.
                </p>
                <button
                  onClick={() => {
                    setApprovalAmount(newStream.amount)
                    setShowApprovalForm(true)
                  }}
                  className="mt-2 px-3 py-1 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700"
                >
                  Approve Required Amount
                </button>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Recipient Address
                </label>
                <input
                  type="text"
                  value={newStream.recipient}
                  onChange={(e) => setNewStream({...newStream, recipient: e.target.value})}
                  placeholder="0x..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount ({symbol || 'DEMO'} tokens)
                </label>
                <input
                  type="number"
                  value={newStream.amount}
                  onChange={(e) => setNewStream({...newStream, amount: e.target.value})}
                  placeholder="100"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Duration (seconds)
                </label>
                <input
                  type="number"
                  value={newStream.duration}
                  onChange={(e) => setNewStream({...newStream, duration: e.target.value})}
                  placeholder="3600"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stream Type
                </label>
                <select
                  value={newStream.type}
                  onChange={(e) => setNewStream({...newStream, type: e.target.value as 'linear' | 'logarithmic'})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="linear">Linear</option>
                  <option value="logarithmic">Logarithmic</option>
                </select>
              </div>
              
              {newStream.type === 'logarithmic' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Logarithmic Offset
                  </label>
                  <input
                    type="number"
                    value={newStream.offset}
                    onChange={(e) => setNewStream({...newStream, offset: e.target.value})}
                    placeholder="100"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
              
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleCreateStream}
                  disabled={isPending || isConfirming || needsApproval}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {isPending || isConfirming ? 'Creating...' : 'Create Stream'}
                </button>
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Streams */}
      {activeStreams.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Your Active Streams</h3>
          <div className="space-y-4">
            {activeStreams.map((streamId) => (
              <StreamCard key={streamId} streamId={streamId} />
            ))}
          </div>
        </div>
      )}

      {/* Contract Information */}
      <div className="card bg-blue-50 border-blue-200">
        <h3 className="text-lg font-semibold mb-3 text-blue-800">Contract Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-blue-700 font-medium">Streaming Contract:</p>
            <p className="text-blue-600 break-all">{STREAMING_CONTRACT_ADDRESS}</p>
          </div>
          <div>
            <p className="text-blue-700 font-medium">Test Token:</p>
            <p className="text-blue-600 break-all">{TEST_TOKEN_ADDRESS}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// Stream Card Component
function StreamCard({ streamId }: { streamId: number }) {
  const { data: streamData } = useStreamData(streamId)
  const { data: balance } = useStreamBalance(streamId)
  const { withdrawFromStream, cancelStream } = useStreamingContract()

  if (!streamData) return null

  const stream = streamData as any
  const currentBalance = balance ? formatEther(balance) : '0'
  const totalDeposit = stream.deposit ? formatEther(stream.deposit) : '0'
  const progress = stream.deposit ? 
    ((BigInt(stream.deposit) - BigInt(stream.remainingBalance)) * BigInt(100)) / BigInt(stream.deposit) : BigInt(0)

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h4 className="font-semibold">Stream #{streamId}</h4>
          <p className="text-sm text-gray-600">
            To: {stream.recipient?.slice(0, 10)}...{stream.recipient?.slice(-6)}
          </p>
          <p className="text-sm text-gray-600">
            Type: {stream.shape === 0 ? 'Linear' : 'Logarithmic'}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-600">Available: {currentBalance}</p>
          <p className="text-sm text-gray-600">Total: {totalDeposit}</p>
        </div>
      </div>
      
      <div className="mb-3">
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm text-gray-600">Progress</span>
          <span className="text-sm font-medium">{progress.toString()}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${progress.toString()}%` }}
          />
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => withdrawFromStream(streamId, currentBalance)}
          disabled={Number(currentBalance) === 0}
          className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50"
        >
          Withdraw Available
        </button>
        <button
          onClick={() => cancelStream(streamId)}
          className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
        >
          Cancel Stream
        </button>
      </div>
    </div>
  )
}
