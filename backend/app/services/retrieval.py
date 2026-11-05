"""Find the recipes that best match a question, in French, English or Arabic (the "R" of RAG).

A small keyword index with BM25 scoring, built from titles, ingredients and tags. It is cached in memory
and rebuilt only when the recipes change, which is fast enough for a few thousand recipes.
"""

import math
import re
import unicodedata
from collections import Counter
from dataclasses import dataclass, field
from threading import Lock

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.models import Recipe

_WORD = re.compile(r"\w+", re.UNICODE)
_ARABIC_MARKS = re.compile("[ً-ْـ]")  # harakat and tatweel

STOPWORDS = set(
    """
    a an and are as at be but by can do for from have how i in is it me my of on or so that the this to
    what with without you your want make cook some any recipe recipes dish idea ideas give please need
    au aux avec ce ces comment de des du elle en est et il je la le les leur ma mais me mes moi mon ne
    ou par pas pour qu que qui sa sans se ses son sur ta te tes toi ton tu un une vos votre veux faire
    cuisiner recette recettes plat plats idee idees donne besoin quoi quel quelle ai frigo reste
    في من على مع بدون عن الى ما ماذا كيف هل انا اريد وصفه وصفات طبق لي عندي
    """.split()
)

# Words that point to a category or a diet rather than an ingredient.
TAG_WORDS = {
    "soup": "soup",
    "soupe": "soup",
    "chorba": "soup",
    "veloute": "soup",
    "شوربه": "soup",
    "حساء": "soup",
    "salad": "salad",
    "salade": "salad",
    "سلطه": "salad",
    "dessert": "dessert",
    "sweet": "dessert",
    "gateau": "dessert",
    "cake": "dessert",
    "حلوي": "dessert",
    "حلويات": "dessert",
    "breakfast": "breakfast",
    "petit": "breakfast",
    "فطور": "breakfast",
    "drink": "drink",
    "boisson": "drink",
    "مشروب": "drink",
    "عصير": "drink",
    "vegetarian": "vegetarian",
    "vegetarien": "vegetarian",
    "نباتي": "vegetarian",
    "vegan": "vegan",
    "halal": "halal",
    "حلال": "halal",
}


def normalize(text: str) -> str:
    """Lowercase, drop accents and Arabic diacritics, unify Arabic letter variants."""
    text = unicodedata.normalize("NFKD", text.lower())
    text = "".join(c for c in text if not unicodedata.combining(c) or "؀" <= c <= "ۿ")
    text = unicodedata.normalize("NFC", text)
    text = _ARABIC_MARKS.sub("", text)
    return text.replace("أ", "ا").replace("إ", "ا").replace("آ", "ا").replace("ة", "ه").replace("ى", "ي")


def _stem(token: str) -> str:
    if token.isascii() and len(token) > 4 and token.endswith("s"):
        return token[:-2] if token.endswith("es") and len(token) > 5 else token[:-1]
    if not token.isascii() and len(token) > 4 and token.startswith("ال"):
        return token[2:]  # Arabic definite article
    return token


def tokenize(text: str) -> list[str]:
    return [_stem(t) for t in _WORD.findall(normalize(text)) if not t.isdigit() and len(t) > 1 and t not in STOPWORDS]


@dataclass
class _Doc:
    recipe_id: int
    terms: Counter
    length: int
    tags: set[str] = field(default_factory=set)


@dataclass
class _Index:
    key: tuple
    docs: list[_Doc]
    df: Counter
    avg_len: float


_cache: _Index | None = None
_lock = Lock()


def _index_key(db: Session) -> tuple:
    return tuple(db.execute(select(func.count(Recipe.id), func.max(Recipe.updated_at))).one())


def _build(db: Session, key: tuple) -> _Index:
    recipes = db.scalars(
        select(Recipe).where(Recipe.is_published.is_(True)).options(selectinload(Recipe.ingredients))
    ).all()
    docs, df = [], Counter()
    for r in recipes:
        terms: Counter = Counter()
        for title in r.title.values():
            for t in tokenize(title):
                terms[t] += 3  # a match in the title counts more
        for ing in r.ingredients:
            for name in ing.name.values():
                terms.update(tokenize(name))
        for extra in [r.origin or "", r.category, r.cuisine, *r.diets]:
            terms.update(tokenize(extra))
        docs.append(_Doc(r.id, terms, sum(terms.values()), {r.category, *r.diets}))
        df.update(set(terms))
    avg = sum(d.length for d in docs) / len(docs) if docs else 1.0
    return _Index(key, docs, df, avg)


def _get_index(db: Session) -> _Index:
    global _cache
    key = _index_key(db)
    with _lock:
        if _cache is None or _cache.key != key:
            _cache = _build(db, key)
        return _cache


def _prefix(a: str, b: str) -> bool:
    return a.startswith(b) or b.startswith(a)


def search(db: Session, query: str, limit: int = 6) -> list[Recipe]:
    """Up to `limit` published recipes ranked by relevance to `query` (empty if nothing matches)."""
    index = _get_index(db)
    q_terms = set(tokenize(query))
    if not q_terms or not index.docs:
        return []
    wanted_tags = {TAG_WORDS[t] for t in q_terms if t in TAG_WORDS}
    n = len(index.docs)
    k1, b = 1.4, 0.6

    scored: list[tuple[float, int]] = []
    for doc in index.docs:
        score = 0.0
        for t in q_terms:
            tf = doc.terms.get(t, 0)
            if not tf and len(t) >= 4:
                # Loose match for longer words: "tomate" finds "tomates", "poulet" finds "poulets".
                tf = sum(
                    c for term, c in doc.terms.items() if len(term) >= 4 and (term.startswith(t) or t.startswith(term))
                )
            if not tf:
                continue
            idf = math.log(1 + (n - index.df.get(t, 0) + 0.5) / (index.df.get(t, 0) + 0.5))
            score += idf * tf * (k1 + 1) / (tf + k1 * (1 - b + b * doc.length / index.avg_len))
        if wanted_tags & doc.tags:
            score += 2.0
        if score > 0:
            scored.append((score, doc.recipe_id))

    scored.sort(key=lambda s: (-s[0], s[1]))
    ids = [rid for _, rid in scored[:limit]]
    if not ids:
        return []
    found = db.scalars(select(Recipe).where(Recipe.id.in_(ids)).options(selectinload(Recipe.ingredients)))
    by_id = {r.id: r for r in found}
    return [by_id[i] for i in ids if i in by_id]
