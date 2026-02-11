import { useState, useEffect, useRef, useCallback } from 'react'

interface UseVoiceRecognitionReturn {
  isListening: boolean
  transcript: string
  startListening: () => void
  stopListening: () => void
  error: string | null
  isSupported: boolean
}

export function useVoiceRecognition(
  continuous: boolean = false,
  lang: string = 'en-US'
): UseVoiceRecognitionReturn {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSupported, setIsSupported] = useState(false)

  // 1. FIXED: Renamed to match usage below
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // 2. FIXED: Cast window to 'any' to avoid "Property does not exist"
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

    if (!SpeechRecognition) {
      setIsSupported(false)
      setError('Speech recognition is not supported in your browser')
      return
    }

    setIsSupported(true)
    const recognition = new SpeechRecognition()
    recognition.continuous = continuous
    recognition.interimResults = true
    recognition.lang = lang

    recognition.onstart = () => {
      setIsListening(true)
      setError(null)
    }

    // 3. FIXED: Use 'any' type for event
    recognition.onresult = (event: any) => {
      let interimTranscript = ''
      let finalTranscript = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' '
        } else {
          interimTranscript += transcript
        }
      }

      setTranscript((prev) => {
        const newTranscript = prev + finalTranscript
        return newTranscript.trim()
      })
    }

    // 4. FIXED: Use 'any' type for error event
    recognition.onerror = (event: any) => {
      let errorMessage = 'An error occurred with speech recognition'

      // Handle common errors
      if (event.error === 'no-speech') {
        errorMessage = 'No speech detected.'
        // Don't stop listening on no-speech if continuous
        if (!continuous) setIsListening(false)
      } else if (event.error === 'not-allowed') {
        errorMessage = 'Microphone permission denied.'
        setIsListening(false)
      } else {
        errorMessage = `Error: ${event.error}`
        setIsListening(false)
      }

      if (event.error !== 'no-speech') {
          setError(errorMessage)
      }
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    // 5. FIXED: Correctly assigning to the ref we created
    recognitionRef.current = recognition

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [continuous, lang])

  const startListening = useCallback(() => {
    if (!recognitionRef.current) {
      setError('Speech recognition is not available')
      return
    }

    try {
      // Clear previous transcript on new start
      setTranscript('')
      setError(null)
      recognitionRef.current.start()
    } catch (err) {
      // Sometimes it throws if already started, just ignore
      console.warn('Speech recognition already started')
    }
  }, [])

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
  }, [])

  return {
    isListening,
    transcript,
    startListening,
    stopListening,
    error,
    isSupported,
  }
}