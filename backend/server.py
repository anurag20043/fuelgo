from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, Cookie, Header
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
import httpx
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from datetime import datetime, timezone, timedelta

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# ---------- Config ----------
MONGO_URL = os.environ['MONGO_URL']
DB_NAME = os.environ['DB_NAME']
ADMIN_EMAILS = {e.strip().lower() for e in os.environ.get('ADMIN_EMAILS', '').split(',') if e.strip()}

EMERGENT_SESSION_URL = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"

# Fuel catalog (₹ per litre)
FUEL_PRICES = {
    "petrol": 106.50,
    "diesel": 94.50,
}

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="Fuel Delivery API")
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ---------- Utils ----------
def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def iso(dt: datetime) -> str:
    return dt.isoformat()


def parse_dt(v):
    if isinstance(v, str):
        return datetime.fromisoformat(v)
    return v


# ---------- Models ----------
FuelType = Literal["petrol", "diesel"]
BookingStatus = Literal["pending", "assigned", "en_route", "delivered", "cancelled"]
DriverStatus = Literal["available", "busy", "offline"]


class User(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    role: Literal["admin", "customer"] = "customer"
    created_at: datetime


class Driver(BaseModel):
    id: str
    name: str
    phone: str
    vehicle: str
    status: DriverStatus = "available"
    created_at: datetime


class DriverCreate(BaseModel):
    name: str
    phone: str
    vehicle: str


class DriverUpdate(BaseModel):
    status: Optional[DriverStatus] = None
    name: Optional[str] = None
    phone: Optional[str] = None
    vehicle: Optional[str] = None


class Booking(BaseModel):
    id: str
    user_id: str
    user_name: str
    user_email: str
    fuel_type: FuelType
    quantity_l: float
    unit_price: float
    total_price: float
    address: str
    lat: Optional[float] = None
    lng: Optional[float] = None
    notes: Optional[str] = None
    status: BookingStatus = "pending"
    driver_id: Optional[str] = None
    driver_name: Optional[str] = None
    driver_phone: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class BookingCreate(BaseModel):
    fuel_type: FuelType
    quantity_l: float = Field(gt=0, le=1000)
    address: str = Field(min_length=3, max_length=300)
    lat: Optional[float] = None
    lng: Optional[float] = None
    notes: Optional[str] = None


class BookingStatusUpdate(BaseModel):
    status: BookingStatus


class SessionInfo(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    role: str


# ---------- Auth ----------
async def get_current_user(
    request: Request,
    session_token: Optional[str] = Cookie(default=None),
    authorization: Optional[str] = Header(default=None),
) -> User:
    token = session_token
    if not token and authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1].strip()
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    sess = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not sess:
        raise HTTPException(status_code=401, detail="Invalid session")

    expires_at = sess.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < now_utc():
        raise HTTPException(status_code=401, detail="Session expired")

    user_doc = await db.users.find_one({"user_id": sess["user_id"]}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="User not found")

    user_doc["created_at"] = parse_dt(user_doc["created_at"])
    return User(**user_doc)


async def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    return user


@api_router.post("/auth/callback")
async def auth_callback(request: Request, response: Response):
    body = await request.json()
    session_id = body.get("session_id")
    intent = (body.get("intent") or "customer").lower()
    if intent not in ("admin", "customer"):
        intent = "customer"
    if not session_id:
        raise HTTPException(status_code=400, detail="Missing session_id")

    async with httpx.AsyncClient(timeout=15.0) as hc:
        r = await hc.get(EMERGENT_SESSION_URL, headers={"X-Session-ID": session_id})
    if r.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid session_id")

    data = r.json()
    email = data["email"].lower()
    name = data.get("name") or email
    picture = data.get("picture")
    session_token = data["session_token"]

    # Upsert user
    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        role = existing.get("role", "customer")
        update_fields = {"name": name, "picture": picture}
        # Promote if listed in ADMIN_EMAILS but not yet admin
        if email in ADMIN_EMAILS and role != "admin":
            role = "admin"
            update_fields["role"] = "admin"
        # Allow role switching on sign-in based on user's chosen portal (both roles allowed)
        elif intent != role:
            role = intent
            update_fields["role"] = intent
        await db.users.update_one({"user_id": user_id}, {"$set": update_fields})
    else:
        # New user: use the chosen intent (admin or customer). ADMIN_EMAILS always wins.
        role = "admin" if email in ADMIN_EMAILS else intent
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": user_id,
            "email": email,
            "name": name,
            "picture": picture,
            "role": role,
            "created_at": iso(now_utc()),
        })

    # Store session (7 days)
    expires_at = now_utc() + timedelta(days=7)
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": iso(expires_at),
        "created_at": iso(now_utc()),
    })

    # httpOnly cookie (secure, samesite none for cross-site cookie)
    response.set_cookie(
        key="session_token",
        value=session_token,
        max_age=7 * 24 * 60 * 60,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
    )

    return {
        "user_id": user_id,
        "email": email,
        "name": name,
        "picture": picture,
        "role": role,
    }


