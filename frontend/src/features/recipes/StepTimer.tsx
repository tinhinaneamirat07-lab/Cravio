import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pause, Play, Timer, X } from '@/components/ui/icons'
import { cn } from '@/lib/cn'

function clock(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  const mm = String(m).padStart(h ? 2 : 1, '0')
  const ss = String(s).padStart(2, '0')
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

/** A small countdown attached to a recipe step. Uses wall-clock time so it stays right in background tabs. */
export function StepTimer({ seconds }: { seconds: number }) {
  const { t } = useTranslation()
  const [remaining, setRemaining] = useState(seconds)
  const [running, setRunning] = useState(false)
  const [started, setStarted] = useState(false)
  const endsAt = useRef(0)

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      const left = Math.max(0, Math.round((endsAt.current - Date.now()) / 1000))
      setRemaining(left)
      if (left === 0) {
        setRunning(false)
        navigator.vibrate?.([200, 100, 200])
      }
    }, 250)
    return () => clearInterval(id)
  }, [running])

  const start = () => {
    endsAt.current = Date.now() + remaining * 1000
    setStarted(true)
    setRunning(true)
  }
  const reset = () => {
    setRunning(false)
    setStarted(false)
    setRemaining(seconds)
  }

  if (!started) {
    return (
      <button
        type="button"
        onClick={start}
        className="mt-3 inline-flex h-10 items-center gap-2 rounded-full border border-line-strong bg-surface px-4 text-sm font-semibold text-ink transition-colors hover:bg-surface-sunken active:scale-[0.98]"
      >
        <Timer size={18} className="text-apricot-ink" />
        {t('recipe.timer', { time: clock(seconds) })}
      </button>
    )
  }

  const done = remaining === 0
  return (
    <div
      className={cn(
        'mt-3 inline-flex h-11 items-center gap-1 rounded-full border ps-4 pe-1 text-sm font-semibold',
        done ? 'border-moss bg-moss-soft text-moss-ink' : 'border-apricot-ink bg-apricot-soft text-apricot-ink',
      )}
    >
      <span aria-live="polite" className="me-2 tabular-nums" dir="ltr">
        {done ? t('recipe.timerDone') : clock(remaining)}
      </span>
      {!done && (
        <button
          type="button"
          onClick={() => (running ? setRunning(false) : start())}
          aria-label={running ? t('recipe.pause') : t('recipe.resume')}
          className="grid size-9 place-items-center rounded-full hover:bg-ink/10"
        >
          {running ? <Pause size={16} weight="fill" /> : <Play size={16} weight="fill" />}
        </button>
      )}
      <button
        type="button"
        onClick={reset}
        aria-label={t('recipe.reset')}
        className="grid size-9 place-items-center rounded-full hover:bg-ink/10"
      >
        <X size={16} weight="bold" />
      </button>
    </div>
  )
}
