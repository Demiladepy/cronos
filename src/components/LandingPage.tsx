import { useState } from 'react'

interface LandingPageProps {
  onToggleHighContrast: () => void
  highContrast: boolean
}

export default function LandingPage({ onToggleHighContrast, highContrast }: LandingPageProps) {
  const [isStarted, setIsStarted] = useState(false)

  const handleStartShopping = () => {
    setIsStarted(true)
  }

  if (isStarted) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-light to-primary-dark flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-2xl p-8 text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
          Blind Bargain
        </h1>
        <p className="text-lg md:text-xl text-gray-700 mb-8">
          Voice-activated AI shopping agent for finding the best deals
        </p>

        <button
          onClick={handleStartShopping}
          className="w-full md:w-auto px-8 py-4 bg-primary text-white text-xl font-semibold rounded-lg hover:bg-primary-dark focus:outline-none focus:ring-4 focus:ring-primary-light transition-all min-h-[80px] mb-6"
          aria-label="Start shopping with voice commands"
        >
          Start Shopping
        </button>

        <div className="mt-8 flex justify-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={highContrast}
              onChange={onToggleHighContrast}
              className="w-5 h-5 text-primary focus:ring-2 focus:ring-primary"
              aria-label="Toggle high contrast mode"
            />
            <span className="text-gray-700">High Contrast Mode</span>
          </label>
        </div>

        <div className="mt-8 text-left">
          <h2 className="text-xl font-semibold mb-4">How it works:</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            <li>Speak your shopping request</li>
            <li>AI searches across multiple platforms</li>
            <li>Get the best deals with automatic coupon application</li>
            <li>Results are spoken back to you</li>
          </ul>
        </div>
      </div>
    </div>
  )
}