import { RecipeImage } from '@/components/RecipeImage'
import { Container } from '@/components/ui/Container'

export function AuthLayout({ title, body, children }: { title: string; body: string; children: React.ReactNode }) {
  return (
    <Container className="grid min-h-[calc(100dvh-4.5rem)] items-center gap-16 py-12 lg:grid-cols-2">
      <div className="mx-auto w-full max-w-md lg:mx-0 lg:justify-self-center">
        <h1 className="text-4xl font-semibold md:text-5xl">{title}</h1>
        <p className="mt-3 text-lg text-ink-muted">{body}</p>
        <div className="mt-8">{children}</div>
      </div>
      <div className="relative hidden pe-6 pb-6 lg:block">
        <div aria-hidden="true" className="arch absolute inset-0 start-6 top-6 bg-apricot-soft" />
        <div className="arch relative shadow-md">
          <RecipeImage src="/img/ratatouille.webp" className="aspect-[4/5] max-h-[76dvh] w-full" />
        </div>
      </div>
    </Container>
  )
}
