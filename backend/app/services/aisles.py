"""Guess the supermarket aisle of an ingredient from its name (FR, EN or AR).

A keyword list is enough for a shopping list: it only decides the order items appear in.
Anything unknown goes to "other".
"""

import re
import unicodedata

AISLES = ["produce", "meat", "dairy", "bakery", "pantry", "spices", "drinks", "other"]

_KEYWORDS: dict[str, list[str]] = {
    "produce": [
        # fr
        "tomate", "oignon", "ail", "carotte", "courgette", "aubergine", "poivron", "pomme de terre", "laitue",
        "salade", "concombre", "citron", "orange", "banane", "pomme", "potiron", "champignon", "persil",
        "coriandre", "menthe", "basilic", "thym", "romarin", "gingembre", "piment", "epinard", "chou", "celeri",
        "poireau", "avocat", "fraise", "oignon vert", "echalote", "legume", "fruit",
        # en
        "tomato", "onion", "garlic", "carrot", "zucchini", "courgette", "aubergine", "eggplant", "pepper",
        "potato", "lettuce", "cucumber", "lemon", "lime", "banana", "apple", "pumpkin", "squash", "mushroom",
        "parsley", "coriander", "cilantro", "mint", "basil", "thyme", "rosemary", "ginger", "chilli", "chili",
        "spinach", "cabbage", "celery", "leek", "avocado", "strawberr", "spring onion", "shallot", "scallion",
        "broccoli", "cauliflower", "kale", "pea", "bean sprout", "berries", "mango", "pear",
        # ar
        "طماطم", "بصل", "ثوم", "جزر", "كوسة", "باذنجان", "فلفل", "بطاطا", "خس", "خيار", "ليمون", "برتقال", "موز",
        "تفاح", "قرع", "فطر", "بقدونس", "قصبر", "كزبرة", "نعناع", "زعتر", "إكليل", "زنجبيل",
    ],
    "meat": [
        "poulet", "boeuf", "bœuf", "agneau", "viande", "dinde", "poisson", "saumon", "thon", "crevette", "merguez",
        "chicken", "beef", "lamb", "mutton", "meat", "turkey", "fish", "salmon", "tuna", "prawn", "shrimp", "cod",
        "steak", "mince", "sausage", "duck", "goat", "veal", "pork", "bacon", "ham", "haddock", "mackerel",
        "دجاج", "لحم", "خروف", "سمك", "ديك رومي", "ضلع",
    ],
    "dairy": [
        "lait", "creme", "crème", "beurre", "fromage", "yaourt", "oeuf", "œuf", "mascarpone", "feta", "mozzarella",
        "parmesan", "ricotta", "milk", "cream", "butter", "cheese", "yogurt", "yoghurt", "egg", "cheddar",
        "حليب", "كريمة", "زبدة", "جبن", "ياغورت", "لبن", "بيض", "ماسكاربوني",
    ],
    "bakery": [
        "pain", "baguette", "brioche", "biscuit", "galette", "tortilla", "pita", "bread", "bun", "wrap", "pastry",
        "ladyfinger", "خبز", "بسكويت",
    ],
    "spices": [
        "sel", "poivre", "cumin", "curcuma", "paprika", "cannelle", "ras el hanout", "muscade", "safran", "herbes",
        "salt", "turmeric", "cinnamon", "nutmeg", "saffron", "cardamom", "clove", "oregano", "chilli flakes",
        "chili powder", "garam masala", "curry powder", "bay lea", "vanilla", "spice",
        "ملح", "كمون", "كركم", "قرفة", "رأس الحانوت", "بهارات", "فانيليا",
    ],
    "pantry": [
        "farine", "sucre", "riz", "pates", "pâtes", "lasagne", "semoule", "frik", "lentille", "pois chiche",
        "huile", "vinaigre", "miel", "concentre", "concentré", "coulis", "bouillon", "sauce", "levure", "noix",
        "amande", "chocolat", "cacao", "cafe", "café", "conserve", "fecule", "fécule", "sirop",
        "flour", "sugar", "rice", "pasta", "spaghetti", "noodle", "couscous", "freekeh", "lentil", "chickpea",
        "bean", "oil", "vinegar", "honey", "paste", "passata", "stock", "broth", "soy", "yeast", "baking",
        "walnut", "almond", "nut", "tin", "chocolate", "cocoa", "coffee", "tinned", "canned", "cornflour",
        "syrup", "oat",
        "دقيق", "سكر", "أرز", "عجين", "كسكس", "فريك", "عدس", "حمص", "زيت", "خل", "عسل", "معجون", "مرق", "صلصة",
        "خميرة", "جوز", "لوز", "شوكولاتة", "كاكاو", "قهوة", "نشا", "شراب",
    ],
    "drinks": ["eau", "jus", "water", "juice", "soda", "ماء", "عصير"],
}  # fmt: skip

# Checked in this order: "spices" before "produce" so "chilli flakes" is a spice, "pantry" before
# "produce" so "tomato paste" is pantry, "dairy" before "produce" so "coconut milk" is dairy-like.
_ORDER = ["drinks", "spices", "pantry", "dairy", "bakery", "meat", "produce"]


def _normalize(text: str) -> str:
    text = unicodedata.normalize("NFKD", text.lower())
    return "".join(c for c in text if not unicodedata.combining(c) or "؀" <= c <= "ۿ")


def _pattern(word: str) -> str:
    word = re.escape(_normalize(word))
    # Latin words must start a word ("ham" must not match "graham"); Arabic words may carry a prefix like "ال".
    return rf"\b{word}" if word.isascii() else word


_PATTERNS = {
    aisle: re.compile("|".join(_pattern(k) for k in sorted(words, key=len, reverse=True)))
    for aisle, words in _KEYWORDS.items()
}
# Words that would otherwise be caught by a shorter keyword of the wrong aisle.
_ALIASES = {"eggplant": "aubergine", "peanut": "nut", "coconut milk": "coconut cream tin"}


def aisle_for(names: dict[str, str] | str) -> str:
    texts = names.values() if isinstance(names, dict) else [names]
    joined = " | ".join(_normalize(t) for t in texts if t)
    for word, alias in _ALIASES.items():
        joined = joined.replace(word, alias)
    for aisle in _ORDER:
        if _PATTERNS[aisle].search(joined):
            return aisle
    return "other"
