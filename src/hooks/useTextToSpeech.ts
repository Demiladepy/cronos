import { useState, useEffect, useRef, useCallback } from 'react'

interface UseTextToSpeechOptions {
  rate?: number
  pitch?: number
  volume?: number
  voice?: SpeechSynthesisVoice | null
}

interface UseTextToSpeechReturn {
  speak: (text: string, options?: UseTextToSpeechOptions) => void
  isSpeaking: boolean
  stop: () => void
  voices: SpeechSynthesisVoice[]
  selectedVoice: SpeechSynthesisVoice | null
  setSelectedVoice: (voice: SpeechSynthesisVoice | null) => void
}

export function useTextToSpeech(
  defaultOptions: UseTextToSpeechOptions = {}
): UseTextToSpeechReturn {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null)

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const queueRef = useRef<string[]>([])

  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices()
      setVoices(availableVoices)

      // Prefer Google or Microsoft voices for better quality
      const preferredVoice =
        availableVoices.find(
          (voice) =>
            voice.name.includes('Google') ||
            voice.name.includes('Microsoft') ||
            voice.name.includes('Natural')
        ) || availableVoices.find((voice) => voice.lang.startsWith('en'))

      if (preferredVoice && !selectedVoice) {
        setSelectedVoice(preferredVoice)
      }
    }

    loadVoices()
    window.speechSynthesis.onvoiceschanged = loadVoices

    return () => {
      window.speechSynthesis.onvoiceschanged = null
    }
  }, [selectedVoice])

  const speak = useCallback(
    (text: string, options: UseTextToSpeechOptions = {}) => {
      if (!text.trim()) return

      const utterance = new SpeechSynthesisUtterance(text)
      const finalOptions = { ...defaultOptions, ...options }

      utterance.rate = finalOptions.rate ?? 1.0
      utterance.pitch = finalOptions.pitch ?? 1.0
      utterance.volume = finalOptions.volume ?? 1.0
      utterance.voice = finalOptions.voice ?? selectedVoice

      utterance.onstart = () => {
        setIsSpeaking(true)
      }

      utterance.onend = () => {
        setIsSpeaking(false)
        utteranceRef.current = null

        // Process queue if there are pending messages
        if (queueRef.current.length > 0) {
          const nextText = queueRef.current.shift()
          if (nextText) {
            speak(nextText, options)
          }
        }
      }

      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event)
        setIsSpeaking(false)
        utteranceRef.current = null
      }

      // Stop current speech if speaking
      if (isSpeaking) {
        window.speechSynthesis.cancel()
        queueRef.current.push(text)
      } else {
        utteranceRef.current = utterance
        window.speechSynthesis.speak(utterance)
      }
    },
    [defaultOptions, selectedVoice, isSpeaking]
  )

  const stop = useCallback(() => {
    window.speechSynthesis.cancel()
    queueRef.current = []
    setIsSpeaking(false)
    utteranceRef.current = null
  }, [])

  return {
    speak,
    isSpeaking,
    stop,
    voices,
    selectedVoice,
    setSelectedVoice,
  }
}

