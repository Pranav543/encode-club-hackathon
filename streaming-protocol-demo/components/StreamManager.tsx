// components/StreamManager.tsx
'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Pause, Square, Eye, Trash2, TrendingUp } from 'lucide-react'

interface MockStream {
  id: number
  recipient: string
  amount: number
  duration: number
  type: 'linear' | 'logarithmic'
  progress: number
  status: 'active' | 'paused' | 'completed'
  startTime: Date
}

export default function StreamManager() {
  const [streams, setStreams] = useState<MockStream[]>([
    {
      id: 1,
      recipient: '0x1234...5678',
      amount: 1000,
      duration: 3600,
      type: 'linear',
      progress: 45,
      status: 'active',
      startTime: new Date(Date.now() - 1620000) // 27 minutes ago
    },
    {
      id: 2,
      recipient: '0xABCD...EFGH',
      amount: 2500,
      duration: 7200,
      type: 'logarithmic',
      progress: 23,
      status: 'active',
      startTime: new Date(Date.now() - 1656000) // 27.6 minutes ago
    },
    {
      id: 3,
      recipient: '0x9876...4321',
      amount: 500,
      duration: 1800,
      type: 'linear',
      progress: 100,
      status: 'completed',
      startTime: new Date(Date.now() - 1800000) // 30 minutes ago
    }
  ])

  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newStream, setNewStream] = useState({
    recipient: '',
    amount: '',
    duration: '',
    type: 'linear' as 'linear' | 'logarithmic'
  })

  const createStream = () => {
    if (!newStream.recipient || !newStream.amount || !newStream.duration) return

    const stream: MockStream = {
      id: streams.length + 1,
      recipient: newStream.recipient,
      amount: Number(newStream.amount),
      duration: Number(newStream.duration),
      type: newStream.type,
      progress: 0,
      status: 'active',
      startTime: new Date()
    }

    setStreams([...streams, stream])
    setNewStream({ recipient: '', amount: '', duration: '', type: 'linear' })
    setShowCreateForm(false)
  }

  const updateStreamStatus = (id: number, status: 'active' | 'paused' | 'completed') => {
    setStreams(streams.map(stream => 
      stream.id === id ? { ...stream, status } : stream
    ))
  }

  const deleteStream = (id: number) => {
    setStreams(streams.filter(stream => stream.id !== id))
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'paused': return 'bg-yellow-100 text-yellow-800'
      case 'completed': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header with Create Button */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Stream Management</h2>
        <button
          onClick={() => setShowCreateForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Play size={16} />
          Create Stream
        </button>
      </div>

      {/* Create Stream Modal */}
      <AnimatePresence>
        {showCreateForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={() => setShowCreateForm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl p-6 w-full max-w-md mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold mb-4">Create New Stream</h3>
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
                    Amount (tokens)
                  </label>
                  <input
                    type="number"
                    value={newStream.amount}
                    onChange={(e) => setNewStream({...newStream, amount: e.target.value})}
                    placeholder="1000"
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
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={createStream}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Create Stream
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
          </motion.div>
        )}
      </AnimatePresence>

      {/* Streams List */}
      <div className="space-y-4">
        {streams.map((stream) => (
          <motion.div
            key={stream.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card hover:shadow-xl transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                  #{stream.id}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">
                    Stream to {stream.recipient.slice(0, 10)}...
                  </h3>
                  <p className="text-sm text-gray-600">
                    {stream.amount} tokens • {stream.duration}s • {stream.type}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(stream.status)}`}>
                  {stream.status}
                </span>
                <div className="flex gap-1">
                  {stream.status === 'active' && (
                    <button
                      onClick={() => updateStreamStatus(stream.id, 'paused')}
                      className="p-1 text-yellow-600 hover:bg-yellow-50 rounded"
                    >
                      <Pause size={16} />
                    </button>
                  )}
                  {stream.status === 'paused' && (
                    <button
                      onClick={() => updateStreamStatus(stream.id, 'active')}
                      className="p-1 text-green-600 hover:bg-green-50 rounded"
                    >
                      <Play size={16} />
                    </button>
                  )}
                  <button
                    onClick={() => updateStreamStatus(stream.id, 'completed')}
                    className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                  >
                    <Square size={16} />
                  </button>
                  <button
                    onClick={() => deleteStream(stream.id)}
                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="mb-3">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-gray-600">Progress</span>
                <span className="text-sm font-medium text-gray-800">{stream.progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${stream.progress}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className={`h-2 rounded-full ${
                    stream.type === 'linear' 
                      ? 'bg-gradient-to-r from-blue-400 to-blue-600' 
                      : 'bg-gradient-to-r from-purple-400 to-purple-600'
                  }`}
                />
              </div>
            </div>

            {/* Stream Stats */}
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Streamed:</span>
                <p className="font-medium">{Math.round(stream.amount * stream.progress / 100)} tokens</p>
              </div>
              <div>
                <span className="text-gray-600">Remaining:</span>
                <p className="font-medium">{stream.amount - Math.round(stream.amount * stream.progress / 100)} tokens</p>
              </div>
              <div>
                <span className="text-gray-600">Rate:</span>
                <p className="font-medium">{(stream.amount / stream.duration).toFixed(2)} tokens/s</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Summary Stats */}
      <div className="card bg-gradient-to-r from-blue-50 to-purple-50">
        <h3 className="text-lg font-semibold mb-4 text-gray-800">Summary Statistics</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">{streams.length}</p>
            <p className="text-sm text-gray-600">Total Streams</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">
              {streams.filter(s => s.status === 'active').length}
            </p>
            <p className="text-sm text-gray-600">Active</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-600">
              {streams.reduce((sum, s) => sum + s.amount, 0)}
            </p>
            <p className="text-sm text-gray-600">Total Value</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-orange-600">
              {Math.round(streams.reduce((sum, s) => sum + (s.amount * s.progress / 100), 0))}
            </p>
            <p className="text-sm text-gray-600">Tokens Streamed</p>
          </div>
        </div>
      </div>
    </div>
  )
}
