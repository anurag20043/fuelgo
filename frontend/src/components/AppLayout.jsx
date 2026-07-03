import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";
import { Fuel, LogOut, LayoutDashboard, Shield } from "lucide-react";

export default function AppLayout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const NavItem = ({ to, icon: Icon, label, testId }) => {
    const active = location.pathname === to;
    return (
      <button
        data-testid={testId}
        onClick={() => navigate(to)}
        className={`btn-industrial px-3 py-2 text-xs ${active ? "bg-yellow-400 text-black border-yellow-400" : "border-transparent text-zinc-400 hover:text-yellow-400"}`}
      >
        <Icon className="w-4 h-4" /> {label}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white grain relative">
      <header className="sticky top-0 z-30 border-b border-zinc-800 bg-[#0a0a0a]/90 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <Link to={user?.role === "admin" ? "/admin" : "/dashboard"} className="flex items-center gap-2" data-testid="nav-logo">
            <div className="w-9 h-9 bg-yellow-400 flex items-center justify-center led">
              <Fuel className="w-5 h-5 text-black" />
            </div>
            <div className="font-display text-xl font-black uppercase tracking-tight leading-none">
              FUEL<span className="text-yellow-400">/</span>OPS
              <div className="text-[9px] text-zinc-500 font-mono-num tracking-widest -mt-0.5">DELIVERY GRID · 24×7</div>
            </div>
          </Link>

          <nav className="flex items-center gap-1">
            {user?.role === "customer" && (
              <NavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" testId="nav-dashboard" />
            )}
            {user?.role === "admin" && (
              <NavItem to="/admin" icon={Shield} label="Control Room" testId="nav-admin" />
            )}
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex flex-col items-end">
              <span className="text-xs font-mono-num text-zinc-400 uppercase tracking-widest">{user?.role}</span>
              <span className="text-sm font-medium truncate max-w-[160px]" data-testid="nav-user-name">{user?.name}</span>
            </div>
            {user?.picture && (
              <img src={user.picture} alt="" className="w-9 h-9 border border-zinc-700" />
            )}
            <button
              onClick={logout}
              data-testid="logout-btn"
              className="btn-ghost px-3 py-2 text-xs"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden md:inline">SIGN OUT</span>
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-4 md:px-8 py-8">{children}</main>
    </div>
  );
}
