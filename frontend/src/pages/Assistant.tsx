import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router-dom'
import { ApiError } from '@/api/client'
import type { ChatReply } from '@/api/types'
import { RecipeImage } from '@/components/RecipeImage'
import { ServerDown } from '@/components/ServerDown'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import {
  ArrowsClockwise,
  ChatCircleDots,
  Info,
  Microphone,
  MicrophoneSlash,
  PaperPlaneRight,
  Sparkle,
  Warning,
  X,
} from '@/components/ui/icons'
import { LogoMark } from '@/components/ui/Logo'
import { useMe } from '@/features/auth/queries'
import { ActionChips, RecipeChips, ReplyText, SpeakButton } from '@/features/assistant/Message'
import { useAssistantStatus, useChat } from '@/features/assistant/queries'
import { useSpeechInput, useSpeechOutput } from '@/features/assistant/speech'
import { plainText } from '@/features/assistant/text'
import { useRecipe } from '@/features/recipes/queries'
import { useLang } from '@/hooks/useLocalized'
import { cn } from '@/lib/cn'
import { pick } from '@/lib/localize'

type Turn = { role: 'user'; content: string } | ({ role: 'assistant'; content: string } & Omit<ChatReply, 'reply'>)

const STORAGE_KEY = 'cravio-chat'
const AUTO_SPEAK_KEY = 'cravio-chat-voice'

