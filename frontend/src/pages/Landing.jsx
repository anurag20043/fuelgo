import React, { useState } from "react";
import { Fuel, Truck, Zap, ShieldCheck, ChevronRight, UserRound, AlertTriangle, Droplet, Clock } from "lucide-react";
import { useAuth } from "@/context/AuthProvider";
import { Navigate, useLocation } from "react-router-dom";
import CustomerAuthDialog from "@/components/CustomerAuthDialog";
import { Toaster } from "sonner";

const HERO_IMG =
  "https://images.unsplash.com/photo-1656988826404-bbb5ccb779bc?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMzN8MHwxfHNlYXJjaHwyfHxpbmR1c3RyaWFsJTIwZnVlbCUyMHRydWNrfGVufDB8fHx8MTc4MzA1MjQwMXww&ixlib=rb-4.1.0&q=85";

export default function Landing() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const authError = location.state?.authError;
  const [customerAuthOpen, setCustomerAuthOpen] = useState(false);

  if (!loading && user) {
    return <Navigate to={user.role === "admin" ? "/admin" : "/dashboard"} replace />;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white grain relative overflow-hidden">
      <div className="absolute inset-0 grid-lines opacity-50 pointer-events-none" />

      <header className="relative z-20 max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-yellow-400 flex items-center justify-center led">
            <Fuel className="w-5 h-5 text-black" />
          </div>
          <div className="font-display font-black text-xl uppercase tracking-tight leading-none">
            FUEL<span className="text-yellow-400">/</span>OPS
            <div className="text-[9px] text-zinc-500 font-mono-num tracking-widest -mt-0.5">DELIVERY GRID · 24×7</div>
          </div>
        </div>
        <button
          onClick={() => setCustomerAuthOpen(true)}
          data-testid="nav-signin-customer-btn"
          className="btn-ghost px-4 py-2 text-xs"
        >
          <UserRound className="w-4 h-4" /> SIGN IN
        </button>
      </header>

      <section className="relative z-10 max-w-7xl mx-auto px-6 pt-6 pb-24 grid lg:grid-cols-12 gap-10">
        <div className="lg:col-span-7">
          <div className="inline-flex items-center gap-2 border border-zinc-800 bg-[#121214] px-3 py-1.5 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
            <span className="font-mono-num text-[10px] uppercase tracking-widest text-zinc-400">
              Live · Doorstep Diesel & Petrol
            </span>
          </div>
          <h1 className="font-display font-black uppercase leading-[0.92] tracking-tighter text-6xl sm:text-7xl lg:text-8xl">
            Fuel <span className="text-yellow-400">delivered.</span>
            <br />
            <span className="text-zinc-500">On</span> the second.
          </h1>
          <p className="mt-8 max-w-xl text-lg text-zinc-400 leading-relaxed">
            Book petrol or diesel to your doorstep. Our auto-dispatch engine
            reserves the nearest available tanker the moment your order lands.
          </p>

          {authError && (
            <div
              data-testid="auth-error-banner"
              className="mt-6 flex items-start gap-3 border border-zinc-800 bg-[#121214] p-3 max-w-xl text-zinc-300"
            >
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-yellow-400" />
              <div>
                <div className="font-display uppercase text-sm font-bold">Sign-in failed</div>
                <div className="font-mono-num text-[11px] uppercase tracking-widest mt-1 opacity-80">
                  {authError}
                </div>
              </div>
            </div>
          )}

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <button
              onClick={() => setCustomerAuthOpen(true)}
              data-testid="hero-signin-customer-btn"
              className="btn-primary px-6 py-3 text-sm"
            >
              <UserRound className="w-4 h-4" /> SIGN IN OR CREATE ACCOUNT
            </button>
            <div className="font-mono-num text-xs uppercase text-zinc-500 tracking-widest">
              · Password · OTP · Google
            </div>
          </div>

          <div className="mt-14 grid grid-cols-3 gap-4 max-w-2xl">
            {[
              { icon: Zap, label: "Auto Dispatch", sub: "< 60s" },
              { icon: Truck, label: "Fleet", sub: "24/7 tankers" },
              { icon: ShieldCheck, label: "Secure", sub: "OTP delivery" },
            ].map(({ icon: Icon, label, sub }) => (
              <div key={label} className="card-industrial p-4">
                <Icon className="w-5 h-5 text-yellow-400 mb-3" />
                <div className="font-display uppercase text-lg font-bold leading-none">{label}</div>
                <div className="font-mono-num text-[11px] uppercase tracking-widest text-zinc-500 mt-1">{sub}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-5 relative">
          <div className="relative border border-zinc-800 overflow-hidden">
            <img src={HERO_IMG} alt="Fuel truck" className="w-full h-[520px] object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/40 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-5 border-t border-zinc-800 bg-[#0a0a0a]/80 backdrop-blur">
              <div className="flex items-end justify-between">
                <div>
                  <div className="font-mono-num text-[10px] uppercase tracking-widest text-zinc-500">Tanker #A-014</div>
                  <div className="font-display text-2xl font-black uppercase text-yellow-400">STATUS · EN ROUTE</div>
                </div>
                <div className="text-right">
                  <div className="font-mono-num text-[10px] uppercase tracking-widest text-zinc-500">ETA</div>
                  <div className="font-mono-num text-3xl font-bold">08:42</div>
                </div>
              </div>
              <div className="mt-4 h-1.5 bg-zinc-900">
                <div className="h-full bg-yellow-400 w-2/3" />
              </div>
            </div>
          </div>

          <div className="absolute -left-6 top-8 hidden md:block card-industrial p-4 w-52">
            <div className="font-mono-num text-[10px] uppercase tracking-widest text-zinc-500">Today · Litres delivered</div>
            <div className="font-mono-num text-4xl font-bold text-yellow-400 mt-1">14,320</div>
            <div className="h-1 bg-zinc-900 mt-3">
              <div className="h-full bg-yellow-400 w-4/5" />
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 border-t border-zinc-800 bg-[#0d0d0f]">
        <div className="max-w-7xl mx-auto px-6 py-10 grid md:grid-cols-4 gap-6">
          {[
            ["01", "Sign in", "Password, OTP or Google — pick any."],
            ["02", "Order fuel", "Choose petrol/diesel, quantity & drop."],
            ["03", "Auto assign", "Nearest tanker locked instantly."],
            ["04", "Delivered", "Track status, pay on delivery."],
          ].map(([n, t, s]) => (
            <div key={n}>
              <div className="font-mono-num text-yellow-400 text-xs tracking-widest">{n}</div>
              <div className="font-display font-black text-2xl uppercase mt-1">{t}</div>
              <div className="text-zinc-400 text-sm mt-1">{s}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="relative z-10 border-t border-zinc-800">
        <div className="max-w-7xl mx-auto px-6 py-14 grid md:grid-cols-3 gap-6">
          <div className="card-industrial p-6">
            <Droplet className="w-6 h-6 text-yellow-400" />
            <h3 className="font-display uppercase text-2xl font-black mt-3">Two fuels, one tap</h3>
            <p className="text-sm text-zinc-400 mt-2">Petrol and diesel priced live per litre. Sliders make quantity effortless.</p>
          </div>
          <div className="card-industrial p-6">
            <Truck className="w-6 h-6 text-yellow-400" />
            <h3 className="font-display uppercase text-2xl font-black mt-3">Fleet-first dispatch</h3>
            <p className="text-sm text-zinc-400 mt-2">The first available tanker is locked to your order the instant you confirm.</p>
          </div>
          <div className="card-industrial p-6">
            <Clock className="w-6 h-6 text-yellow-400" />
            <h3 className="font-display uppercase text-2xl font-black mt-3">Track every second</h3>
            <p className="text-sm text-zinc-400 mt-2">Pending → Assigned → En Route → Delivered. Never guess where your fuel is.</p>
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-zinc-800">
        <div className="max-w-7xl mx-auto px-6 py-6 flex justify-between items-center">
          <div className="font-mono-num text-[10px] uppercase tracking-widest text-zinc-500">
            © {new Date().getFullYear()} FUEL/OPS · Industrial Delivery Grid
          </div>
          <div className="font-mono-num text-[10px] uppercase tracking-widest text-zinc-500">
            v2.0.0
          </div>
        </div>
      </footer>

      <CustomerAuthDialog open={customerAuthOpen} onOpenChange={setCustomerAuthOpen} />
      <Toaster theme="dark" position="top-right" />
    </div>
  );
}
