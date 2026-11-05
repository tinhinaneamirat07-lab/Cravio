import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { WifiSlash } from '@/components/ui/icons'
import { StateMessage } from '@/components/ui/StateMessage'

/** Shown when the API cannot be reached, instead of an endless loading skeleton. */
export function ServerDown({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation()
  return (
    <Container className="py-16">
      <StateMessage
        tone="danger"
        icon={<WifiSlash size={24} />}
        title={t('explore.errorTitle')}
        body={t('explore.errorBody')}
        action={
          <Button variant="secondary" onClick={onRetry}>
            {t('explore.retry')}
          </Button>
        }
      />
    </Container>
  )
}
