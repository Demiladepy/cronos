import { useState } from 'react'
import Header from './components/Head'
import VoiceInterface from './components/VoiceInterface'
import ProductExtractor from './components/ProductExtractor'
import Dashboard from './components/Dashboard'
import ResultItems from './components/ResultItems'
import { ResultItem } from './types'
import './App.css'

function App() {
  const [result, setResult] = useState<ResultItem[] | null>(null)
  const [highContrast, setHighContrast] = useState(false)
  const [activeTab, setActiveTab] = useState<'voice' | 'extractor' | 'dashboard'>('voice')

  const toggleHighContrast = () => {
    setHighContrast(!highContrast)
  }

  return (
    <div className={`app-container ${highContrast ? 'high-contrast' : ''}`}>
      {/* Header with contrast toggle */}
      <Header onToggleHighContrast={toggleHighContrast} highContrast={highContrast} />

      {/* Navigation tabs */}
      <nav className="main-nav" aria-label="Main navigation">
        <button
          className={`nav-button ${activeTab === 'voice' ? 'active' : ''}`}
          onClick={() => setActiveTab('voice')}
          aria-label="Voice Interface"
        >
          Voice
        </button>
        <button
          className={`nav-button ${activeTab === 'extractor' ? 'active' : ''}`}
          onClick={() => setActiveTab('extractor')}
          aria-label="Product Extractor"
        >
          Extractor
        </button>
        <button
          className={`nav-button ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
          aria-label="Usage Dashboard"
        >
          Stats
        </button>
      </nav>

      {/* Main content area */}
      <main className="content-area">
        {activeTab === 'voice' && <VoiceInterface />}
        
        {activeTab === 'extractor' && (
          <div className="extractor-section">
            {/* Use setResult here to clear the warning and actually save data */}
            <ProductExtractor onDataExtracted={setResult} /> 
            {result && <ResultItems results={result} />}
          </div>
        )}
        
        {activeTab === 'dashboard' && <Dashboard />}
      </main>
    </div>
  )
}

export default App