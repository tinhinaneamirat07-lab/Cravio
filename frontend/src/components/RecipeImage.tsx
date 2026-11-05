import { useState } from 'react'
import { CookingPot } from '@/components/ui/icons'
import { cn } from '@/lib/cn'

/** Recipe photo with a calm placeholder when the image is missing or fails to load. */
export function RecipeImage({
  src,
  alt = '',
  className,
  priority = false,
}: {
  src: string
  alt?: string
  className?: string
  priority?: boolean
}) {
  const [failed, setFailed] = useState(!src)
  if (failed) {
    return (
      <div className={cn('grid place-items-center bg-surface-sunken text-ink-muted', className)} role={alt ? 'img' : undefined} aria-label={alt || undefined}>
        <CookingPot size={36} weight="duotone" />
      </div>
    )
  }
  return (
    <img
      src={src}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      onError={() => setFailed(true)}
      className={cn('object-cover', className)}
    />
  )
}
