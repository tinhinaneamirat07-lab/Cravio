"""Going out: real OpenStreetMap places, photos, reviews, budget info and favorites (ported from GoSpot)."""

from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, HTTPException, Path, Query, Request, Response, status
from sqlalchemy import func, select

from app.core.rate_limit import limiter
from app.deps import DB, AdminUser, CurrentUser, OptionalUser
from app.models import MenuItem, Place, PlaceDetails, PlaceFavorite, PlacePhoto, PlaceReview, User
from app.schemas.place import (
    PLACE_ID_PATTERN,
    Category,
    InfoIn,
    InfoOut,
    MenuItemIn,
    MenuItemOut,
    NearbyPage,
    PhotoAnswer,
    PhotoOut,
    PlaceDetail,
    PlaceInfo,
    PlaceOut,
    ReviewIn,
    ReviewOut,
    Reviews,
)
from app.services import osm, photos

router = APIRouter(tags=["places"])

PlaceId = Annotated[str, Path(pattern=PLACE_ID_PATTERN)]


def _photo_out(photo: PlacePhoto | None) -> PhotoOut | None:
    if photo is None or photo.status != "found" or not photo.thumb_url:
        return None
    return PhotoOut.model_validate(photo)


def _place_out(place: Place, distance_m: int | None = None, photo: PlacePhoto | None = None) -> dict:
    return {
        "id": place.id,
        "name": place.name,
        "category": place.category,
        "latitude": place.latitude,
        "longitude": place.longitude,
        "address": place.address,
        "tags": {k: str(v) for k, v in (place.osm_tags or {}).items()},
        "distance_m": distance_m,
        "photo": _photo_out(photo),
    }


def _known_place(db: DB, place_id: str) -> Place:
    try:
        place = osm.get_place(db, place_id)
    except osm.PlacesUnavailable:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, detail="Places unavailable right now") from None
    if place is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Place not found")
    return place


@router.get("/places/nearby", response_model=NearbyPage)
@limiter.limit("30/minute")
def nearby(
    request: Request,
    db: DB,
    background: BackgroundTasks,
    lat: float = Query(ge=-90, le=90),
    lon: float = Query(ge=-180, le=180),
    radius: int = Query(default=5000, ge=500, le=20000, description="Metres"),
    category: Category | None = None,
    limit: int = Query(default=50, ge=1, le=300),
    offset: int = Query(default=0, ge=0, le=10000),
) -> dict:
    """Places around a point, nearest first. The position is only used for this search, never stored
    (only the area, rounded to about 1 km, is remembered so Overpass is asked once a week)."""
    try:
        result = osm.get_places_around(db, lat, lon, radius, category)
    except osm.PlacesUnavailable:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, detail="Places unavailable right now") from None
    found = result["found"]
    page = found[offset : offset + limit]
    # Photos are looked up after the answer is sent: the visitor never waits for Wikimedia.
    todo = [f.place.id for f in page if photos.needs_prefetch(f.place, f.photo)]
    if todo:
        background.add_task(photos.prefetch, todo)
    return {
        "places": [_place_out(f.place, f.distance_m, f.photo) for f in page],
        "total": len(found),
        "limit": limit,
        "offset": offset,
        "source": result["source"],
        "stale": result["stale"],
    }


@router.get("/places/info", response_model=dict[str, InfoOut])
def info_batch(db: DB, ids: str = Query(max_length=8000, description="Comma-separated place ids")) -> dict:
    """Budget and group size of many places at once (used to filter a list)."""
    wanted = [i.strip() for i in ids.split(",") if i.strip()][:200]
    rows = db.scalars(select(PlaceDetails).where(PlaceDetails.place_id.in_(wanted))) if wanted else []
    return {row.place_id: row for row in rows}


@router.get("/me/places", response_model=list[PlaceOut])
def my_places(user: CurrentUser, db: DB) -> list[dict]:
    rows = db.execute(
        select(Place, PlacePhoto)
        .join(PlaceFavorite, PlaceFavorite.place_id == Place.id)
        .outerjoin(PlacePhoto, PlacePhoto.place_id == Place.id)
        .where(PlaceFavorite.user_id == user.id)
        .order_by(PlaceFavorite.created_at.desc())
    )
    return [_place_out(place, photo=photo) for place, photo in rows]


@router.get("/places/{place_id}", response_model=PlaceDetail)
def get_place(place_id: PlaceId, db: DB, user: OptionalUser) -> dict:
    place = _known_place(db, place_id)
    average, count = db.execute(
        select(func.avg(PlaceReview.rating), func.count()).where(PlaceReview.place_id == place.id)
    ).one()
    detail = _place_out(place, photo=db.get(PlacePhoto, place.id))
    detail["rating_average"] = round(average, 1) if average is not None else None
    detail["rating_count"] = count
    detail["is_favorite"] = bool(user and db.get(PlaceFavorite, (user.id, place.id)))
    return detail