@api_router.get("/auth/me", response_model=SessionInfo)
async def auth_me(user: User = Depends(get_current_user)):
    return SessionInfo(
        user_id=user.user_id, email=user.email, name=user.name,
        picture=user.picture, role=user.role,
    )


@api_router.post("/auth/logout")
async def auth_logout(response: Response, session_token: Optional[str] = Cookie(default=None)):
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    response.delete_cookie("session_token", path="/", samesite="none", secure=True)
    return {"ok": True}


# ---------- Prices ----------
@api_router.get("/prices")
async def get_prices():
    return {"prices": FUEL_PRICES, "currency": "INR", "unit": "L"}


# ---------- Drivers ----------
@api_router.get("/drivers", response_model=List[Driver])
async def list_drivers(user: User = Depends(get_current_user)):
    docs = await db.drivers.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    for d in docs:
        d["created_at"] = parse_dt(d["created_at"])
    return [Driver(**d) for d in docs]


@api_router.post("/drivers", response_model=Driver)
async def create_driver(body: DriverCreate, _: User = Depends(require_admin)):
    driver_id = f"drv_{uuid.uuid4().hex[:10]}"
    now = now_utc()
    doc = {
        "id": driver_id,
        "name": body.name.strip(),
        "phone": body.phone.strip(),
        "vehicle": body.vehicle.strip(),
        "status": "available",
        "created_at": iso(now),
    }
    await db.drivers.insert_one(doc.copy())
    doc["created_at"] = now
    return Driver(**doc)


@api_router.patch("/drivers/{driver_id}", response_model=Driver)
async def update_driver(driver_id: str, body: DriverUpdate, _: User = Depends(require_admin)):
    updates = {k: v for k, v in body.model_dump(exclude_none=True).items()}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    res = await db.drivers.update_one({"id": driver_id}, {"$set": updates})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Driver not found")
    doc = await db.drivers.find_one({"id": driver_id}, {"_id": 0})
    doc["created_at"] = parse_dt(doc["created_at"])
    return Driver(**doc)


