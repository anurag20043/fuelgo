# Fuel Delivery System — PRD

## Original Problem Statement
Modern Fuel Delivery System enabling customers to book Petrol/Diesel delivery to their location with automatic driver assignment. Includes driver management, booking history, admin operations.

## User Choices (confirmed)
- Stack: Full-stack React + FastAPI + MongoDB
- Auth: Emergent Google social login
- Pricing: Include quantity + price + total (also supports simple flow)
- Design: Industrial/energy + clean & modern hybrid (dark theme, hazard yellow / diesel amber)
- Extras included in MVP: booking history filtering + status updates, driver management CRUD, map/location picker (mock lat/lng)

## Personas
1. Customer — signs in with Google, books petrol/diesel with quantity, address, mock coordinates; sees history with filters.
2. Admin (first signed-up user or listed in ADMIN_EMAILS env) — manages drivers (CRUD, toggle availability), updates booking status through workflow (Pending → Assigned → En route → Delivered / Cancelled).

## Core Requirements
- Google auth via Emergent OAuth (session cookie, 7 days)
- Fuel types: petrol (₹106.5/L), diesel (₹94.5/L) — configurable in backend
- Auto-assign first available driver on booking (status → Assigned + driver → busy)
- Status lifecycle with driver auto-release on Delivered/Cancelled
- Admin panel gated by role
- Responsive dark industrial UI

## Implemented (Feb 2026 — Day 0)
- Emergent Google auth end-to-end (backend + AuthCallback + AuthProvider)
- Driver CRUD API + admin UI
- Booking create + list with filters + auto driver assignment
- Admin status update flow
- Landing page with hero + Google sign-in
- Customer dashboard: booking form + history w/ filter
- Admin panel: drivers + bookings + KPIs

## Backlog (P1/P2)
- Real Google Maps location picker
- Push / email delivery notifications (SendGrid/Twilio)
- Payment gateway (Stripe)
- OTP verification on delivery
- Live driver tracking (WebSocket)
- Fuel inventory tracking
