import { useCallback, useEffect, useRef, useState } from 'react'
import type { Lang } from '@/api/types'

// The Web Speech API is not in TypeScript's DOM types yet: describe the small part we use.
type Recognition = {
  lang: string
  interimResults: boolean
  continuous: boolean
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null
  onend: (() => void) | null
  onerror: ((e: { error: string }) => void) | null
}
type RecognitionCtor = new () => Recognition

const SPEECH_LANG: Record<Lang, string> = { fr: 'fr-FR', en: 'en-US', ar: 'ar-DZ' }

function recognitionCtor(): RecognitionCtor | undefined {
  if (typeof window === 'undefined') return undefined
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition
}

/** Voice input in the user's language. `supported` is false on browsers without speech recognition. */
export function useSpeechInput(lang: Lang, onFinal: (text: string) => void) {
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')
  const ref = useRef<Recognition | null>(null)
  const onFinalRef = useRef(onFinal)
  useEffect(() => {
    onFinalRef.current = onFinal
  }, [onFinal])
  const Ctor = recognitionCtor()

  const stop = useCallback(() => ref.current?.stop(), [])

  const start = useCallback(() => {
    if (!Ctor) return
    ref.current?.abort()
    const rec = new Ctor()
    rec.lang = SPEECH_LANG[lang]
    rec.interimResults = true
    rec.continuous = false
    rec.onresult = (e) => {
      let text = ''
      let final = false
      for (let i = 0; i < e.results.length; i++) {
        text += e.results[i][0].transcript
        final ||= e.results[i].isFinal
      }
      setInterim(text)
      if (final && text.trim()) onFinalRef.current(text.trim())
    }
    rec.onend = () => {
      setListening(false)
      setInterim('')
    }
    rec.onerror = () => setListening(false)
    ref.current = rec
    rec.start()
    setListening(true)
  }, [Ctor, lang])

  useEffect(() => () => ref.current?.abort(), [])

  return { supported: Boolean(Ctor), listening, interim, start, stop }
}

/** Reads text aloud with the browser's built-in voices. */
export function useSpeechOutput(lang: Lang) {
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window
  const [speaking, setSpeaking] = useState(false)

  const cancel = useCallback(() => {
    if (!supported) return
    window.speechSynthesis.cancel()
    setSpeaking(false)
  }, [supported])

  const speak = useCallback(
    (text: string) => {
      if (!supported || !text) return
      window.speechSynthesis.cancel()
      const u = new SpeechSynthesisUtterance(text)
      u.lang = SPEECH_LANG[lang]
      const voice = window.speechSynthesis.getVoices().find((v) => v.lang.startsWith(lang))
      if (voice) u.voice = voice
      u.onend = () => setSpeaking(false)
      u.onerror = () => setSpeaking(false)
      setSpeaking(true)
      window.speechSynthesis.speak(u)
    },
    [supported, lang],
  )

  useEffect(() => cancel, [cancel])

  return { supported, speaking, speak, cancel }
}
