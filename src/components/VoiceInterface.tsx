import { useState, useEffect, useRef, useCallback } from 'react'
import { useVoiceRecognition } from '../hooks/useVoiceRecognition'
import { useTextToSpeech } from '../hooks/useTextToSpeech'
import { VoiceCommandParser } from '../utils/VoiceCommandParser'
import { VoiceCommand } from '../types'

export default function VoiceInterface() {
  const [lastCommand, setLastCommand] = useState<VoiceCommand | null>(null)
  const [lastResult, setLastResult] = useState<string>('')
  const [isProcessing, setIsProcessing] = useState(false)

  const {
    isListening,
    transcript,
    startListening,
    stopListening,
    error: recognitionError,
    isSupported: isRecognitionSupported,
  } = useVoiceRecognition(false, 'en-US')

  const { speak, isSpeaking, stop: stopSpeaking } = useTextToSpeech({
    rate: 1.0,
    pitch: 1.0,
    volume: 1.0,
  })

  const transcriptRef = useRef<string>('')

  const formatCommandDescription = useCallback((command: VoiceCommand): string => {
    let description = `Searching for ${command.product}`
    if (command.platform && command.platform !== 'all') {
      description += ` on ${command.platform}`
    }
    if (command.maxPrice) {
      description += ` under $${command.maxPrice}`
    }
    if (command.minPrice) {
      description += ` over $${command.minPrice}`
    }
    return description
  }, [])

  const handleCommand = useCallback(
    async (command: VoiceCommand) => {
      setIsProcessing(true)
      const commandDescription = formatCommandDescription(command)
      setLastResult(commandDescription)

      // TODO: Integrate with backend API to search products
      // For now, simulate a response
      setTimeout(() => {
        const mockResponse = `I found ${command.product} on multiple platforms. The best deal is available on Amazon for $999. Would you like me to open it?`
        speak(mockResponse)
        setLastResult(mockResponse)
        setIsProcessing(false)
      }, 2000)
    },
    [formatCommandDescription, speak]
  )

  // Update transcript ref when transcript changes
  useEffect(() => {
    transcriptRef.current = transcript
  }, [transcript])

  // Handle recognition end - parse command
  useEffect(() => {
    if (!isListening && transcriptRef.current.trim()) {
      const parsedCommand = VoiceCommandParser.parse(transcriptRef.current)

      if (parsedCommand && VoiceCommandParser.validate(parsedCommand)) {
        setLastCommand(parsedCommand)
        handleCommand(parsedCommand)
      } else {
        const errorMsg =
          "I didn't understand that command. Please try again. For example, say 'Find the cheapest iPhone 15'."
        speak(errorMsg)
        setLastResult(errorMsg)
      }

      transcriptRef.current = ''
    }
  }, [isListening, handleCommand, speak])

  // Speak errors aloud
  useEffect(() => {
    if (recognitionError) {
      speak(recognitionError)
    }
  }, [recognitionError, speak])

  const handleMicClick = () => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault()
      handleMicClick()
    }
  }

  const handleReplay = () => {
    if (lastResult) {
      speak(lastResult)
    } else {
      speak("No result to replay. Please give a voice command first.")
    }
  }

  if (!isRecognitionSupported) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-red-50 border-2 border-red-500 rounded-lg p-6 text-center">
          <h2 className="text-xl font-semibold text-red-900 mb-2">
            Speech Recognition Not Supported
          </h2>
          <p className="text-red-700 mb-4">
            Your browser doesn't support speech recognition. Please use Chrome, Edge, or Safari.
          </p>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Enter your command:
            </label>
            <input
              type="text"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Find the cheapest iPhone 15"
              aria-label="Text input for shopping command"
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Blind Bargain</h1>
          <p className="text-gray-600">Voice-activated shopping assistant</p>
        </div>

        {/* Main Voice Interface */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Microphone Button */}
          <div className="flex justify-center mb-6">
            <button
              onClick={handleMicClick}
              onKeyDown={handleKeyDown}
              className={`
                relative w-32 h-32 rounded-full flex items-center justify-center
                transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-primary-light
                ${isListening ? 'bg-red-500 animate-pulse' : 'bg-primary hover:bg-primary-dark'}
              `}
              aria-label={isListening ? 'Stop listening' : 'Start listening'}
              aria-pressed={isListening}
            >
              <svg
                className="w-16 h-16 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                {isListening ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                  />
                )}
              </svg>
              {isListening && (
                <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-75"></span>
              )}
            </button>
          </div>

          {/* Status Text */}
          <div className="text-center mb-6">
            <p
              className={`text-lg font-medium ${
                isListening ? 'text-red-600' : 'text-gray-600'
              }`}
              role="status"
              aria-live="polite"
            >
              {isListening
                ? 'Listening...'
                : isProcessing
                  ? 'Processing your request...'
                  : 'Click the microphone or press Space to start'}
            </p>
          </div>

          {/* Transcript Display */}
          {transcript && (
            <div className="mb-6 p-4 bg-gray-100 rounded-lg">
              <p className="text-sm font-medium text-gray-700 mb-2">You said:</p>
              <p className="text-gray-900" aria-live="polite">
                {transcript}
              </p>
            </div>
          )}

          {/* Last Command Display */}
          {lastCommand && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm font-medium text-blue-900 mb-2">Command:</p>
              <p className="text-blue-800">
                {formatCommandDescription(lastCommand)}
              </p>
            </div>
          )}

          {/* Result Display */}
          {lastResult && (
            <div className="mb-6 p-4 bg-green-50 rounded-lg">
              <p className="text-sm font-medium text-green-900 mb-2">Result:</p>
              <p className="text-green-800" aria-live="polite">
                {lastResult}
              </p>
            </div>
          )}

          {/* Error Display */}
          {recognitionError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm font-medium text-red-900 mb-2">Error:</p>
              <p className="text-red-800" role="alert" aria-live="assertive">
                {recognitionError}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4 justify-center">
            <button
              onClick={handleReplay}
              disabled={!lastResult || isSpeaking}
              className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              aria-label="Replay last result"
            >
              <span className="flex items-center gap-2">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Replay
              </span>
            </button>

            {isSpeaking && (
              <button
                onClick={stopSpeaking}
                className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-400 transition-all"
                aria-label="Stop speaking"
              >
                Stop
              </button>
            )}
          </div>

          {/* Keyboard Shortcut Hint */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Press <kbd className="px-2 py-1 bg-gray-200 rounded">Space</kbd> or{' '}
              <kbd className="px-2 py-1 bg-gray-200 rounded">Enter</kbd> to activate microphone
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

