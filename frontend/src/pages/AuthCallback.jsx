import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthProvider";
import { Fuel } from "lucide-react";

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH

export default function AuthCallback() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const hash = window.location.hash || "";
    const params = new URLSearchParams(hash.replace(/^#/, ""));
    const sessionId = params.get("session_id");

    (async () => {
      if (!sessionId) {
        navigate("/", { replace: true });
        return;
      }
      let intent = "customer";
      try {
        intent = sessionStorage.getItem("fuel_intent") || "customer";
        sessionStorage.removeItem("fuel_intent");
      } catch {
        /* noop */
      }
      try {
        const { data } = await api.post("/auth/callback", { session_id: sessionId, intent });
        setUser(data);
        // Clean the URL fragment
        window.history.replaceState(null, "", window.location.pathname);
        const dest = data.role === "admin" ? "/admin" : "/dashboard";
        navigate(dest, { replace: true, state: { user: data } });
      } catch (e) {
        console.error("Auth exchange failed", e);
        navigate("/", { replace: true });
      }
    })();
  }, [navigate, setUser]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">
      <div className="flex flex-col items-center gap-4" data-testid="auth-callback">
        <Fuel className="w-10 h-10 text-yellow-400 animate-pulse" />
        <p className="font-display text-2xl tracking-wide uppercase">Fueling your session…</p>
        <div className="w-40 h-1 bg-zinc-800 overflow-hidden">
          <div className="h-full w-1/3 bg-yellow-400 animate-[loading_1.2s_linear_infinite]" />
        </div>
      </div>
      <style>{`@keyframes loading{0%{transform:translateX(-100%)}100%{transform:translateX(400%)}}`}</style>
    </div>
  );
}