@api_router.delete("/drivers/{driver_id}")
async def delete_driver(driver_id: str, _: User = Depends(require_admin)):
    res = await db.drivers.delete_one({"id": driver_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Driver not found")
    return {"ok": True}


# ---------- Bookings ----------
async def _assign_driver() -> Optional[dict]:
    """Find and reserve the first available driver atomically."""
    d = await db.drivers.find_one_and_update(
        {"status": "available"},
        {"$set": {"status": "busy"}},
        projection={"_id": 0},
        sort=[("created_at", 1)],
    )
    return d


@api_router.post("/bookings", response_model=Booking)
async def create_booking(body: BookingCreate, user: User = Depends(get_current_user)):
    unit_price = FUEL_PRICES[body.fuel_type]
    total = round(unit_price * body.quantity_l, 2)

    driver = await _assign_driver()
    now = now_utc()
    booking_id = f"bkg_{uuid.uuid4().hex[:10]}"

    doc = {
        "id": booking_id,
        "user_id": user.user_id,
        "user_name": user.name,
        "user_email": user.email,
        "fuel_type": body.fuel_type,
        "quantity_l": body.quantity_l,
        "unit_price": unit_price,
        "total_price": total,
        "address": body.address,
        "lat": body.lat,
        "lng": body.lng,
        "notes": body.notes,
        "status": "assigned" if driver else "pending",
        "driver_id": driver["id"] if driver else None,
        "driver_name": driver["name"] if driver else None,
        "driver_phone": driver["phone"] if driver else None,
        "created_at": iso(now),
        "updated_at": iso(now),
    }
    await db.bookings.insert_one(doc.copy())
    doc["created_at"] = now
    doc["updated_at"] = now
    return Booking(**doc)


@api_router.get("/bookings", response_model=List[Booking])
async def list_bookings(
    status: Optional[BookingStatus] = None,
    fuel_type: Optional[FuelType] = None,
    user: User = Depends(get_current_user),
):
    query: dict = {"user_id": user.user_id}
    if status:
        query["status"] = status
    if fuel_type:
        query["fuel_type"] = fuel_type
    docs = await db.bookings.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    for d in docs:
        d["created_at"] = parse_dt(d["created_at"])
        d["updated_at"] = parse_dt(d["updated_at"])
    return [Booking(**d) for d in docs]


@api_router.get("/admin/bookings", response_model=List[Booking])
async def admin_list_bookings(
    status: Optional[BookingStatus] = None,
    fuel_type: Optional[FuelType] = None,
    _: User = Depends(require_admin),
):
    query: dict = {}
    if status:
        query["status"] = status
    if fuel_type:
        query["fuel_type"] = fuel_type
    docs = await db.bookings.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    for d in docs:
        d["created_at"] = parse_dt(d["created_at"])
        d["updated_at"] = parse_dt(d["updated_at"])
    return [Booking(**d) for d in docs]


@api_router.patch("/bookings/{booking_id}/status", response_model=Booking)
async def update_booking_status(
    booking_id: str, body: BookingStatusUpdate, _: User = Depends(require_admin)
):
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    new_status = body.status
    updates = {"status": new_status, "updated_at": iso(now_utc())}

    # If pending and no driver, try to assign
    if new_status == "assigned" and not booking.get("driver_id"):
        driver = await _assign_driver()
        if not driver:
            raise HTTPException(status_code=409, detail="No available drivers")
        updates.update({
            "driver_id": driver["id"],
            "driver_name": driver["name"],
            "driver_phone": driver["phone"],
        })

    # On delivery/cancel, free up driver
    if new_status in ("delivered", "cancelled") and booking.get("driver_id"):
        await db.drivers.update_one(
            {"id": booking["driver_id"]}, {"$set": {"status": "available"}}
        )

    await db.bookings.update_one({"id": booking_id}, {"$set": updates})
    doc = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    doc["created_at"] = parse_dt(doc["created_at"])
    doc["updated_at"] = parse_dt(doc["updated_at"])
    return Booking(**doc)


# ---------- Admin stats ----------
@api_router.get("/admin/stats")
async def admin_stats(_: User = Depends(require_admin)):
    total_bookings = await db.bookings.count_documents({})
    delivered = await db.bookings.count_documents({"status": "delivered"})
    pending = await db.bookings.count_documents({"status": {"$in": ["pending", "assigned", "en_route"]}})
    drivers_total = await db.drivers.count_documents({})
    drivers_available = await db.drivers.count_documents({"status": "available"})
    # Revenue from delivered
    pipeline = [
        {"$match": {"status": "delivered"}},
        {"$group": {"_id": None, "total": {"$sum": "$total_price"}}},
    ]
    rev_cursor = db.bookings.aggregate(pipeline)
    revenue = 0.0
    async for row in rev_cursor:
        revenue = row.get("total", 0.0)
    return {
        "total_bookings": total_bookings,
        "delivered": delivered,
        "active": pending,
        "revenue": round(revenue, 2),
        "drivers_total": drivers_total,
        "drivers_available": drivers_available,
    }


@api_router.get("/")
async def root():
    return {"service": "fuel-delivery-api", "status": "ok"}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
