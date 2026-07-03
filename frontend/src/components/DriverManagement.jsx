import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Truck, Trash2, Loader2, Plus, Power } from "lucide-react";
import { toast } from "sonner";

const STATUS_STYLES = {
  available: "bg-emerald-950/40 text-emerald-300 border-emerald-800/70",
  busy: "bg-amber-950/40 text-amber-300 border-amber-800/70",
  offline: "bg-zinc-800/60 text-zinc-400 border-zinc-700",
};

export default function DriverManagement() {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", phone: "", vehicle: "" });
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/drivers");
      setDrivers(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const create = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim() || !form.vehicle.trim()) {
      return toast.error("All fields are required");
    }
    setCreating(true);
    try {
      await api.post("/drivers", form);
      toast.success("Driver added");
      setForm({ name: "", phone: "", vehicle: "" });
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to add driver");
    } finally {
      setCreating(false);
    }
  };

  const toggleStatus = async (d) => {
    const next = d.status === "available" ? "offline" : "available";
    try {
      await api.patch(`/drivers/${d.id}`, { status: next });
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Update failed");
    }
  };

  const remove = async (d) => {
    if (!window.confirm(`Delete driver ${d.name}?`)) return;
    try {
      await api.delete(`/drivers/${d.id}`);
      toast.success("Driver removed");
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Delete failed");
    }
  };

  return (
    <div className="card-industrial p-6 md:p-8" data-testid="driver-management">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="font-mono-num text-[10px] uppercase tracking-widest text-yellow-400">// Fleet</div>
          <h3 className="font-display text-3xl font-black uppercase mt-1">Driver management</h3>
        </div>
        <Truck className="w-10 h-10 text-yellow-400 hidden md:block" />
      </div>

      <form onSubmit={create} className="grid md:grid-cols-4 gap-3 mb-8">
        <input
          className="input-industrial"
          placeholder="Driver name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          data-testid="driver-name-input"
        />
        <input
          className="input-industrial"
          placeholder="Phone"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          data-testid="driver-phone-input"
        />
        <input
          className="input-industrial"
          placeholder="Vehicle (e.g. MH-01-AB-1234)"
          value={form.vehicle}
          onChange={(e) => setForm({ ...form, vehicle: e.target.value })}
          data-testid="driver-vehicle-input"
        />
        <button
          type="submit"
          disabled={creating}
          className="btn-primary px-4 py-2 text-xs disabled:opacity-60"
          data-testid="add-driver-btn"
        >
          {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          ADD DRIVER
        </button>
      </form>

      {loading ? (
        <div className="p-8 text-center font-mono-num text-xs uppercase tracking-widest text-zinc-500">Loading…</div>
      ) : drivers.length === 0 ? (
        <div className="p-8 text-center border border-dashed border-zinc-800" data-testid="drivers-empty">
          <Truck className="w-8 h-8 mx-auto text-zinc-600" />
          <div className="mt-3 font-display uppercase text-xl text-zinc-400">No drivers on the grid</div>
          <div className="font-mono-num text-[11px] uppercase tracking-widest text-zinc-600 mt-1">Add your first driver above.</div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#1a1a1d] text-zinc-400 font-mono-num text-[10px] uppercase tracking-widest">
                <th className="py-3 px-4 border-b border-zinc-800">Driver</th>
                <th className="py-3 px-4 border-b border-zinc-800">Phone</th>
                <th className="py-3 px-4 border-b border-zinc-800">Vehicle</th>
                <th className="py-3 px-4 border-b border-zinc-800">Status</th>
                <th className="py-3 px-4 border-b border-zinc-800 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {drivers.map((d) => (
                <tr key={d.id} className="border-b border-zinc-900 hover:bg-[#141416]" data-testid={`driver-row-${d.id}`}>
                  <td className="py-3 px-4 text-sm">
                    <div className="text-zinc-100 font-medium">{d.name}</div>
                    <div className="font-mono-num text-[10px] text-zinc-500 uppercase">{d.id.slice(4, 12)}</div>
                  </td>
                  <td className="py-3 px-4 font-mono-num text-sm text-zinc-300">{d.phone}</td>
                  <td className="py-3 px-4 font-mono-num text-sm text-zinc-300">{d.vehicle}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center gap-1.5 font-mono-num text-[10px] uppercase tracking-widest px-2 py-1 border ${STATUS_STYLES[d.status]}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${d.status === "available" ? "bg-emerald-400" : d.status === "busy" ? "bg-amber-400 animate-pulse" : "bg-zinc-500"}`} />
                      {d.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex justify-end gap-2">
                      {d.status !== "busy" && (
                        <button
                          onClick={() => toggleStatus(d)}
                          className="btn-ghost px-2 py-1 text-[10px]"
                          data-testid={`toggle-driver-${d.id}`}
                          title="Toggle availability"
                        >
                          <Power className="w-3.5 h-3.5" />
                          {d.status === "available" ? "OFFLINE" : "ONLINE"}
                        </button>
                      )}
                      <button
                        onClick={() => remove(d)}
                        className="btn-ghost px-2 py-1 text-[10px] hover:border-red-500 hover:text-red-400"
                        data-testid={`delete-driver-${d.id}`}
                        title="Remove"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> DELETE
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
