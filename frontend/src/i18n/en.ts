import type { Messages } from './fr'

const en: Messages = {
  nav: {
    home: 'Home',
    cook: 'Cook',
    go: 'Go out',
    account: 'Account',
    recipes: 'Recipes',
    fridge: 'Fridge',
    favorites: 'Favorites',
    main: 'Main navigation',
    explore: 'Explore',
    planner: 'Planner',
    shopping: 'Shopping',
    assistant: 'Assistant',
    login: 'Log in',
    start: 'Get started',
    menu: 'Menu',
    theme: 'Toggle theme',
    language: 'Language',
  },
  go: {
    eyebrow: 'Coming soon',
    title: 'Going out is coming very soon',
    body: 'Cafés, restaurants, beaches and parks around you, on a map, with the weather and reviews. This part arrives in the next step.',
    cta: 'Meanwhile, shall we cook?',
  },
  hero: {
    eyebrow: 'Your cooking assistant, in 3 languages',
    trust: { free: 'Free, no card needed', recipes: '300+ recipes' },
    title: 'Your week of meals, planned in two minutes.',
    highlight: 'two minutes',
    subtitle:
      'Tell Cravio what’s in your fridge. It builds your menu and shopping list, then guides you by voice.',
    secondary: 'Browse recipes',
    imageAlt: 'A bowl of chorba frik served with bourek',
    card: {
      day: 'Tuesday, dinner',
      recipe: 'Chorba frik',
      meta: '35 min, serves 4',
      status: 'Added to planner',
    },
  },
  features: {
    eyebrow: 'How it helps',
    title: 'From fridge to plate, without the stress.',
    planner: {
      title: 'A planned week',
      body: 'Drop recipes into your week, or let Cravio build a balanced menu that fits your budget.',
      imageAlt: 'Spiral ratatouille in a casserole dish',
    },
    pantry: {
      title: 'Cook with what you have',
      body: 'Recipes are ranked by what you’re missing. Less waste, fewer trips to the store.',
      imageAlt: 'Fresh garden salad',
    },
    shopping: {
      title: 'Automatic shopping list',
      body: 'The whole week’s quantities, combined and sorted by aisle.',
      items: [
        { name: 'Freekeh', qty: '250 g' },
        { name: 'Tomatoes', qty: '6' },
        { name: 'Coriander', qty: '1 bunch' },
        { name: 'Chicken', qty: '1 kg' },
      ],
    },
    voice: {
      title: 'Hands covered in flour? Just talk.',
      body: 'Ask for the next step, a timer or a substitute without touching the screen.',
    },
    languages: {
      title: 'Built in three languages',
      body: 'The whole interface switches to Arabic, right to left.',
    },
  },
  assistant: {
    eyebrow: 'Voice assistant',
    step: 'Step 1 of 5',
    title: 'An assistant that actually knows cooking.',
    body: 'Before answering, it searches Cravio’s recipe library. You speak, it replies in your language.',
    listening: 'Cravio is listening',
    name: 'Cravio',
    chat: [
      { from: 'user', text: 'I have freekeh and chicken. What should I cook tonight?' },
      {
        from: 'bot',
        text: 'A chorba frik: 35 minutes for 4 people. Do you have coriander and tomato paste?',
      },
      { from: 'user', text: 'Yes, let’s start.' },
      {
        from: 'bot',
        text: 'Cut the chicken into small pieces and brown it with the onion for 5 minutes. Want me to start a timer?',
      },
    ],
    imageAlt: 'Steak grilling over an open fire',
  },
  recipes: {
    eyebrow: 'This week on Cravio',
    title: 'Trending recipes',
    all: 'See all',
    minutes: '{{count}} min',
    difficulty: { easy: 'Easy', medium: 'Medium', hard: 'Hard' },
    previous: 'Previous recipes',
    next: 'Next recipes',
  },
  maghreb: {
    eyebrow: 'Maghrebi kitchen',
    highlight: 'front and center',
    dishes: ['Chorba frik', 'Rechta', 'Mhadjeb', 'Couscous', 'Tajine zitoune'],
    cta: 'Explore Maghrebi recipes',
    title: 'Home cooking, front and center.',
    body: 'Chorba, rechta, mhadjeb, couscous: carefully written Maghrebi recipes, in Arabic and French.',
    imageAlt: 'Fresh bread and pastries out of the oven',
  },
  cta: {
    button: 'Plan my week',
    title: 'Your first week of meals is waiting.',
    body: 'Free, no credit card needed.',
  },
  footer: {
    language: 'Language',
    tagline: 'The cooking assistant that plans, shops and guides you.',
    product: 'Product',
    company: 'Cravio',
    about: 'About',
    privacy: 'Privacy',
    terms: 'Terms',
    rights: '© 2026 Cravio. Open source project.',
  },
  notFound: {
    title: 'This page isn’t cooked yet.',
    body: 'It’s coming in a later step of the project.',
    back: 'Back to home',
  },
}

export default en
