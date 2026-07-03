import React, { useEffect, useState, useCallback } from "react";
import AppLayout from "@/components/AppLayout";
import DriverManagement from "@/components/DriverManagement";
import BookingsTable from "@/components/BookingsTable";
import { api, STATUS_LABELS, FUEL_LABELS } from "@/lib/api";
import { Toaster, toast } from "sonner";
import { Fuel, Truck, IndianRupee, Package, CircleDot } from "lucide-react";

const NEXT_STATUS = {
  pending: "assigned",
  assigned: "en_route",
  en_route: "delivered",
};

export default function AdminPanel() {
  const [stats, setStats] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [fuelFilter, setFuelFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    const params = {};
    if (statusFilter !== "all") params.status = statusFilter;
    if (fuelFilter !== "all") params.fuel_type = fuelFilter;
    const [{ data: s }, { data: b }] = await Promise.all([
      api.get("/admin/stats"),
      api.get("/admin/bookings", { params }),
    ]);
    setStats(s);
    setBookings(b);
  }, [statusFilter, fuelFilter]);

  useEffect(() => {
    setLoading(true);
    fetchAll().finally(() => setLoading(false));
  }, [fetchAll]);

  const advance = async (b) => {
    const next = NEXT_STATUS[b.status];
    if (!next) return;
    try {
      await api.patch(`/bookings/${b.id}/status`, { status: next });
      toast.success(`Order ${b.id.slice(4, 12).toUpperCase()} → ${STATUS_LABELS[next]}`);
      fetchAll();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Update failed");
    }
  };

  const cancel = async (b) => {
    if (!window.confirm("Cancel this booking?")) return;
    try {
      await api.patch(`/bookings/${b.id}/status`, { status: "cancelled" });
      toast.success("Booking cancelled");
      fetchAll();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Update failed");
    }
  };

  return (
    <AppLayout>
      <Toaster theme="dark" position="top-right" />

      {/* KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10" data-testid="admin-kpis">
        <Kpi icon={Package} label="Total orders" value={stats?.total_bookings ?? "-"} accent />
        <Kpi icon={CircleDot} label="Active" value={stats?.active ?? "-"} />
        <Kpi icon={IndianRupee} label="Revenue (Delivered)" value={stats ? `₹${Number(stats.revenue).toLocaleString("en-IN")}` : "-"} />
        <Kpi icon={Truck} label="Drivers avail." value={stats ? `${stats.drivers_available} / ${stats.drivers_total}` : "-"} />
      </div>

      <DriverManagement />

      <section className="mt-14">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
          <div>
            <div className="font-mono-num text-[10px] uppercase tracking-widest text-yellow-400">// Ops</div>
            <h3 className="font-display text-3xl font-black uppercase mt-1">All bookings</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <FilterGroup label="Status" value={statusFilter} onChange={setStatusFilter} options={[["all", "All"], ...Object.entries(STATUS_LABELS)]} testIdPrefix="admin-filter-status" />
            <FilterGroup label="Fuel" value={fuelFilter} onChange={setFuelFilter} options={[["all", "All"], ...Object.entries(FUEL_LABELS)]} testIdPrefix="admin-filter-fuel" />
          </div>
        </div>

        {loading ? (
          <div className="card-industrial p-10 text-center font-mono-num text-xs uppercase tracking-widest text-zinc-500">Loading…</div>
        ) : (
          <BookingsTable
            bookings={bookings}
            showCustomer
            actions={(b) => (
              <div className="flex justify-end gap-2">
                {NEXT_STATUS[b.status] && (
                  <button
                    onClick={() => advance(b)}
                    className="btn-primary px-2 py-1 text-[10px]"
                    data-testid={`advance-booking-${b.id}`}
                  >
                    → {STATUS_LABELS[NEXT_STATUS[b.status]]}
                  </button>
                )}
                {["pending", "assigned"].includes(b.status) && (
                  <button
                    onClick={() => cancel(b)}
                    className="btn-ghost px-2 py-1 text-[10px] hover:border-red-500 hover:text-red-400"
                    data-testid={`cancel-booking-${b.id}`}
                  >
                    CANCEL
                  </button>
                )}
              </div>
            )}
          />
        )}
      </section>
    </AppLayout>
  );
}

function Kpi({ icon: Icon, label, value, accent }) {
  return (
    <div className={`card-industrial p-5 ${accent ? "border-yellow-400/40" : ""}`} data-testid={`kpi-${label.toLowerCase().replace(/\s|\./g, "-")}`}>
      <div className="flex items-center justify-between">
        <div className="font-mono-num text-[10px] uppercase tracking-widest text-zinc-500">{label}</div>
        <Icon className={`w-4 h-4 ${accent ? "text-yellow-400" : "text-zinc-500"}`} />
      </div>
      <div className={`font-mono-num text-3xl font-bold mt-3 ${accent ? "text-yellow-400" : "text-white"}`}>{value}</div>
    </div>
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
            className={`px-3 py-1.5 font-mono-num text-[10px] uppercase tracking-widest border-r border-zinc-800 last:border-r-0 ${value === k ? "bg-yellow-400 text-black" : "bg-transparent text-zinc-400 hover:text-yellow-400"}`}
          >
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}
