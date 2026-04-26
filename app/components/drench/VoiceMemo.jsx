'use client'
import { useState, useRef, useEffect } from 'react'

export default function VoiceMemo({ onTranscript, placeholder = 'Tap mic to speak...' }) {
  const [supported, setSupported] = useState(false)
  const [listening, setListening] = useState(false)
  const recognitionRef = useRef(null)

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    setSupported(!!SpeechRecognition)
  }, [])

  function toggleListening() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) return

    if (listening) {
      recognitionRef.current?.stop()
      setListening(false)
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'
    recognitionRef.current = recognition

    let finalText = ''

    recognition.onresult = (event) => {
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalText += transcript + ' '
        } else {
          interim = transcript
        }
      }
      onTranscript?.(finalText + interim)
    }

    recognition.onerror = () => setListening(false)
    recognition.onend = () => setListening(false)

    recognition.start()
    setListening(true)
  }

  if (!supported) return null

  return (
    <button
      type="button"
      onClick={toggleListening}
      title={listening ? 'Stop recording' : 'Voice input'}
      className={`flex items-center justify-center w-10 h-10 rounded-full transition-all ${
        listening
          ? 'bg-dl-red animate-pulse-fast text-white shadow-lg shadow-red-500/50'
          : 'bg-dl-red text-white hover:bg-dl-red-dark'
      }`}
    >
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 1a4 4 0 014 4v7a4 4 0 01-8 0V5a4 4 0 014-4zm7 11a1 1 0 012 0 9 9 0 01-8 9v2h3a1 1 0 010 2H8a1 1 0 010-2h3v-2A9 9 0 013 12a1 1 0 012 0 7 7 0 0014 0z" />
      </svg>
    </button>
  )
}
