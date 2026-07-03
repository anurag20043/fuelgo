import React from "react";
import { Fuel, Truck, Zap, ShieldCheck, ChevronRight } from "lucide-react";
import { useAuth } from "@/context/AuthProvider";
import { Navigate } from "react-router-dom";

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
function loginWithGoogle() {
  const redirectUrl = window.location.origin + "/dashboard";
  window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
}

const HERO_IMG =
  "https://images.unsplash.com/photo-1656988826404-bbb5ccb779bc?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMzN8MHwxfHNlYXJjaHwyfHxpbmR1c3RyaWFsJTIwZnVlbCUyMHRydWNrfGVufDB8fHx8MTc4MzA1MjQwMXww&ixlib=rb-4.1.0&q=85";

export default function Landing() {
  const { user, loading } = useAuth();
  if (!loading && user) {
    return <Navigate to={user.role === "admin" ? "/admin" : "/dashboard"} replace />;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white grain relative overflow-hidden">
      {/* grid lines */}
      <div className="absolute inset-0 grid-lines opacity-50 pointer-events-none" />

      {/* Nav */}
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
          onClick={loginWithGoogle}
          data-testid="nav-signin-btn"
          className="btn-ghost px-4 py-2 text-xs"
        >
          SIGN IN <ChevronRight className="w-4 h-4" />
        </button>
      </header>

      {/* Hero */}
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

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <button
              onClick={loginWithGoogle}
              data-testid="hero-google-signin-btn"
              className="btn-primary px-6 py-3 text-sm"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#000" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#000" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.99.66-2.25 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/>
                <path fill="#000" d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84z"/>
                <path fill="#000" d="M12 5.38c1.62 0 3.06.56 4.2 1.64l3.15-3.15C17.45 2.14 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.05l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/>
              </svg>
              CONTINUE WITH GOOGLE
            </button>
            <div className="font-mono-num text-xs uppercase text-zinc-500 tracking-widest">
              · No download required
            </div>
          </div>

          {/* Feature strip */}
          <div className="mt-14 grid grid-cols-3 gap-4">
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

        {/* Right: hero image + gauge */}
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

          {/* Floating stat */}
          <div className="absolute -left-6 top-8 hidden md:block card-industrial p-4 w-52">
            <div className="font-mono-num text-[10px] uppercase tracking-widest text-zinc-500">Today · Litres delivered</div>
            <div className="font-mono-num text-4xl font-bold text-yellow-400 mt-1">14,320</div>
            <div className="h-1 bg-zinc-900 mt-3">
              <div className="h-full bg-yellow-400 w-4/5" />
            </div>
          </div>
        </div>
      </section>

      {/* Bottom band */}
      <section className="relative z-10 border-t border-zinc-800 bg-[#0d0d0f]">
        <div className="max-w-7xl mx-auto px-6 py-10 grid md:grid-cols-4 gap-6">
          {[
            ["01", "Sign in", "Continue with Google — no forms."],
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

      <footer className="relative z-10 border-t border-zinc-800">
        <div className="max-w-7xl mx-auto px-6 py-6 flex justify-between items-center">
          <div className="font-mono-num text-[10px] uppercase tracking-widest text-zinc-500">
            © {new Date().getFullYear()} FUEL/OPS · Industrial Delivery Grid
          </div>
          <div className="font-mono-num text-[10px] uppercase tracking-widest text-zinc-500">
            v1.0.0
          </div>
        </div>
      </footer>
    </div>
  );
}
