// components/StreamVisualization.tsx
'use client'

import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { motion } from 'framer-motion'

export default function StreamVisualization() {
  const [duration, setDuration] = useState(100)
  const [offset, setOffset] = useState(20)
  const [data, setData] = useState<any[]>([])

  // Calculate streaming data
  useEffect(() => {
    const points = 50
    const newData = []
    
    for (let i = 0; i <= points; i++) {
      const time = (i / points) * duration
      const progress = i / points
      
      // Linear calculation
      const linearAmount = progress * 1000
      
      // Logarithmic calculation (simplified)
      const logProgress = Math.log((time + offset) / (offset / 10 + 1)) / Math.log((duration + offset) / (offset / 10 + 1))
      const logAmount = Math.min(logProgress * 1000, 1000)
      
      newData.push({
        time: Math.round(time),
        linear: Math.round(linearAmount),
        logarithmic: Math.round(Math.max(0, logAmount))
      })
    }
    
    setData(newData)
  }, [duration, offset])

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="card">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">Payment Curve Visualization</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Stream Duration: {duration} seconds
            </label>
            <input
              type="range"
              min="50"
              max="200"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Log Curve Offset: {offset}
            </label>
            <input
              type="range"
              min="5"
              max="50"
              value={offset}
              onChange={(e) => setOffset(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            />
          </div>
        </div>
      </div>

      {/* Chart */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="card"
      >
        <h3 className="text-lg font-semibold mb-4 text-gray-800">
          Payment Release Over Time (1000 tokens total)
        </h3>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="time" 
                label={{ value: 'Time (seconds)', position: 'insideBottom', offset: -10 }}
              />
              <YAxis 
                label={{ value: 'Tokens Released', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                formatter={(value, name) => [`${value} tokens`, name === 'linear' ? 'Linear Stream' : 'Logarithmic Stream']}
                labelFormatter={(time) => `Time: ${time}s`}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="linear" 
                stroke="#3B82F6" 
                strokeWidth={3}
                name="Linear Stream"
                dot={false}
              />
              <Line 
                type="monotone" 
                dataKey="logarithmic" 
                stroke="#8B5CF6" 
                strokeWidth={3}
                name="Logarithmic Stream"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold mb-3 text-blue-600">📈 Linear Streaming</h3>
          <ul className="space-y-2 text-gray-600">
            <li>• Constant payment rate</li>
            <li>• Predictable cash flow</li>
            <li>• Simple calculation: rate × time</li>
            <li>• Perfect for regular salaries</li>
          </ul>
        </div>
        <div className="card">
          <h3 className="text-lg font-semibold mb-3 text-purple-600">📊 Logarithmic Streaming</h3>
          <ul className="space-y-2 text-gray-600">
            <li>• Slower start, accelerated end</li>
            <li>• Retention-focused design</li>
            <li>• Configurable curve steepness</li>
            <li>• Ideal for performance bonuses</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
