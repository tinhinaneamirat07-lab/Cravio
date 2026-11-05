import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import type { RecipeDetail, Slot } from '@/api/types'
import { Button } from '@/components/ui/Button'
import { buttonClass } from '@/components/ui/button-styles'
import { Chip } from '@/components/ui/Chip'
import { Dialog } from '@/components/ui/Dialog'
import { CalendarBlank, CheckCircle } from '@/components/ui/icons'
import { useMe } from '@/features/auth/queries'
import { useAddToPlan } from '@/features/planner/queries'
import { useLang } from '@/hooks/useLocalized'
import { addDays, formatDay, toISODate } from '@/lib/dates'

const SLOTS: Slot[] = ['breakfast', 'lunch', 'dinner']

export function AddToPlanner({ recipe }: { recipe: RecipeDetail }) {
  const { t } = useTranslation()
  const lang = useLang()
  const { data: user } = useMe()
  const navigate = useNavigate()
  const location = useLocation()
  const add = useAddToPlan()
  const [open, setOpen] = useState(false)
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(new Date(), i)), [])
  const [day, setDay] = useState(toISODate(days[0]))
  const [slot, setSlot] = useState<Slot>(recipe.category === 'breakfast' ? 'breakfast' : 'dinner')

  const openDialog = () => {
    if (!user) {
      navigate(`/login?next=${encodeURIComponent(location.pathname)}`)
      return
    }
    add.reset()
    setOpen(true)
  }

  return (
    <>
      <button type="button" onClick={openDialog} className={buttonClass({ size: 'lg' })}>
        <CalendarBlank size={20} />
        {t('planner.addToPlanner')}
      </button>

      <Dialog open={open} onClose={() => setOpen(false)} title={t('planner.addToPlanner')}>
        {add.isSuccess ? (
          <div className="flex flex-col items-start gap-4" role="status">
            <p className="flex items-center gap-2 font-semibold text-moss-ink">
              <CheckCircle size={20} weight="fill" />
              {t('planner.added')}
            </p>
            <Link to="/planner" className={buttonClass()}>
              {t('planner.seePlanner')}
            </Link>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              add.mutate({ day, slot, recipe_slug: recipe.slug })
            }}
            className="space-y-6"
          >
            <fieldset>
              <legend className="mb-3 text-[15px] font-semibold">{t('planner.chooseDay')}</legend>
              <div className="flex flex-wrap gap-2">
                {days.map((d, i) => {
                  const iso = toISODate(d)
                  return (
                    <Chip key={iso} active={day === iso} onClick={() => setDay(iso)} className="capitalize">
                      {i === 0 ? t('planner.today') : formatDay(d, lang, { weekday: 'short', day: 'numeric' })}
                    </Chip>
                  )
                })}
              </div>
            </fieldset>
            <fieldset>
              <legend className="mb-3 text-[15px] font-semibold">{t('planner.chooseSlot')}</legend>
              <div className="flex flex-wrap gap-2">
                {SLOTS.map((s) => (
                  <Chip key={s} active={slot === s} onClick={() => setSlot(s)}>
                    {t(`slots.${s}`)}
                  </Chip>
                ))}
              </div>
            </fieldset>
            {add.isError && (
              <p role="alert" className="text-sm font-medium text-danger">
                {t('planner.full')}
              </p>
            )}
            <Button type="submit" size="lg" className="w-full" disabled={add.isPending}>
              {t('planner.confirm')}
            </Button>
          </form>
        )}
      </Dialog>
    </>
  )
}
