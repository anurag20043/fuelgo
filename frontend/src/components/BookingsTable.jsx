import React from "react";
import StatusBadge from "@/components/StatusBadge";
import { FUEL_LABELS, STATUS_LABELS } from "@/lib/api";
import { Fuel, MapPin, User } from "lucide-react";

export default function BookingsTable({ bookings, showCustomer = false, actions }) {
  if (!bookings?.length) {
    return (
      <div className="card-industrial p-10 text-center" data-testid="bookings-empty">
        <Fuel className="w-8 h-8 mx-auto text-zinc-600" />
        <div className="mt-3 font-display uppercase text-xl text-zinc-400">No bookings yet</div>
        <div className="font-mono-num text-[11px] uppercase tracking-widest text-zinc-600 mt-1">
          Bookings will appear here once placed.
        </div>
      </div>
    );
  }

  return (
    <div className="card-industrial overflow-hidden" data-testid="bookings-table">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#1a1a1d] text-zinc-400 font-mono-num text-[10px] uppercase tracking-widest">
              <th className="py-3 px-4 border-b border-zinc-800">Order</th>
              {showCustomer && <th className="py-3 px-4 border-b border-zinc-800">Customer</th>}
              <th className="py-3 px-4 border-b border-zinc-800">Fuel</th>
              <th className="py-3 px-4 border-b border-zinc-800 text-right">Qty</th>
              <th className="py-3 px-4 border-b border-zinc-800 text-right">Total</th>
              <th className="py-3 px-4 border-b border-zinc-800">Address</th>
              <th className="py-3 px-4 border-b border-zinc-800">Driver</th>
              <th className="py-3 px-4 border-b border-zinc-800">Status</th>
              {actions && <th className="py-3 px-4 border-b border-zinc-800">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b.id} className="border-b border-zinc-900 hover:bg-[#141416] transition-colors" data-testid={`booking-row-${b.id}`}>
                <td className="py-3 px-4 font-mono-num text-xs">
                  <div className="text-yellow-400">{b.id.slice(4, 12).toUpperCase()}</div>
                  <div className="text-zinc-500 text-[10px]">{new Date(b.created_at).toLocaleString()}</div>
                </td>
                {showCustomer && (
                  <td className="py-3 px-4 text-sm">
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-zinc-500" />
                      <div>
                        <div className="text-zinc-200">{b.user_name}</div>
                        <div className="text-[10px] font-mono-num text-zinc-500">{b.user_email}</div>
                      </div>
                    </div>
                  </td>
                )}
                <td className="py-3 px-4 font-display uppercase text-sm font-bold text-zinc-200">
                  {FUEL_LABELS[b.fuel_type]}
                </td>
                <td className="py-3 px-4 font-mono-num text-right text-zinc-200">{b.quantity_l} L</td>
                <td className="py-3 px-4 font-mono-num text-right text-yellow-400 font-bold">
                  ₹{b.total_price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </td>
                <td className="py-3 px-4 text-sm text-zinc-300 max-w-[220px]">
                  <div className="flex items-start gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-zinc-500 shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{b.address}</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-sm">
                  {b.driver_name ? (
                    <>
                      <div className="text-zinc-200">{b.driver_name}</div>
                      <div className="text-[10px] font-mono-num text-zinc-500">{b.driver_phone}</div>
                    </>
                  ) : (
                    <span className="text-zinc-600 font-mono-num text-xs">—</span>
                  )}
                </td>
                <td className="py-3 px-4">
                  <StatusBadge status={b.status} />
                </td>
                {actions && <td className="py-3 px-4">{actions(b)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export { STATUS_LABELS };
