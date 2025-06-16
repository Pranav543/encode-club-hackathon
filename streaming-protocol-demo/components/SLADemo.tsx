// components/SLADemo.tsx
'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'
import { Wifi, AlertTriangle, CheckCircle, Globe } from 'lucide-react'

interface NetworkNode {
  id: string
  name: string
  bandwidth: number
  latency: number
  uptime: number
  violations: number
  status: 'healthy' | 'warning' | 'critical'
}

export default function SLADemo() {
  const [nodes, setNodes] = useState<NetworkNode[]>([
    { id: '1', name: 'Node Alpha', bandwidth: 95, latency: 12, uptime: 99.8, violations: 0, status: 'healthy' },
    { id: '2', name: 'Node Beta', bandwidth: 78, latency: 45, uptime: 97.2, violations: 2, status: 'warning' },
    { id: '3', name: 'Node Gamma', bandwidth: 45, latency: 89, uptime: 94.1, violations: 5, status: 'critical' },
    { id: '4', name: 'Node Delta', bandwidth: 92, latency: 18, uptime: 99.5, violations: 1, status: 'healthy' }
  ])

  const [performanceData, setPerformanceData] = useState<any[]>([])

  // Generate mock performance data
  useEffect(() => {
    const generateData = () => {
      const data = []
      const now = Date.now()
      
      for (let i = 23; i >= 0; i--) {
        const time = new Date(now - i * 60 * 60 * 1000)
        data.push({
          time: time.getHours(),
          bandwidth: Math.random() * 20 + 80,
          latency: Math.random() * 30 + 10,
          violations: Math.random() > 0.8 ? Math.floor(Math.random() * 3) : 0
        })
      }
      
      setPerformanceData(data)
    }

    generateData()
    const interval = setInterval(generateData, 5000)
    return () => clearInterval(interval)
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-100'
      case 'warning': return 'text-yellow-600 bg-yellow-100'
      case 'critical': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle size={16} />
      case 'warning': return <AlertTriangle size={16} />
      case 'critical': return <AlertTriangle size={16} />
      default: return <Wifi size={16} />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card">
        <h2 className="text-2xl font-bold mb-4 text-gray-800 flex items-center gap-2">
          <Globe className="text-blue-600" />
          Decentralized Network SLA Management
        </h2>
        <p className="text-gray-600 mb-4">
          Service Level Agreements between network nodes with automatic economic incentives and penalties. 
          Payment streams are dynamically adjusted based on performance metrics.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold text-blue-800 mb-2">SLA Parameters</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Bandwidth: ≥ 80 Mbps</li>
              <li>• Latency: ≤ 50ms</li>
              <li>• Uptime: ≥ 99%</li>
            </ul>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="font-semibold text-green-800 mb-2">Incentives</h3>
            <ul className="text-sm text-green-700 space-y-1">
              <li>• Full payment for compliance</li>
              <li>• Bonus for exceeding targets</li>
              <li>• Automatic stream creation</li>
            </ul>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <h3 className="font-semibold text-red-800 mb-2">Penalties</h3>
            <ul className="text-sm text-red-700 space-y-1">
              <li>• 20% reduction per violation</li>
              <li>• Minimum 10% payment floor</li>
              <li>• Dynamic rate adjustment</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Network Nodes Status */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4 text-gray-800">Network Nodes Performance</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {nodes.map((node) => (
            <motion.div
              key={node.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-gray-800">{node.name}</h4>
                <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(node.status)}`}>
                  {getStatusIcon(node.status)}
                  {node.status}
                </div>
              </div>
              
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-sm">
                    <span>Bandwidth</span>
                    <span className="font-medium">{node.bandwidth} Mbps</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${node.bandwidth >= 80 ? 'bg-green-500' : 'bg-red-500'}`}
                      style={{ width: `${Math.min(node.bandwidth, 100)}%` }}
                    />
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between text-sm">
                    <span>Latency</span>
                    <span className="font-medium">{node.latency}ms</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${node.latency <= 50 ? 'bg-green-500' : 'bg-red-500'}`}
                      style={{ width: `${100 - node.latency}%` }}
                    />
                  </div>
                </div>
                
                <div className="pt-2 border-t border-gray-200">
                  <div className="flex justify-between text-sm">
                    <span>Uptime:</span>
                    <span className="font-medium">{node.uptime}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Violations:</span>
                    <span className={`font-medium ${node.violations > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {node.violations}
                    </span>
                  </div>
                </div>

                {/* Payment Adjustment */}
                <div className="pt-2 border-t border-gray-200">
                  <div className="text-sm">
                    <span className="text-gray-600">Payment Rate:</span>
                    <span className={`font-bold ml-1 ${
                      node.violations === 0 ? 'text-green-600' : 
                      node.violations <= 2 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {Math.max(10, 100 - (node.violations * 20))}%
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Network Performance (24h)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" tickFormatter={(time) => `${time}:00`} />
                <YAxis />
                <Tooltip 
                  labelFormatter={(time) => `${time}:00`}
                  formatter={(value: any, name: string) => [
                    `${value.toFixed(1)}${name === 'bandwidth' ? ' Mbps' : 'ms'}`,
                    name === 'bandwidth' ? 'Bandwidth' : 'Latency'
                  ]}
                />
                <Area 
                  type="monotone" 
                  dataKey="bandwidth" 
                  stackId="1" 
                  stroke="#10B981" 
                  fill="#10B981" 
                  fillOpacity={0.3}
                />
                <Area 
                  type="monotone" 
                  dataKey="latency" 
                  stackId="2" 
                  stroke="#F59E0B" 
                  fill="#F59E0B" 
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">SLA Violations (24h)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" tickFormatter={(time) => `${time}:00`} />
                <YAxis />
                <Tooltip 
                  labelFormatter={(time) => `${time}:00`}
                  formatter={(value: any) => [`${value} violations`, 'Violations']}
                />
                <Line 
                  type="monotone" 
                  dataKey="violations" 
                  stroke="#EF4444" 
                  strokeWidth={3}
                  dot={{ fill: '#EF4444' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Economic Model */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4 text-gray-800">Economic Incentive Model</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-3 text-gray-700">Base Payment</h4>
            <p className="text-2xl font-bold text-blue-600">1000 tokens/hour</p>
            <p className="text-sm text-gray-600 mt-1">For meeting SLA requirements</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-3 text-gray-700">Penalty Structure</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>1-2 violations:</span>
                <span className="font-medium text-yellow-600">-20%</span>
              </div>
              <div className="flex justify-between">
                <span>3-4 violations:</span>
                <span className="font-medium text-orange-600">-40%</span>
              </div>
              <div className="flex justify-between">
                <span>5+ violations:</span>
                <span className="font-medium text-red-600">-60%</span>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-3 text-gray-700">Current Payouts</h4>
            <div className="space-y-1 text-sm">
              {nodes.map((node) => (
                <div key={node.id} className="flex justify-between">
                  <span>{node.name}:</span>
                  <span className={`font-medium ${
                    node.violations === 0 ? 'text-green-600' : 
                    node.violations <= 2 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {Math.max(10, 100 - (node.violations * 20))}% 
                    ({Math.max(100, 1000 - (node.violations * 200))} tokens/hr)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Implementation Details */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4 text-gray-800">Implementation Highlights</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-semibold mb-3 text-gray-700">Smart Contract Features</h4>
            <ul className="space-y-2 text-gray-600">
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                NetworkSLA.sol for SLA management
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                MockPerformanceOracle.sol for data feeds
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                Dynamic stream rate adjustments
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                Automated violation detection
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-3 text-gray-700">Use Case Benefits</h4>
            <ul className="space-y-2 text-gray-600">
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                Trustless quality assurance
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                Economic incentives for performance
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                Automated penalty enforcement
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                Scalable to multi-chain networks
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
