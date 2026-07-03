import React, { useState, useMemo, useEffect } from "react";
import { api, FUEL_LABELS } from "@/lib/api";
import { Fuel, MapPin, Loader2, Droplet } from "lucide-react";
import { toast } from "sonner";

export default function BookingForm({ prices, onCreated }) {
  const [fuelType, setFuelType] = useState("petrol");
  const [quantity, setQuantity] = useState(20);
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const unit = prices?.[fuelType] || 0;
  const total = useMemo(() => (unit * Number(quantity || 0)).toFixed(2), [unit, quantity]);

  useEffect(() => {
    if (quantity < 1) setQuantity(1);
    if (quantity > 1000) setQuantity(1000);
  }, [quantity]);

  const useMyLocation = () => {
    if (!navigator.geolocation) return toast.error("Geolocation not supported");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLng(pos.coords.longitude.toFixed(6));
        toast.success("Location captured");
      },
      () => toast.error("Could not fetch location")
    );
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!address.trim()) return toast.error("Please add a delivery address");
    setSubmitting(true);
    try {
      const { data } = await api.post("/bookings", {
        fuel_type: fuelType,
        quantity_l: Number(quantity),
        address: address.trim(),
        lat: lat ? Number(lat) : null,
        lng: lng ? Number(lng) : null,
        notes: notes.trim() || null,
      });
      toast.success(
        data.driver_id
          ? `Booking confirmed. Driver: ${data.driver_name}`
          : "Booking placed. Awaiting driver assignment."
      );
      setAddress("");
      setNotes("");
      onCreated?.(data);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Booking failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="card-industrial p-6 md:p-8 space-y-6" data-testid="booking-form">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-mono-num text-[10px] uppercase tracking-widest text-yellow-400">// New Order</div>
          <h2 className="font-display text-3xl font-black uppercase mt-1">Dispatch a tanker</h2>
        </div>
        <Fuel className="w-10 h-10 text-yellow-400 hidden md:block" />
      </div>

      {/* Fuel type toggle */}
      <div className="grid grid-cols-2 gap-3">
        {["petrol", "diesel"].map((f) => {
          const active = fuelType === f;
          return (
            <button
              type="button"
              key={f}
              data-testid={`fuel-${f}-btn`}
              onClick={() => setFuelType(f)}
              className={`flex items-center justify-between p-4 border transition-all ${active ? "bg-yellow-400 text-black border-yellow-400" : "bg-transparent text-zinc-300 border-zinc-800 hover:border-zinc-600"}`}
            >
              <div className="flex items-center gap-3">
                <Droplet className={`w-5 h-5 ${active ? "text-black" : "text-yellow-400"}`} />
                <div className="text-left">
                  <div className="font-display uppercase font-bold text-lg leading-none">{FUEL_LABELS[f]}</div>
                  <div className={`font-mono-num text-[11px] tracking-widest uppercase ${active ? "text-black/70" : "text-zinc-500"}`}>
                    ₹{prices?.[f]?.toFixed(2) || "--"}/L
                  </div>
                </div>
              </div>
              {active && <span className="font-mono-num text-xs uppercase">Selected</span>}
            </button>
          );
        })}
      </div>

      {/* Quantity */}
      <div>
        <label className="block font-mono-num text-[10px] uppercase tracking-widest text-zinc-500 mb-2">
          Quantity · Litres
        </label>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={1}
            max={200}
            step={1}
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            className="flex-1 accent-yellow-400"
            data-testid="quantity-slider"
          />
          <input
            type="number"
            min={1}
            max={1000}
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            className="input-industrial w-24 text-center text-lg"
            data-testid="quantity-input"
          />
          <span className="font-mono-num text-zinc-500 uppercase text-xs">L</span>
        </div>
      </div>

      {/* Address + geo */}
      <div className="space-y-3">
        <label className="block font-mono-num text-[10px] uppercase tracking-widest text-zinc-500">
          Delivery Address
        </label>
        <textarea
          rows={2}
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="input-industrial resize-none"
          placeholder="Flat / Building / Street / City"
          data-testid="address-input"
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            className="input-industrial"
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            placeholder="Latitude"
            data-testid="lat-input"
          />
          <input
            className="input-industrial"
            value={lng}
            onChange={(e) => setLng(e.target.value)}
            placeholder="Longitude"
            data-testid="lng-input"
          />
          <button
            type="button"
            onClick={useMyLocation}
            className="btn-ghost px-3 py-2 text-xs"
            data-testid="use-location-btn"
          >
            <MapPin className="w-4 h-4" /> USE MY LOCATION
          </button>
        </div>
      </div>

      <div>
        <label className="block font-mono-num text-[10px] uppercase tracking-widest text-zinc-500 mb-2">
          Notes (optional)
        </label>
        <input
          className="input-industrial"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Gate code, landmark, timing..."
          data-testid="notes-input"
        />
      </div>

      {/* Total gauge */}
      <div className="border border-zinc-800 bg-[#0a0a0a] p-5 flex items-center justify-between">
        <div>
          <div className="font-mono-num text-[10px] uppercase tracking-widest text-zinc-500">Total payable</div>
          <div className="font-mono-num text-4xl md:text-5xl font-bold text-yellow-400 mt-1" data-testid="total-price">
            ₹{Number(total).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <div className="font-mono-num text-[11px] uppercase tracking-widest text-zinc-500 mt-1">
            {quantity} L × ₹{unit?.toFixed(2)} / L
          </div>
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="btn-primary px-6 py-4 text-sm disabled:opacity-60"
          data-testid="submit-booking-btn"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Fuel className="w-4 h-4" />}
          {submitting ? "DISPATCHING…" : "BOOK NOW"}
        </button>
      </div>
    </form>
  );
}
