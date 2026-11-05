export type Lang = 'fr' | 'en' | 'ar'
export type Localized = Partial<Record<Lang, string>>

export type Difficulty = 'easy' | 'medium' | 'hard'
export type Cuisine = 'maghrebi' | 'mediterranean' | 'world'
export type Category = 'main' | 'soup' | 'salad' | 'starter' | 'side' | 'breakfast' | 'dessert' | 'drink'

export type RecipeSummary = {
  slug: string
  title: Localized
  image_url: string
  total_minutes: number | null
  servings: number | null
  difficulty: Difficulty | null
  cuisine: Cuisine
  category: Category
  origin: string | null
  diets: string[]
}

export type Ingredient = {
  name: Localized
  quantity: number | null
  unit: string | null
  measure: string | null
}

export type Step = {
  position: number
  text: Localized
  timer_seconds: number | null
}

export type RecipeDetail = RecipeSummary & {
  description: Localized
  prep_minutes: number | null
  cook_minutes: number | null
  calories: number | null
  source: string
  source_url: string | null
  video_url: string | null
  ingredients: Ingredient[]
  steps: Step[]
  is_favorite: boolean
}

export type Page<T> = { items: T[]; total: number; page: number; page_size: number }

export type User = {
  id: number
  email: string
  name: string
  role: 'user' | 'admin'
  locale: Lang
  email_verified: boolean
  created_at: string
}

export type RecipeFilters = {
  q?: string
  category?: Category
  cuisine?: Cuisine
  diet?: string
  max_minutes?: number
}

export type Slot = 'breakfast' | 'lunch' | 'dinner'

export type PlanItem = {
  id: number
  day: string // YYYY-MM-DD
  slot: Slot
  servings: number
  recipe: RecipeSummary
}

export type Aisle = 'produce' | 'meat' | 'dairy' | 'bakery' | 'pantry' | 'spices' | 'drinks' | 'other'

export type ShoppingItem = {
  id: number
  name: Localized & { custom?: string }
  quantity: number | null
  unit: string | null
  aisle: Aisle
  checked: boolean
  source: 'manual' | 'plan'
}

export type ChatRole = 'user' | 'assistant'

export type AgentAction =
  | { type: 'planner_add'; slug: string; day: string; slot: Slot; servings: number }
  | { type: 'shopping_add'; items: string[] }
  | { type: 'shopping_generate'; start: string; count: number }

export type ChatReply = {
  reply: string
  recipes: RecipeSummary[]
  actions: AgentAction[]
}

export type PantryMatch = {
  recipe: RecipeSummary
  have: string[]
  missing: string[]
}
