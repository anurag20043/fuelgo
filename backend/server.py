from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, Cookie, Header
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
import hashlib
import secrets
import bcrypt
import httpx
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional, Literal
from datetime import datetime, timezone, timedelta

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# ---------- Config ----------
MONGO_URL = os.environ['MONGO_URL']
DB_NAME = os.environ['DB_NAME']
ADMIN_EMAILS = {e.strip().lower() for e in os.environ.get('ADMIN_EMAILS', '').split(',') if e.strip()}
OTP_DEV_MODE = os.environ.get('OTP_DEV_MODE', 'true').lower() == 'true'

EMERGENT_SESSION_URL = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"

FUEL_PRICES = {"petrol": 106.50, "diesel": 94.50}

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


def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(pw: str, h: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode("utf-8"), h.encode("utf-8"))
    except Exception:
        return False


def hash_otp(code: str) -> str:
    return hashlib.sha256(code.encode("utf-8")).hexdigest()


def gen_otp() -> str:
    return f"{secrets.randbelow(1000000):06d}"


def normalize_contact(contact: str):
    """Return ('email'|'phone', normalized)."""
    c = (contact or "").strip()
    if "@" in c:
        return "email", c.lower()
    digits = "".join(ch for ch in c if ch.isdigit() or ch == "+")
    if not digits:
        raise HTTPException(status_code=400, detail="Invalid contact")
    if not digits.startswith("+"):
        digits = "+" + digits.lstrip("0")
    return "phone", digits


async def _issue_session(user_id: str, response: Response) -> str:
    session_token = secrets.token_urlsafe(32)
    expires_at = now_utc() + timedelta(days=7)
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": iso(expires_at),
        "created_at": iso(now_utc()),
    })
    response.set_cookie(
        key="session_token",
        value=session_token,
        max_age=7 * 24 * 60 * 60,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
    )
    return session_token


# ---------- Models ----------
FuelType = Literal["petrol", "diesel"]
BookingStatus = Literal["pending", "assigned", "en_route", "delivered", "cancelled"]
DriverStatus = Literal["available", "busy", "offline"]


class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
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


class RegisterInput(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    name: str = Field(min_length=1, max_length=80)
    phone: Optional[str] = None


class LoginInput(BaseModel):
    email: EmailStr
    password: str


class OtpSendInput(BaseModel):
    contact: str


class OtpVerifyInput(BaseModel):
    contact: str
    code: str
    name: Optional[str] = None


# ---------- Auth (session helper) ----------
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


def _pub_user(u) -> dict:
    return {
        "user_id": u["user_id"],
        "email": u["email"],
        "name": u["name"],
        "picture": u.get("picture"),
        "role": u.get("role", "customer"),
    }


# ---------- Google OAuth (Emergent) ----------
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

    existing = await db.users.find_one({"email": email}, {"_id": 0})
    admin_email_allowlisted = email in ADMIN_EMAILS

    if existing:
        current_role = existing.get("role", "customer")
        user_id = existing["user_id"]
        if intent == "admin":
            if admin_email_allowlisted or current_role == "admin":
                role = "admin"
            else:
                raise HTTPException(status_code=403, detail="Admin access is restricted to the designated administrator")
        else:
            role = current_role if current_role == "admin" else "customer"
        update_fields = {"name": name, "picture": picture}
        if role != current_role:
            update_fields["role"] = role
        await db.users.update_one({"user_id": user_id}, {"$set": update_fields})
    else:
        if intent == "admin":
            if admin_email_allowlisted:
                role = "admin"
            elif not ADMIN_EMAILS:
                admin_exists = await db.users.count_documents({"role": "admin"}) > 0
                if admin_exists:
                    raise HTTPException(status_code=403, detail="Admin access is restricted to the designated administrator")
                role = "admin"
            else:
                raise HTTPException(status_code=403, detail="Admin access is restricted to the designated administrator")
        else:
            role = "customer"
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": user_id,
            "email": email,
            "name": name,
            "picture": picture,
            "role": role,
            "auth_provider": "google",
            "created_at": iso(now_utc()),
        })

    expires_at = now_utc() + timedelta(days=7)
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": iso(expires_at),
        "created_at": iso(now_utc()),
    })
    response.set_cookie(
        key="session_token", value=session_token,
        max_age=7 * 24 * 60 * 60, httponly=True, secure=True, samesite="none", path="/",
    )
    return {"user_id": user_id, "email": email, "name": name, "picture": picture, "role": role}


# ---------- Password auth (customers only) ----------
@api_router.post("/auth/register")
async def auth_register(body: RegisterInput, response: Response):
    email = str(body.email).lower()
    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    phone_norm = None
    if body.phone:
        try:
            _, phone_norm = normalize_contact(body.phone)
        except HTTPException:
            phone_norm = None
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    doc = {
        "user_id": user_id,
        "email": email,
        "name": body.name.strip(),
        "phone": phone_norm,
        "password_hash": hash_password(body.password),
        "role": "customer",
        "auth_provider": "password",
        "picture": None,
        "created_at": iso(now_utc()),
    }
    await db.users.insert_one(doc.copy())
    await _issue_session(user_id, response)
    return _pub_user(doc)