@router.get("/places/{place_id}/photo", response_model=PhotoAnswer)
def get_photo(place_id: PlaceId, db: DB) -> dict:
    """The first call may take a second (we ask Wikimedia), then the answer is saved."""
    place = _known_place(db, place_id)
    try:
        photo = photos.get_photo(db, place)
    except photos.PhotoError:
        photo = None  # a photo is a nice-to-have: never break the page for it
    return {"photo": _photo_out(photo)}


# --- Reviews ----------------------------------------------------------------


@router.get("/places/{place_id}/reviews", response_model=Reviews)
def list_reviews(place_id: PlaceId, db: DB, user: OptionalUser) -> dict:
    rows = db.execute(
        select(PlaceReview, User.name)
        .join(User, User.id == PlaceReview.user_id)
        .where(PlaceReview.place_id == place_id)
        .order_by(PlaceReview.created_at.desc())
    ).all()
    reviews = [
        {"id": r.id, "author": name, "rating": r.rating, "comment": r.comment, "created_at": r.created_at,
         "mine": bool(user and r.user_id == user.id)}
        for r, name in rows
    ]
    average = round(sum(r["rating"] for r in reviews) / len(reviews), 1) if reviews else None
    return {"average": average, "count": len(reviews), "reviews": reviews}


@router.post("/places/{place_id}/reviews", response_model=ReviewOut, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
def post_review(request: Request, place_id: PlaceId, body: ReviewIn, user: CurrentUser, db: DB) -> dict:
    """One review per person and place: posting again replaces it. The author comes from the session."""
    place = _known_place(db, place_id)
    review = db.scalar(select(PlaceReview).where(PlaceReview.place_id == place.id, PlaceReview.user_id == user.id))
    if review is None:
        review = PlaceReview(place_id=place.id, user_id=user.id, rating=body.rating, comment=body.comment)
        db.add(review)
    else:
        review.rating, review.comment = body.rating, body.comment
    db.commit()
    db.refresh(review)
    return {"id": review.id, "author": user.name, "rating": review.rating, "comment": review.comment,
            "created_at": review.created_at, "mine": True}


@router.delete("/places/{place_id}/reviews/mine", status_code=status.HTTP_204_NO_CONTENT)
def delete_my_review(place_id: PlaceId, user: CurrentUser, db: DB) -> Response:
    review = db.scalar(select(PlaceReview).where(PlaceReview.place_id == place_id, PlaceReview.user_id == user.id))
    if review:
        db.delete(review)
        db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# --- Budget, group size and menu (read by everyone, written by an admin) ------


@router.get("/places/{place_id}/info", response_model=PlaceInfo)
def get_info(place_id: PlaceId, db: DB, user: OptionalUser) -> dict:
    menu = db.scalars(select(MenuItem).where(MenuItem.place_id == place_id).order_by(MenuItem.created_at))
    return {"info": db.get(PlaceDetails, place_id), "menu": list(menu), "can_edit": bool(user and user.is_admin)}


@router.put("/places/{place_id}/info", response_model=InfoOut)
def set_info(place_id: PlaceId, body: InfoIn, admin: AdminUser, db: DB) -> PlaceDetails:
    place = _known_place(db, place_id)
    row = db.get(PlaceDetails, place.id) or PlaceDetails(place_id=place.id)
    for k, v in body.model_dump().items():
        setattr(row, k, v)
    row.updated_by = admin.id
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.post("/places/{place_id}/menu", response_model=MenuItemOut, status_code=status.HTTP_201_CREATED)
def add_menu_item(place_id: PlaceId, body: MenuItemIn, admin: AdminUser, db: DB) -> MenuItem:
    place = _known_place(db, place_id)
    item = MenuItem(place_id=place.id, name=body.name, price=body.price, added_by=admin.id)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/places/{place_id}/menu/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_menu_item(place_id: PlaceId, item_id: int, admin: AdminUser, db: DB) -> Response:
    # "AND place_id": changing the number in the URL cannot delete another place's item.
    item = db.scalar(select(MenuItem).where(MenuItem.id == item_id, MenuItem.place_id == place_id))
    if item is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Menu item not found")
    db.delete(item)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# --- Favorites ----------------------------------------------------------------


@router.put("/places/{place_id}/favorite", status_code=status.HTTP_204_NO_CONTENT)
def add_favorite(place_id: PlaceId, user: CurrentUser, db: DB) -> Response:
    place = _known_place(db, place_id)
    if db.get(PlaceFavorite, (user.id, place.id)) is None:
        db.add(PlaceFavorite(user_id=user.id, place_id=place.id))
        db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.delete("/places/{place_id}/favorite", status_code=status.HTTP_204_NO_CONTENT)
def remove_favorite(place_id: PlaceId, user: CurrentUser, db: DB) -> Response:
    favorite = db.get(PlaceFavorite, (user.id, place_id))
    if favorite:
        db.delete(favorite)
        db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
