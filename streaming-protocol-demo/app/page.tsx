// app/page.tsx
'use client'

import { useState } from 'react'
import Header from '@/components/Header'
import StreamVisualization from '@/components/StreamVisualization'
import RealStreamManager from '@/components/RealStreamManager'
import HookDemo from '@/components/HookDemo'
import SLADemo from '@/components/SLADemo'
import ProtocolOverview from '@/components/ProtocolOverview'

export default function Home() {
  const [activeTab, setActiveTab] = useState('overview')

  const tabs = [
    { id: 'overview', label: 'Protocol Overview', icon: '🏛️' },
    { id: 'streams', label: 'Stream Visualization', icon: '📊' },
    { id: 'real-manager', label: 'Real Stream Manager', icon: '🚀' },
    { id: 'hooks', label: 'Hook Integrations', icon: '🔗' },
    { id: 'sla', label: 'Network SLA', icon: '🌐' }
  ]

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return <ProtocolOverview />
      case 'streams':
        return <StreamVisualization />
      case 'real-manager':
        return <RealStreamManager />
      case 'hooks':
        return <HookDemo />
      case 'sla':
        return <SLADemo />
      default:
        return <ProtocolOverview />
    }
  }

  return (
    <div className="min-h-screen">
      <Header />
      
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-wrap gap-4 mb-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-white text-gray-700 hover:bg-blue-50 shadow-md'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {renderContent()}
      </div>
    </div>
  )
}
