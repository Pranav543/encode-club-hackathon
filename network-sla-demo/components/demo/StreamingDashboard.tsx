'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  Pause, 
  DollarSign, 
  TrendingUp, 
  Users, 
  Clock, 
  CheckCircle,
  AlertTriangle,
  Zap
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface StreamData {
  id: string;
  sender: string;
  recipient: string;
  amount: number;
  rate: number;
  progress: number;
  status: 'active' | 'paused' | 'completed';
  startTime: Date;
  shape: 'linear' | 'logarithmic';
}

export const StreamingDashboard = () => {
  const [streams, setStreams] = useState<StreamData[]>([]);
  const [selectedStream, setSelectedStream] = useState<string | null>(null);
  const [totalVolume, setTotalVolume] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Sample data for demo
  const initializeDemoData = useCallback(() => {
    const demoStreams: StreamData[] = [
      {
        id: '1',
        sender: '0x1234...5678',
        recipient: '0x8765...4321',
        amount: 1000,
        rate: 0.1,
        progress: 45,
        status: 'active',
        startTime: new Date(Date.now() - 3600000),
        shape: 'linear'
      },
      {
        id: '2',
        sender: '0x9876...1234',
        recipient: '0x4321...8765',
        amount: 500,
        rate: 0.05,
        progress: 78,
        status: 'active',
        startTime: new Date(Date.now() - 7200000),
        shape: 'logarithmic'
      },
      {
        id: '3',
        sender: '0x5555...6666',
        recipient: '0x7777...8888',
        amount: 2000,
        rate: 0.2,
        progress: 100,
        status: 'completed',
        startTime: new Date(Date.now() - 10800000),
        shape: 'linear'
      }
    ];
    
    setStreams(demoStreams);
    setTotalVolume(3500);
  }, []);

  useEffect(() => {
    initializeDemoData();
  }, [initializeDemoData]);

  // Simulate real-time updates for demo
  useEffect(() => {
    const interval = setInterval(() => {
      setStreams(prev => prev.map(stream => ({
        ...stream,
        progress: stream.status === 'active' 
          ? Math.min(stream.progress + Math.random() * 2, 100)
          : stream.progress
      })));
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const createNewStream = useCallback(async () => {
    setIsLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const newStream: StreamData = {
      id: Date.now().toString(),
      sender: '0xABCD...EFGH',
      recipient: '0xIJKL...MNOP',
      amount: Math.floor(Math.random() * 1000) + 100,
      rate: Math.random() * 0.2 + 0.01,
      progress: 0,
      status: 'active',
      startTime: new Date(),
      shape: Math.random() > 0.5 ? 'linear' : 'logarithmic'
    };
    
    setStreams(prev => [newStream, ...prev]);
    setTotalVolume(prev => prev + newStream.amount);
    setIsLoading(false);
  }, []);

  const toggleStream = useCallback((streamId: string) => {
    setStreams(prev => prev.map(stream => 
      stream.id === streamId 
        ? { 
            ...stream, 
            status: stream.status === 'active' ? 'paused' : 'active' 
          }
        : stream
    ));
  }, []);

  // Chart data for visualization
  const chartData = streams.slice(0, 3).map((stream, index) => ({
    name: `Stream ${stream.id}`,
    progress: stream.progress,
    amount: stream.amount
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.h1 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-4xl font-bold text-gray-900 mb-4"
          >
            💰 Real-Time Payment Streaming
          </motion.h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Revolutionizing payments with continuous, programmable money streams. 
            Watch funds flow in real-time with customizable payment curves.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <motion.div 
            whileHover={{ scale: 1.02 }}
            className="bg-white rounded-xl p-6 shadow-lg border border-gray-100"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Streams</p>
                <p className="text-3xl font-bold text-green-600">
                  {streams.filter(s => s.status === 'active').length}
                </p>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <Zap className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </motion.div>

          <motion.div 
            whileHover={{ scale: 1.02 }}
            className="bg-white rounded-xl p-6 shadow-lg border border-gray-100"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Volume</p>
                <p className="text-3xl font-bold text-blue-600">
                  ${totalVolume.toLocaleString()}
                </p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </motion.div>

          <motion.div 
            whileHover={{ scale: 1.02 }}
            className="bg-white rounded-xl p-6 shadow-lg border border-gray-100"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Flow Rate</p>
                <p className="text-3xl font-bold text-purple-600">
                  {(streams.reduce((acc, s) => acc + s.rate, 0) / streams.length || 0).toFixed(3)}
                </p>
              </div>
              <div className="bg-purple-100 p-3 rounded-full">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </motion.div>

          <motion.div 
            whileHover={{ scale: 1.02 }}
            className="bg-white rounded-xl p-6 shadow-lg border border-gray-100"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completion Rate</p>
                <p className="text-3xl font-bold text-orange-600">
                  {Math.round((streams.filter(s => s.status === 'completed').length / streams.length) * 100) || 0}%
                </p>
              </div>
              <div className="bg-orange-100 p-3 rounded-full">
                <CheckCircle className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Stream List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Payment Streams</h2>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={createNewStream}
                  disabled={isLoading}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:shadow-lg transition-all duration-200 disabled:opacity-50"
                >
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Creating...</span>
                    </div>
                  ) : (
                    '+ New Stream'
                  )}
                </motion.button>
              </div>

              <div className="space-y-4">
                <AnimatePresence>
                  {streams.map((stream) => (
                    <motion.div
                      key={stream.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      whileHover={{ scale: 1.01 }}
                      className={`border rounded-lg p-4 cursor-pointer transition-all duration-200 ${
                        selectedStream === stream.id 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedStream(stream.id)}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${
                            stream.status === 'active' ? 'bg-green-500 animate-pulse' :
                            stream.status === 'paused' ? 'bg-yellow-500' : 'bg-gray-400'
                          }`} />
                          <div>
                            <p className="font-medium text-gray-900">Stream #{stream.id}</p>
                            <p className="text-sm text-gray-500">
                              {stream.sender} → {stream.recipient}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            stream.shape === 'linear' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-purple-100 text-purple-800'
                          }`}>
                            {stream.shape}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleStream(stream.id);
                            }}
                            className="p-1 hover:bg-gray-100 rounded"
                          >
                            {stream.status === 'active' ? (
                              <Pause className="h-4 w-4 text-gray-600" />
                            ) : (
                              <Play className="h-4 w-4 text-gray-600" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Amount: ${stream.amount}</span>
                          <span className="text-gray-600">Rate: {stream.rate}/sec</span>
                        </div>
                        
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Progress</span>
                            <span className="font-medium">{stream.progress.toFixed(1)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${stream.progress}%` }}
                              transition={{ duration: 0.5 }}
                              className={`h-2 rounded-full ${
                                stream.status === 'completed' ? 'bg-green-500' :
                                stream.status === 'active' ? 'bg-blue-500' : 'bg-yellow-500'
                              }`}
                            />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Chart */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Stream Performance</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="progress" 
                      stroke="#3B82F6" 
                      strokeWidth={2}
                      dot={{ fill: '#3B82F6' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Stream Details */}
            {selectedStream && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl shadow-lg border border-gray-100 p-6"
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Stream Details</h3>
                {(() => {
                  const stream = streams.find(s => s.id === selectedStream);
                  if (!stream) return null;
                  
                  return (
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">ID:</span>
                        <span className="font-medium">#{stream.id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Status:</span>
                        <span className={`font-medium capitalize ${
                          stream.status === 'active' ? 'text-green-600' :
                          stream.status === 'paused' ? 'text-yellow-600' : 'text-gray-600'
                        }`}>
                          {stream.status}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Amount:</span>
                        <span className="font-medium">${stream.amount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Flow Rate:</span>
                        <span className="font-medium">{stream.rate}/sec</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Shape:</span>
                        <span className="font-medium capitalize">{stream.shape}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Started:</span>
                        <span className="font-medium">
                          {stream.startTime.toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </motion.div>
            )}

            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button className="w-full bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 transition-colors">
                  Create Linear Stream
                </button>
                <button className="w-full bg-purple-500 text-white py-2 px-4 rounded-lg hover:bg-purple-600 transition-colors">
                  Create Logarithmic Stream
                </button>
                <button className="w-full bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors">
                  Pause All Streams
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