function load<T>(key: string, fallback: T): T {
  try {
    const raw = sessionStorage.getItem(key) ?? localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function errorKey(error: unknown): string {
  if (!(error instanceof ApiError)) return 'chat.errors.network'
  if (error.status === 429) return 'chat.errors.tooMany'
  if (error.detail === 'assistant_unavailable') return 'chat.errors.unavailable'
  if (error.detail === 'assistant_busy') return 'chat.errors.busy'
  return 'chat.errors.failed'
}

function Avatar() {
  return <LogoMark className="size-9 shrink-0" />
}

export default function Assistant() {
  const { t } = useTranslation()
  const lang = useLang()
  const me = useMe()
  const status = useAssistantStatus()
  const chat = useChat()
  const [params, setParams] = useSearchParams()
  const recipeSlug = params.get('recipe') ?? undefined
  const recipe = useRecipe(recipeSlug ?? '')
  const [turns, setTurns] = useState<Turn[]>(() => load<Turn[]>(STORAGE_KEY, []))
  const [draft, setDraft] = useState('')
  const [autoSpeak, setAutoSpeak] = useState(() => load(AUTO_SPEAK_KEY, false))
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null)
  const output = useSpeechOutput(lang)
  const endRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Remember the conversation for this tab only, and the voice preference.
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(turns.slice(-30)))
    } catch {
      /* storage unavailable */
    }
  }, [turns])
  useEffect(() => {
    try {
      localStorage.setItem(AUTO_SPEAK_KEY, JSON.stringify(autoSpeak))
    } catch {
      /* storage unavailable */
    }
  }, [autoSpeak])
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [turns.length, chat.isPending])

  const ask = (history: Turn[]) => {
    chat.mutate(
      { messages: history.slice(-12).map(({ role, content }) => ({ role, content })), lang, recipeSlug },
      {
        onSuccess: (reply) => {
          setTurns((prev) => [
            ...prev,
            { role: 'assistant', content: reply.reply, recipes: reply.recipes, actions: reply.actions },
          ])
          if (autoSpeak) {
            output.speak(plainText(reply.reply, reply.recipes, lang))
            setSpeakingIndex(history.length)
          }
        },
      },
    )
  }

  const send = (text: string) => {
    const content = text.trim()
    if (!content || chat.isPending) return
    const history: Turn[] = [...turns, { role: 'user', content }]
    setTurns(history)
    setDraft('')
    ask(history)
  }

  const input = useSpeechInput(lang, (text) => send(text))

  // After an error the question is still the last turn: ask again without adding it twice.
  const retry = () => {
    if (turns.at(-1)?.role === 'user') ask(turns)
  }

  const reset = () => {
    output.cancel()
    chat.reset()
    setTurns([])
    if (recipeSlug) setParams({}, { replace: true })
    inputRef.current?.focus()
  }

  if (me.isError) return <ServerDown onRetry={() => me.refetch()} />

  if (me.isSuccess && !me.data) {
    return (
      <Container className="py-10 md:py-14">
        <section className="mx-auto flex max-w-xl flex-col items-center gap-4 rounded-[28px] bg-brand-deep p-8 text-center text-on-brand md:p-12">
          <span className="grid size-16 place-items-center rounded-full bg-on-brand/10 text-apricot">
            <ChatCircleDots size={30} />
          </span>
          <h1 className="text-3xl font-semibold md:text-4xl">{t('chat.loginTitle')}</h1>
          <p className="text-on-brand-muted">{t('chat.loginBody')}</p>
          <div className="mt-2 flex flex-wrap justify-center gap-3">
            <ButtonLink to="/login?next=%2Fassistant" variant="inverse" size="lg">
              {t('nav.login')}
            </ButtonLink>
            <ButtonLink to="/register?next=%2Fassistant" variant="onDark" size="lg">
              {t('nav.start')}
            </ButtonLink>
          </div>
        </section>
      </Container>
    )
  }

  const unavailable = status.data?.available === false
  const suggestions = t('chat.suggestions', { returnObjects: true }) as string[]
  const name = me.data?.name ?? ''

  return (
    <Container className="flex max-w-4xl flex-col py-6 md:py-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Avatar />
          <div>
            <h1 className="text-2xl font-semibold md:text-3xl">{t('chat.title')}</h1>
            <p className="text-sm text-ink-muted">{t('chat.subtitle')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {output.supported && (
            <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-line px-3 text-sm font-medium">
              <input
                type="checkbox"
                checked={autoSpeak}
                onChange={(e) => {
                  setAutoSpeak(e.target.checked)
                  if (!e.target.checked) output.cancel()
                }}
                className="size-4 accent-[var(--primary)]"
              />
              {t('chat.autoSpeak')}
            </label>
          )}
          {turns.length > 0 && (
            <Button variant="ghost" onClick={reset}>
              <ArrowsClockwise size={18} />
              {t('chat.newChat')}
            </Button>
          )}
        </div>
      </header>

      {unavailable && (
        <p role="status" className="mt-6 flex items-start gap-3 rounded-2xl bg-apricot-soft p-4 text-apricot-ink">
          <Info size={20} className="mt-0.5 shrink-0" />
          {t('chat.errors.unavailable')}
        </p>
      )}

      <section
        aria-label={t('chat.title')}
        aria-live="polite"
        className="mt-6 min-h-[50dvh] flex-1 space-y-5 rounded-[28px] border border-line bg-surface p-4 shadow-sm md:p-6"
      >
        {turns.length === 0 && (
          <div className="flex flex-col items-center gap-5 py-6 text-center md:py-10">
            <span className="grid size-16 place-items-center rounded-full bg-apricot-soft text-apricot-ink">
              <Sparkle size={28} />
            </span>
            <p className="font-display text-2xl font-semibold">{t('chat.welcome', { name })}</p>
            <ul className="flex max-w-2xl flex-wrap justify-center gap-2">
              {suggestions.map((s) => (
                <li key={s}>
                  <button
                    type="button"
                    onClick={() => send(s)}
                    disabled={unavailable || chat.isPending}
                    className="min-h-11 rounded-full border border-line bg-surface px-4 py-2 text-start text-[15px] shadow-sm transition-colors hover:border-primary hover:bg-primary-soft disabled:opacity-50"
                  >
                    {s}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {turns.map((turn, i) =>
          turn.role === 'user' ? (
            <div key={i} className="flex justify-end">
              <p className="max-w-[85%] rounded-[22px] rounded-ee-md bg-primary px-4 py-3 whitespace-pre-wrap text-on-primary">
                <span className="sr-only">{t('chat.you')}: </span>
                {turn.content}
              </p>
            </div>
          ) : (
            <div key={i} className="flex items-start gap-3">
              <Avatar />
              <div className="min-w-0 max-w-[85%] rounded-[22px] rounded-ss-md border border-line bg-surface-raised px-4 py-3 shadow-sm">
                <ReplyText text={turn.content} recipes={turn.recipes} />
                <RecipeChips recipes={turn.recipes} />
                <ActionChips actions={turn.actions} recipes={turn.recipes} />
                {output.supported && (
                  <div className="-mb-1 mt-1 flex justify-end">
                    <SpeakButton
                      speaking={output.speaking && speakingIndex === i}
                      onStop={output.cancel}
                      onSpeak={() => {
                        output.speak(plainText(turn.content, turn.recipes, lang))
                        setSpeakingIndex(i)
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          ),
        )}

        {chat.isPending && (
          <div className="flex items-center gap-3" role="status">
            <Avatar />
            <div className="flex items-center gap-1.5 rounded-[22px] rounded-ss-md border border-line bg-surface-raised px-4 py-4">
              <span className="sr-only">{t('chat.thinking')}</span>
              {[0, 150, 300].map((d) => (
                <span key={d} className="size-2 animate-pulse rounded-full bg-ink-muted" style={{ animationDelay: `${d}ms` }} />
              ))}
            </div>
          </div>
        )}

        {chat.isError && (
          <div role="alert" className="flex flex-wrap items-center gap-3 rounded-2xl bg-danger-soft p-4 text-danger">
            <Warning size={20} className="shrink-0" />
            <span className="flex-1 font-medium">{t(errorKey(chat.error))}</span>
            <Button variant="secondary" size="sm" onClick={retry}>
              {t('chat.retry')}
            </Button>
          </div>
        )}
        <div ref={endRef} />
      </section>

      {/* Composer */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          send(draft)
        }}
        className="sticky bottom-0 mt-4 rounded-[28px] border border-line bg-surface p-2 shadow-md"
      >
        {recipeSlug && recipe.data && (
          <p className="mb-2 flex items-center gap-2 rounded-full bg-apricot-soft py-1 ps-1 pe-2 text-sm font-medium text-apricot-ink">
            <RecipeImage src={recipe.data.image_url} className="size-7 rounded-full" />
            <span className="flex-1 truncate">{t('chat.aboutRecipe', { name: pick(recipe.data.title, lang) })}</span>
            <button
              type="button"
              onClick={() => setParams({}, { replace: true })}
              aria-label={t('planner.close')}
              className="grid size-7 place-items-center rounded-full hover:bg-apricot/30"
            >
              <X size={14} />
            </button>
          </p>
        )}
        <div className="flex items-end gap-2">
          <label htmlFor="chat-input" className="sr-only">
            {t('chat.inputLabel')}
          </label>
          <textarea
            id="chat-input"
            ref={inputRef}
            value={input.listening ? input.interim : draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault()
                send(draft)
              }
            }}
            rows={1}
            maxLength={2000}
            disabled={unavailable}
            placeholder={input.listening ? t('chat.listening') : t('chat.placeholder')}
            className="field-sizing-content max-h-40 min-h-12 flex-1 resize-none rounded-2xl bg-transparent px-4 py-3 text-[16px] placeholder:text-ink-muted focus:outline-none focus-visible:outline-none disabled:opacity-60"
          />
          {input.supported && (
            <button
              type="button"
              onClick={input.listening ? input.stop : input.start}
              disabled={unavailable || chat.isPending}
              aria-label={input.listening ? t('chat.stopListening') : t('chat.listen')}
              aria-pressed={input.listening}
              title={input.listening ? t('chat.stopListening') : t('chat.listen')}
              className={cn(
                'relative grid size-12 shrink-0 place-items-center rounded-full border border-line-strong transition-colors disabled:opacity-40',
                input.listening ? 'border-transparent bg-copper text-on-primary' : 'bg-surface hover:bg-surface-sunken',
              )}
            >
              {input.listening ? <MicrophoneSlash size={22} /> : <Microphone size={22} />}
              {input.listening && <span className="mic-pulse absolute -inset-1 rounded-full border-2 border-apricot" />}
            </button>
          )}
          <button
            type="submit"
            disabled={!draft.trim() || chat.isPending || unavailable}
            aria-label={t('chat.send')}
            className="grid size-12 shrink-0 place-items-center rounded-full bg-primary text-on-primary shadow-sm transition-colors hover:bg-primary-hover disabled:bg-surface-sunken disabled:text-ink-muted disabled:shadow-none"
          >
            <PaperPlaneRight size={22} className="rtl:-scale-x-100" />
          </button>
        </div>
      </form>
      <p className="mt-3 text-center text-sm text-ink-muted">
        {t('chat.disclaimer')}{' '}
        <Link to="/fridge" className="font-medium text-link hover:underline">
          {t('fridge.cta')}
        </Link>
      </p>
    </Container>
  )
}
