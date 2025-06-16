// components/Header.tsx
import { motion } from 'framer-motion'

export default function Header() {
  return (
    <header className="bg-white shadow-lg border-b border-gray-200">
      <div className="container mx-auto px-4 py-6">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1 className="text-4xl font-bold gradient-text mb-2">
            Advanced Streaming Protocol
          </h1>
          <p className="text-gray-600 text-lg">
            Continuous Payment Streams with Dynamic Curves & Smart Integrations
          </p>
          <div className="flex justify-center gap-4 mt-4 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              ✅ Linear & Logarithmic Curves
            </span>
            <span className="flex items-center gap-1">
              ✅ NFT Integration
            </span>
            <span className="flex items-center gap-1">
              ✅ Hook System
            </span>
            <span className="flex items-center gap-1">
              ✅ SLA Management
            </span>
          </div>
        </motion.div>
      </div>
    </header>
  )
}
