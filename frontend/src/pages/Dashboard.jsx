import React, { useEffect, useState, useCallback } from "react";
import AppLayout from "@/components/AppLayout";
import BookingForm from "@/components/BookingForm";
import BookingsTable from "@/components/BookingsTable";
import { api, STATUS_LABELS, FUEL_LABELS } from "@/lib/api";
import { Toaster } from "sonner";

export default function Dashboard() {
  const [prices, setPrices] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [fuelFilter, setFuelFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  const fetchBookings = useCallback(async () => {
    const params = {};
    if (statusFilter !== "all") params.status = statusFilter;
    if (fuelFilter !== "all") params.fuel_type = fuelFilter;
    const { data } = await api.get("/bookings", { params });
    setBookings(data);
  }, [statusFilter, fuelFilter]);

  useEffect(() => {
    (async () => {
      const { data } = await api.get("/prices");
      setPrices(data.prices);
    })();
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchBookings().finally(() => setLoading(false));
  }, [fetchBookings]);

  return (
    <AppLayout>
      <Toaster theme="dark" position="top-right" />

      <div className="grid lg:grid-cols-5 gap-8">
        <div className="lg:col-span-3">
          <BookingForm prices={prices} onCreated={fetchBookings} />
        </div>

        <aside className="lg:col-span-2 space-y-4">
          <div className="card-industrial p-6">
            <div className="font-mono-num text-[10px] uppercase tracking-widest text-yellow-400">// Live Rates</div>
            <div className="mt-4 space-y-3">
              {prices &&
                Object.entries(prices).map(([k, v]) => (
                  <div key={k} className="flex items-end justify-between border-b border-zinc-800 pb-3">
                    <div>
                      <div className="font-display uppercase text-lg font-bold">{FUEL_LABELS[k]}</div>
                      <div className="font-mono-num text-[10px] uppercase tracking-widest text-zinc-500">per litre</div>
                    </div>
                    <div className="font-mono-num text-2xl font-bold text-yellow-400">₹{v.toFixed(2)}</div>
                  </div>
                ))}
            </div>
          </div>

          <div className="card-industrial p-6">
            <div className="font-mono-num text-[10px] uppercase tracking-widest text-yellow-400">// How it works</div>
            <ol className="mt-4 space-y-3 text-sm text-zinc-300">
              <li className="flex gap-3"><span className="font-mono-num text-yellow-400">01</span> Pick fuel & quantity</li>
              <li className="flex gap-3"><span className="font-mono-num text-yellow-400">02</span> Drop location + notes</li>
              <li className="flex gap-3"><span className="font-mono-num text-yellow-400">03</span> Auto-assign the nearest tanker</li>
              <li className="flex gap-3"><span className="font-mono-num text-yellow-400">04</span> Track status till delivery</li>
            </ol>
          </div>
        </aside>
      </div>

      {/* Bookings history */}
      <section className="mt-14">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
          <div>
            <div className="font-mono-num text-[10px] uppercase tracking-widest text-yellow-400">// My Orders</div>
            <h3 className="font-display text-3xl font-black uppercase mt-1">Booking history</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <FilterGroup label="Status" value={statusFilter} onChange={setStatusFilter} options={[["all", "All"], ...Object.entries(STATUS_LABELS)]} testIdPrefix="filter-status" />
            <FilterGroup label="Fuel" value={fuelFilter} onChange={setFuelFilter} options={[["all", "All"], ...Object.entries(FUEL_LABELS)]} testIdPrefix="filter-fuel" />
          </div>
        </div>

        {loading ? (
          <div className="card-industrial p-10 text-center font-mono-num text-xs uppercase tracking-widest text-zinc-500">
            Loading…
          </div>
        ) : (
          <BookingsTable bookings={bookings} />
        )}
      </section>
    </AppLayout>
  );
}

function FilterGroup({ label, value, onChange, options, testIdPrefix }) {
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono-num text-[10px] uppercase tracking-widest text-zinc-500">{label}:</span>
      <div className="flex border border-zinc-800">
        {options.map(([k, l]) => (
          <button
            key={k}
            data-testid={`${testIdPrefix}-${k}`}
            onClick={() => onChange(k)}
            className={`px-3 py-1.5 font-mono-num text-[10px] uppercase tracking-widest border-r border-zinc-800 last:border-r-0 transition-colors ${value === k ? "bg-yellow-400 text-black" : "bg-transparent text-zinc-400 hover:text-yellow-400"}`}
          >
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}
