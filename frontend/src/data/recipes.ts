import type { RecipeSummary } from '@/api/types'

type Seed = Pick<RecipeSummary, 'slug' | 'title' | 'difficulty' | 'cuisine'> & { image: string; minutes: number }

// Shown on the landing page when the API cannot be reached (same recipes as the backend seed).
const seeds: Seed[] = [
  { slug: 'chorba-frik', title: { fr: 'Chorba frik', en: 'Chorba frik', ar: 'شوربة فريك' }, image: '/img/chorba-frik.webp', minutes: 35, difficulty: 'easy', cuisine: 'maghrebi' },
  { slug: 'chicken-skewers', title: { fr: 'Brochettes de poulet au curcuma', en: 'Turmeric chicken skewers', ar: 'مشاوي دجاج بالكركم' }, image: '/img/chicken-skewers.webp', minutes: 40, difficulty: 'easy', cuisine: 'maghrebi' },
  { slug: 'ratatouille', title: { fr: 'Ratatouille en spirale', en: 'Spiral ratatouille', ar: 'راتاتوي حلزوني' }, image: '/img/ratatouille.webp', minutes: 70, difficulty: 'medium', cuisine: 'mediterranean' },
  { slug: 'honey-garlic-chicken', title: { fr: 'Poulet miel et ail', en: 'Honey garlic chicken', ar: 'دجاج بالعسل والثوم' }, image: '/img/honey-garlic-chicken.webp', minutes: 30, difficulty: 'easy', cuisine: 'world' },
  { slug: 'mushroom-veloute', title: { fr: 'Velouté de champignons', en: 'Creamy mushroom soup', ar: 'حساء الفطر بالكريمة' }, image: '/img/mushroom-veloute.webp', minutes: 25, difficulty: 'easy', cuisine: 'mediterranean' },
  { slug: 'lasagna', title: { fr: 'Lasagnes maison', en: 'Homemade lasagna', ar: 'لازانيا منزلية' }, image: '/img/lasagna.webp', minutes: 90, difficulty: 'medium', cuisine: 'mediterranean' },
  { slug: 'pumpkin-soup', title: { fr: 'Soupe de potiron épicée', en: 'Spiced pumpkin soup', ar: 'شوربة القرع بالتوابل' }, image: '/img/pumpkin-soup.webp', minutes: 45, difficulty: 'easy', cuisine: 'world' },
  { slug: 'tiramisu', title: { fr: 'Tiramisu classique', en: 'Classic tiramisu', ar: 'تيراميسو كلاسيكي' }, image: '/img/tiramisu.webp', minutes: 30, difficulty: 'medium', cuisine: 'mediterranean' },
  { slug: 'steak-chimichurri', title: { fr: 'Côte de bœuf, sauce chimichurri', en: 'Rib steak with chimichurri', ar: 'ضلع لحم بصلصة الشيميشوري' }, image: '/img/steak-chimichurri.webp', minutes: 50, difficulty: 'hard', cuisine: 'world' },
  { slug: 'banana-loaf', title: { fr: 'Cake banane et noix', en: 'Banana walnut loaf', ar: 'كيك الموز والجوز' }, image: '/img/banana-loaf.webp', minutes: 65, difficulty: 'easy', cuisine: 'world' },
  { slug: 'garden-salad', title: { fr: 'Salade du jardin', en: 'Garden salad', ar: 'سلطة الحديقة' }, image: '/img/garden-salad.webp', minutes: 15, difficulty: 'easy', cuisine: 'mediterranean' },
  { slug: 'citrus-mocktail', title: { fr: 'Citronnade orange et romarin', en: 'Orange rosemary cooler', ar: 'عصير البرتقال بإكليل الجبل' }, image: '/img/citrus-mocktail.webp', minutes: 10, difficulty: 'easy', cuisine: 'world' },
]

export const fallbackRecipes: RecipeSummary[] = seeds.map(({ image, minutes, ...seed }) => ({
  ...seed,
  image_url: image,
  total_minutes: minutes,
  servings: null,
  category: 'main',
  origin: null,
  diets: [],
}))