@api_router.post("/auth/login")
async def auth_login(body: LoginInput, response: Response):
    email = str(body.email).lower()
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user or not user.get("password_hash"):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if user.get("role") == "admin":
        raise HTTPException(status_code=403, detail="Administrators must sign in with Google")
    if not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    await _issue_session(user["user_id"], response)
    return _pub_user(user)


# ---------- OTP auth (email or phone; customers only) ----------
@api_router.post("/auth/otp/send")
async def otp_send(body: OtpSendInput):
    contact_type, contact = normalize_contact(body.contact)

    # If contact belongs to an admin user, block OTP login
    existing_admin = None
    if contact_type == "email":
        existing_admin = await db.users.find_one({"email": contact, "role": "admin"}, {"_id": 0})
    else:
        existing_admin = await db.users.find_one({"phone": contact, "role": "admin"}, {"_id": 0})
    if existing_admin:
        raise HTTPException(status_code=403, detail="Administrators must sign in with Google")

    # Rate limit: max 5 OTPs to same contact in 10 min
    since = iso(now_utc() - timedelta(minutes=10))
    recent = await db.otp_codes.count_documents({"contact": contact, "created_at": {"$gt": since}})
    if recent >= 5:
        raise HTTPException(status_code=429, detail="Too many OTP requests. Please try again later.")

    code = gen_otp()
    await db.otp_codes.insert_one({
        "contact": contact,
        "contact_type": contact_type,
        "code_hash": hash_otp(code),
        "expires_at": iso(now_utc() + timedelta(minutes=10)),
        "attempts": 0,
        "consumed": False,
        "created_at": iso(now_utc()),
    })

    logger.info(f"[OTP DEV] channel={contact_type} contact={contact} code={code}")
    # TODO(prod): if not OTP_DEV_MODE and channel==email -> Resend; channel==phone -> Twilio SMS
    result = {"sent": True, "channel": contact_type, "contact": contact, "dev_mode": OTP_DEV_MODE}
    if OTP_DEV_MODE:
        result["dev_code"] = code
    return result


@api_router.post("/auth/otp/verify")
async def otp_verify(body: OtpVerifyInput, response: Response):
    contact_type, contact = normalize_contact(body.contact)

    otp = await db.otp_codes.find_one(
        {"contact": contact, "consumed": False},
        {"_id": 0},
        sort=[("created_at", -1)],
    )
    if not otp:
        raise HTTPException(status_code=400, detail="No OTP found. Please request a new one.")

    expires_at = otp["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < now_utc():
        raise HTTPException(status_code=400, detail="OTP expired. Please request a new one.")

    if otp.get("attempts", 0) >= 5:
        raise HTTPException(status_code=400, detail="Too many attempts. Please request a new OTP.")

    if hash_otp(body.code.strip()) != otp["code_hash"]:
        await db.otp_codes.update_one(
            {"contact": contact, "code_hash": otp["code_hash"]},
            {"$inc": {"attempts": 1}},
        )
        raise HTTPException(status_code=400, detail="Invalid OTP")

    await db.otp_codes.update_one(
        {"contact": contact, "code_hash": otp["code_hash"]},
        {"$set": {"consumed": True}},
    )

    # Find or create user; deny admins
    if contact_type == "email":
        user = await db.users.find_one({"email": contact}, {"_id": 0})
    else:
        user = await db.users.find_one({"phone": contact}, {"_id": 0})

    if user and user.get("role") == "admin":
        raise HTTPException(status_code=403, detail="Administrators must sign in with Google")

    if not user:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        display_name = (body.name or "").strip() or (contact.split("@")[0] if contact_type == "email" else contact)
        doc = {
            "user_id": user_id,
            "email": contact if contact_type == "email" else f"{contact.lstrip('+')}@phone.local",
            "phone": contact if contact_type == "phone" else None,
            "name": display_name,
            "picture": None,
            "role": "customer",
            "auth_provider": "otp",
            "created_at": iso(now_utc()),
        }
        await db.users.insert_one(doc.copy())
        user = doc

    await _issue_session(user["user_id"], response)
    return _pub_user(user)


# ---------- Auth session mgmt ----------
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


# ---------- Driver assignment helpers ----------
async def _reserve_available_driver() -> Optional[dict]:
    return await db.drivers.find_one_and_update(
        {"status": "available"},
        {"$set": {"status": "busy"}},
        projection={"_id": 0},
        sort=[("created_at", 1)],
    )


async def _process_pending_bookings(max_batches: int = 50) -> int:
    """Assign drivers to pending bookings (oldest first). Returns count assigned."""
    assigned = 0
    for _ in range(max_batches):
        pending = await db.bookings.find_one(
            {"status": "pending"}, {"_id": 0}, sort=[("created_at", 1)]
        )
        if not pending:
            break
        driver = await _reserve_available_driver()
        if not driver:
            break
        await db.bookings.update_one(
            {"id": pending["id"]},
            {"$set": {
                "status": "assigned",
                "driver_id": driver["id"],
                "driver_name": driver["name"],
                "driver_phone": driver["phone"],
                "updated_at": iso(now_utc()),
            }},
        )
        assigned += 1
    return assigned


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
        "id": driver_id, "name": body.name.strip(), "phone": body.phone.strip(),
        "vehicle": body.vehicle.strip(), "status": "available", "created_at": iso(now),
    }
    await db.drivers.insert_one(doc.copy())
    # Assign to any pending bookings
    await _process_pending_bookings()
    # Reload driver (status may have changed to busy)
    doc = await db.drivers.find_one({"id": driver_id}, {"_id": 0})
    doc["created_at"] = parse_dt(doc["created_at"])
    return Driver(**doc)


