import { useState } from 'react'
import LandingPage from './components/LandingPage'
import VoiceInterface from './components/VoiceInterface'
import { ProductExtractor } from './components/ProductExtractor'
import { Dashboard } from './components/Dashboard'
import './App.css'

function App() {
  const [highContrast, setHighContrast] = useState(false)
  const [activeTab, setActiveTab] = useState<'voice' | 'extractor' | 'dashboard'>('voice')

  const toggleHighContrast = () => {
    setHighContrast(!highContrast)
    document.documentElement.classList.toggle('high-contrast', !highContrast)
  }

  return (
    <div className={`app-container ${highContrast ? 'high-contrast' : ''}`}>
      <LandingPage onToggleHighContrast={toggleHighContrast} highContrast={highContrast} />

      <nav className="main-nav" aria-label="Main navigation">
        <button
          className={activeTab === 'voice' ? 'active' : ''}
          onClick={() => setActiveTab('voice')}
          aria-label="Voice Interface"
        >
          🎤 Voice
        </button>
        <button
          className={activeTab === 'extractor' ? 'active' : ''}
          onClick={() => setActiveTab('extractor')}
          aria-label="Product Extractor"
        >
          📸 Extractor
        </button>
        <button
          className={activeTab === 'dashboard' ? 'active' : ''}
          onClick={() => setActiveTab('dashboard')}
          aria-label="Usage Dashboard"
        >
          📊 Stats
        </button>
      </nav>

      <main className="content-area">
        {activeTab === 'voice' && <VoiceInterface />}
        {activeTab === 'extractor' && <ProductExtractor />}
        {activeTab === 'dashboard' && <Dashboard />}
      </main>
    </div>
  )
}

export default App

