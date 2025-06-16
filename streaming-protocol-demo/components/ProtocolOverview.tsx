// components/ProtocolOverview.tsx
import { motion } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function ProtocolOverview() {
  const achievements = [
    { metric: 'Lines of Code', value: '2,000+', color: 'bg-blue-500' },
    { metric: 'Test Cases', value: '22', color: 'bg-green-500' },
    { metric: 'Test Coverage', value: '100%', color: 'bg-purple-500' },
    { metric: 'Stream Types', value: '2', color: 'bg-orange-500' }
  ]

  const features = [
    {
      title: 'Linear Streaming',
      description: 'Constant payment rate over time',
      icon: '📈',
      example: '1000 tokens per second for 1 hour'
    },
    {
      title: 'Logarithmic Streaming',
      description: 'Dynamic curve with configurable acceleration',
      icon: '📊',
      example: 'Slower start, faster end - perfect for retention'
    },
    {
      title: 'NFT Integration',
      description: 'Each stream as transferable ERC-721 token',
      icon: '🎫',
      example: 'Stream ownership can be transferred'
    },
    {
      title: 'Hook System',
      description: 'Third-party contract integrations',
      icon: '🔗',
      example: 'Automatic lending against future payments'
    }
  ]

  return (
    <div className="space-y-8">
      {/* Achievement Metrics */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-6"
      >
        {achievements.map((item, index) => (
          <motion.div
            key={item.metric}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            className="card text-center"
          >
            <div className={`w-12 h-12 ${item.color} rounded-full mx-auto mb-4 flex items-center justify-center text-white font-bold text-xl`}>
              {item.value.charAt(0)}
            </div>
            <h3 className="font-semibold text-gray-800 mb-1">{item.metric}</h3>
            <p className="text-2xl font-bold text-gray-900">{item.value}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Key Features */}
      <div className="card">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">Key Innovations</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{feature.icon}</span>
                <div>
                  <h3 className="font-semibold text-gray-800 mb-2">{feature.title}</h3>
                  <p className="text-gray-600 mb-2">{feature.description}</p>
                  <p className="text-sm text-blue-600 italic">{feature.example}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Technical Architecture */}
      <div className="card">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">Technical Architecture</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold mb-3 text-gray-700">Smart Contracts</h3>
            <ul className="space-y-2 text-gray-600">
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                StreamingContract.sol - Core protocol
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                LendingHook.sol - Example integration
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                NetworkSLA.sol - Telecom use case
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                IStreamingRecipient.sol - Hook interface
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-3 text-gray-700">Key Capabilities</h3>
            <ul className="space-y-2 text-gray-600">
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                Mathematical precision with logarithmic curves
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                Economic incentives & penalties
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                Automatic rate adjustments
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                1% broker fee sustainability model
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
