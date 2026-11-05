import { AssistantShowcase } from '@/components/landing/AssistantShowcase'
import { Features } from '@/components/landing/Features'
import { FinalCta } from '@/components/landing/FinalCta'
import { Hero } from '@/components/landing/Hero'
import { MaghrebBanner } from '@/components/landing/MaghrebBanner'
import { RecipeCarousel } from '@/components/landing/RecipeCarousel'

export default function Landing() {
  return (
    <>
      <Hero />
      <Features />
      <RecipeCarousel />
      <MaghrebBanner />
      <AssistantShowcase />
      <FinalCta />
    </>
  )
}