@api_router.patch("/drivers/{driver_id}", response_model=Driver)
async def update_driver(driver_id: str, body: DriverUpdate, _: User = Depends(require_admin)):
    updates = {k: v for k, v in body.model_dump(exclude_none=True).items()}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    res = await db.drivers.update_one({"id": driver_id}, {"$set": updates})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Driver not found")
    # If driver came back online, try assigning pending bookings
    if updates.get("status") == "available":
        await _process_pending_bookings()
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
@api_router.post("/bookings", response_model=Booking)
async def create_booking(body: BookingCreate, user: User = Depends(get_current_user)):
    unit_price = FUEL_PRICES[body.fuel_type]
    total = round(unit_price * body.quantity_l, 2)
    driver = await _reserve_available_driver()
    now = now_utc()
    booking_id = f"bkg_{uuid.uuid4().hex[:10]}"
    doc = {
        "id": booking_id, "user_id": user.user_id, "user_name": user.name, "user_email": user.email,
        "fuel_type": body.fuel_type, "quantity_l": body.quantity_l, "unit_price": unit_price, "total_price": total,
        "address": body.address, "lat": body.lat, "lng": body.lng, "notes": body.notes,
        "status": "assigned" if driver else "pending",
        "driver_id": driver["id"] if driver else None,
        "driver_name": driver["name"] if driver else None,
        "driver_phone": driver["phone"] if driver else None,
        "created_at": iso(now), "updated_at": iso(now),
    }
    await db.bookings.insert_one(doc.copy())
    doc["created_at"] = now
    doc["updated_at"] = now
    return Booking(**doc)


@api_router.get("/bookings", response_model=List[Booking])
async def list_bookings(
    status: Optional[BookingStatus] = None, fuel_type: Optional[FuelType] = None,
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
    status: Optional[BookingStatus] = None, fuel_type: Optional[FuelType] = None,
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

    if new_status == "assigned" and not booking.get("driver_id"):
        driver = await _reserve_available_driver()
        if not driver:
            raise HTTPException(status_code=409, detail="No available drivers")
        updates.update({"driver_id": driver["id"], "driver_name": driver["name"], "driver_phone": driver["phone"]})

    driver_released = False
    if new_status in ("delivered", "cancelled") and booking.get("driver_id"):
        await db.drivers.update_one({"id": booking["driver_id"]}, {"$set": {"status": "available"}})
        driver_released = True

    await db.bookings.update_one({"id": booking_id}, {"$set": updates})

    # Freed driver? Try assigning to next pending booking.
    if driver_released:
        await _process_pending_bookings()

    doc = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    doc["created_at"] = parse_dt(doc["created_at"])
    doc["updated_at"] = parse_dt(doc["updated_at"])
    return Booking(**doc)


@api_router.post("/bookings/{booking_id}/retry-assignment", response_model=Booking)
async def retry_booking_assignment(booking_id: str, _: User = Depends(require_admin)):
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking["status"] != "pending":
        raise HTTPException(status_code=400, detail="Only pending bookings can be re-assigned")

    driver = await _reserve_available_driver()
    if not driver:
        raise HTTPException(status_code=409, detail="No available drivers")

    await db.bookings.update_one(
        {"id": booking_id},
        {"$set": {
            "status": "assigned",
            "driver_id": driver["id"],
            "driver_name": driver["name"],
            "driver_phone": driver["phone"],
            "updated_at": iso(now_utc()),
        }},
    )
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
    pipeline = [
        {"$match": {"status": "delivered"}},
        {"$group": {"_id": None, "total": {"$sum": "$total_price"}}},
    ]
    revenue = 0.0
    async for row in db.bookings.aggregate(pipeline):
        revenue = row.get("total", 0.0)
    return {
        "total_bookings": total_bookings, "delivered": delivered, "active": pending,
        "revenue": round(revenue, 2), "drivers_total": drivers_total, "drivers_available": drivers_available,
    }


@api_router.get("/")
async def root():
    return {"service": "fuel-delivery-api", "status": "ok", "otp_dev_mode": OTP_DEV_MODE}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def _startup():
    try:
        await db.users.create_index("email", unique=False)
        await db.users.create_index("phone")
        await db.user_sessions.create_index("session_token", unique=True)
        await db.otp_codes.create_index("contact")
    except Exception as e:
        logger.warning(f"Index setup: {e}")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
