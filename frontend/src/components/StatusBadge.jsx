import React from "react";
import { STATUS_LABELS } from "@/lib/api";

const STYLES = {
  pending: "bg-zinc-800/60 text-zinc-300 border-zinc-700",
  assigned: "bg-blue-950/40 text-blue-300 border-blue-800/70",
  en_route: "bg-amber-950/40 text-amber-300 border-amber-800/70",
  delivered: "bg-emerald-950/40 text-emerald-300 border-emerald-800/70",
  cancelled: "bg-red-950/40 text-red-300 border-red-800/70",
};

export default function StatusBadge({ status }) {
  return (
    <span
      data-testid={`status-badge-${status}`}
      className={`inline-flex items-center gap-1.5 font-mono-num text-[11px] uppercase tracking-widest px-2 py-1 border rounded-none ${STYLES[status] || STYLES.pending}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${status === "en_route" ? "bg-amber-400 animate-pulse" : status === "delivered" ? "bg-emerald-400" : status === "cancelled" ? "bg-red-400" : status === "assigned" ? "bg-blue-400" : "bg-zinc-400"}`} />
      {STATUS_LABELS[status] || status}
    </span>
  );
}
