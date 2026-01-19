import { useState } from 'react'
import LandingPage from './components/LandingPage'
import VoiceInterface from './components/VoiceInterface'
import './App.css'

function App() {
  const [highContrast, setHighContrast] = useState(false)

  const toggleHighContrast = () => {
    setHighContrast(!highContrast)
    document.documentElement.classList.toggle('high-contrast', !highContrast)
  }

  return (
    <div className={highContrast ? 'high-contrast' : ''}>
      <LandingPage onToggleHighContrast={toggleHighContrast} highContrast={highContrast} />
      <VoiceInterface />
    </div>
  )
}

export default App

