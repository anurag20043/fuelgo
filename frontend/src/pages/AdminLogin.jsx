import React from "react";
import { Shield, ChevronRight, AlertTriangle, Lock } from "lucide-react";
import { useAuth } from "@/context/AuthProvider";
import { Navigate, useLocation, Link } from "react-router-dom";
import { Toaster } from "sonner";

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
function loginAsAdmin() {
  try {
    sessionStorage.setItem("fuel_intent", "admin");
  } catch {
    /* noop */
  }
  const redirectUrl = window.location.origin + "/admin";
  window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
}

const BG_IMG =
  "https://images.unsplash.com/photo-1580561346873-4a76a13dce92?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1MDV8MHwxfHNlYXJjaHwyfHxvaWwlMjByZWZpbmVyeSUyMG5pZ2h0fGVufDB8fHx8MTc4MzA1MjQwMHww&ixlib=rb-4.1.0&q=85";

export default function AdminLogin() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const authError = location.state?.authError;
  const adminDenied = location.state?.adminDenied;

  if (!loading && user) {
    if (user.role === "admin") {
      return <Navigate to="/admin" replace />;
    }
    // Signed-in customer landing here — bounce them to their dashboard
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white grain relative overflow-hidden flex flex-col">
      <img
        src={BG_IMG}
        alt=""
        aria-hidden
        className="absolute inset-0 w-full h-full object-cover opacity-15 pointer-events-none"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a]/60 via-[#0a0a0a] to-[#0a0a0a]" />
      <div className="absolute inset-0 grid-lines opacity-40 pointer-events-none" />

      <header className="relative z-10 max-w-7xl w-full mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-yellow-400 flex items-center justify-center led">
            <Shield className="w-5 h-5 text-black" />
          </div>
          <div className="font-display font-black text-xl uppercase tracking-tight leading-none">
            FUEL<span className="text-yellow-400">/</span>OPS
            <div className="text-[9px] text-yellow-400 font-mono-num tracking-widest -mt-0.5">
              CONTROL ROOM · RESTRICTED
            </div>
          </div>
        </div>
        <Link
          to="/"
          data-testid="admin-back-to-customer-link"
          className="btn-ghost px-3 py-2 text-xs"
        >
          ← CUSTOMER SITE
        </Link>
      </header>

      <main className="relative z-10 flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-md card-industrial p-8 md:p-10">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-5 mb-6">
            <div>
              <div className="font-mono-num text-[10px] uppercase tracking-widest text-yellow-400">
                // Restricted portal
              </div>
              <h1 className="font-display uppercase text-3xl font-black mt-1 tracking-tight">
                Administrator
              </h1>
            </div>
            <div className="w-12 h-12 border border-yellow-400/40 bg-yellow-400/5 flex items-center justify-center">
              <Lock className="w-5 h-5 text-yellow-400" />
            </div>
          </div>

          {(authError || adminDenied) && (
            <div
              data-testid="admin-auth-error-banner"
              className={`mb-6 flex items-start gap-3 border p-3 ${adminDenied ? "border-red-800/70 bg-red-950/30 text-red-300" : "border-zinc-800 bg-[#0a0a0a] text-zinc-300"}`}
            >
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <div className="font-display uppercase text-sm font-bold">
                  {adminDenied ? "Access denied" : "Sign-in failed"}
                </div>
                <div className="font-mono-num text-[11px] uppercase tracking-widest mt-1 opacity-80">
                  {authError || "This portal is restricted to the designated administrator."}
                </div>
              </div>
            </div>
          )}

          <p className="text-sm text-zinc-400 leading-relaxed">
            This is the operations control room. Only the designated administrator can sign in here — customers should use the
            {" "}<Link to="/" className="text-yellow-400 hover:underline">main site</Link>.
          </p>

          <button
            onClick={loginAsAdmin}
            data-testid="admin-google-signin-btn"
            className="btn-primary w-full px-4 py-3 mt-6 text-sm"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#000" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#000" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.99.66-2.25 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/>
              <path fill="#000" d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84z"/>
              <path fill="#000" d="M12 5.38c1.62 0 3.06.56 4.2 1.64l3.15-3.15C17.45 2.14 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.05l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/>
            </svg>
            CONTINUE WITH GOOGLE
            <ChevronRight className="w-4 h-4" />
          </button>

          <div className="mt-6 pt-4 border-t border-zinc-800 font-mono-num text-[10px] uppercase tracking-widest text-zinc-500 space-y-1">
            <div>· Google sign-in only</div>
            <div>· Session · 7 days · httpOnly cookie</div>
            <div>· Attempts are logged</div>
          </div>
        </div>
      </main>

      <footer className="relative z-10 border-t border-zinc-800">
        <div className="max-w-7xl mx-auto px-6 py-4 font-mono-num text-[10px] uppercase tracking-widest text-zinc-600 text-center">
          © {new Date().getFullYear()} FUEL/OPS · Control Room
        </div>
      </footer>

      <Toaster theme="dark" position="top-right" />
    </div>
  );
}
